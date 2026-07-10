const db = require('../utils/db');

const XP_MIN = 15, XP_MAX = 40;
const COOLDOWN_MS = 60000; // 1 min entre XP
const cooldowns = new Map();

function xpForLevel(level) {
  return level * level * 100;
}

function levelFromXp(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

function addXp(userId, guildId) {
  const key = `${userId}_${guildId}`;
  const now = Date.now();
  if (cooldowns.has(key) && now - cooldowns.get(key) < COOLDOWN_MS) return null;
  cooldowns.set(key, now);

  const data  = db.get('levels', key, { xp: 0, level: 0, messages: 0 });
  const gain  = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
  const oldLv = data.level;

  data.xp       += gain;
  data.messages += 1;
  data.level     = levelFromXp(data.xp);
  db.set('levels', key, data);

  if (data.level > oldLv) return { leveledUp: true, level: data.level, xp: data.xp };
  return { leveledUp: false };
}

function getStats(userId, guildId) {
  const key  = `${userId}_${guildId}`;
  const data = db.get('levels', key, { xp: 0, level: 0, messages: 0 });
  const next = xpForLevel(data.level + 1);
  const curr = xpForLevel(data.level);
  const progress = Math.min(100, Math.floor(((data.xp - curr) / (next - curr)) * 100));
  return { ...data, xpForNext: next, progress };
}

function getLeaderboard(guildId, limit = 10) {
  const all = db.all('levels');
  return Object.entries(all)
    .filter(([k]) => k.endsWith(`_${guildId}`))
    .map(([k, v]) => ({ userId: k.split('_')[0], ...v }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

module.exports = { addXp, getStats, getLeaderboard, xpForLevel };
