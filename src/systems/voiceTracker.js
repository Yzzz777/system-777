const db = require('../utils/db');

// In-memory: "userId_guildId" → joinTime
const sessions = new Map();

function join(userId, guildId) {
  sessions.set(`${userId}_${guildId}`, Date.now());
}

function leave(userId, guildId) {
  const key     = `${userId}_${guildId}`;
  const started = sessions.get(key);
  if (!started) return;
  sessions.delete(key);

  const duration = Date.now() - started;
  if (duration < 5000) return; // ignore sub-5s blips

  const dbKey = `${guildId}_${userId}`;
  const data  = db.get('voice_time', dbKey) || { total: 0, sessions: 0 };
  data.total    += duration;
  data.sessions += 1;
  db.set('voice_time', dbKey, data);
}

function getTime(userId, guildId) {
  return db.get('voice_time', `${guildId}_${userId}`) || { total: 0, sessions: 0 };
}

function getLeaderboard(guildId, limit = 10) {
  const prefix = `${guildId}_`;
  return Object.entries(db.all('voice_time'))
    .filter(([k]) => k.startsWith(prefix))
    .map(([k, v]) => ({ userId: k.slice(prefix.length), total: v.total || 0, sessions: v.sessions || 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function formatTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

module.exports = { join, leave, getTime, getLeaderboard, formatTime };
