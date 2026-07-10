const db = require('../utils/db');

const DAILY = [
  { id: 'send_msgs', name: '💬 Mensajero',  desc: 'Envía 20 mensajes',    target: 20, reward: 500,  type: 'messages' },
  { id: 'use_cmds',  name: '⚡ Activo',     desc: 'Usa 5 comandos',       target: 5,  reward: 300,  type: 'commands' },
  { id: 'use_work',  name: '💼 Trabajador', desc: 'Usa /work 3 veces',    target: 3,  reward: 400,  type: 'work'     },
  { id: 'use_slots', name: '🎰 Apostador',  desc: 'Juega slots 5 veces',  target: 5,  reward: 600,  type: 'slots'    },
];

const WEEKLY = [
  { id: 'w_msgs',  name: '📢 Activo',     desc: 'Envía 200 mensajes',   target: 200, reward: 3000, type: 'messages' },
  { id: 'w_cmds',  name: '🤖 Experto',    desc: 'Usa 50 comandos',      target: 50,  reward: 2000, type: 'commands' },
  { id: 'w_daily', name: '📅 Constante',  desc: 'Haz /daily 5 veces',   target: 5,   reward: 2500, type: 'daily'    },
  { id: 'w_work',  name: '💪 Dedicado',   desc: 'Usa /work 15 veces',   target: 15,  reward: 2000, type: 'work'     },
];

function _dayKey(userId, guildId) {
  const d = new Date();
  return `d_${guildId}_${userId}_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}

function _weekKey(userId, guildId) {
  return `w_${guildId}_${userId}_${Math.floor(Date.now() / (7 * 86400000))}`;
}

function getDaily(userId, guildId) {
  return db.get('missions', _dayKey(userId, guildId)) || { progress: {}, claimed: [] };
}

function getWeekly(userId, guildId) {
  return db.get('missions', _weekKey(userId, guildId)) || { progress: {}, claimed: [] };
}

function progress(userId, guildId, type, amount = 1) {
  const pairs = [[DAILY, _dayKey], [WEEKLY, _weekKey]];
  for (const [missions, keyFn] of pairs) {
    const key  = keyFn(userId, guildId);
    const data = db.get('missions', key) || { progress: {}, claimed: [] };
    let changed = false;
    for (const m of missions) {
      if (m.type === type && !data.claimed.includes(m.id)) {
        data.progress[m.id] = Math.min((data.progress[m.id] || 0) + amount, m.target);
        changed = true;
      }
    }
    if (changed) db.set('missions', key, data);
  }
}

function claim(userId, guildId, missionId, period = 'daily') {
  const missions = period === 'daily' ? DAILY : WEEKLY;
  const mission  = missions.find(m => m.id === missionId);
  if (!mission) return { ok: false, reason: 'Misión no encontrada' };

  const key  = period === 'daily' ? _dayKey(userId, guildId) : _weekKey(userId, guildId);
  const data = db.get('missions', key) || { progress: {}, claimed: [] };

  if (data.claimed.includes(missionId)) return { ok: false, reason: 'Ya reclamaste esta misión' };
  const prog = data.progress[missionId] || 0;
  if (prog < mission.target) return { ok: false, reason: 'Misión incompleta', current: prog, target: mission.target };

  data.claimed.push(missionId);
  db.set('missions', key, data);

  try { require('./economy').addCoins(userId, mission.reward); } catch (_) {}

  return { ok: true, reward: mission.reward, mission };
}

module.exports = { DAILY, WEEKLY, getDaily, getWeekly, progress, claim };
