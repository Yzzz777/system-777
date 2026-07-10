const db = require('../utils/db');

const UNITS = { m: 60000, h: 3600000, d: 86400000, w: 604800000 };

function parseTime(str) {
  if (!str || ['indefinido', 'indefinida', '∞', '-'].includes(str.toLowerCase())) return null;
  const match = str.match(/^(\d+)(m|h|d|w)$/i);
  if (!match) return null;
  return Date.now() + parseInt(match[1]) * UNITS[match[2].toLowerCase()];
}

function formatRemaining(endTime) {
  if (!endTime) return '♾️ Indefinida';
  const ms = endTime - Date.now();
  if (ms <= 0) return '⏰ Expirada';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function set(guildId, userId, reason, endTime, setBy, channelId = null, messageId = null) {
  db.set('ausencias', `${guildId}_${userId}`, {
    userId, guildId, reason, setBy,
    startTime: Date.now(), endTime,
    channelId, messageId,
    active: true,
  });
}

function cancel(guildId, userId) {
  const data = db.get('ausencias', `${guildId}_${userId}`);
  if (!data) return null;
  db.del('ausencias', `${guildId}_${userId}`);
  return data;
}

function get(guildId, userId) {
  const data = db.get('ausencias', `${guildId}_${userId}`);
  if (!data) return null;
  if (data.endTime && data.endTime < Date.now()) {
    db.del('ausencias', `${guildId}_${userId}`);
    return null;
  }
  return data;
}

function listGuild(guildId) {
  const all = db.all('ausencias');
  const now = Date.now();
  const activas = [];
  for (const [k, a] of Object.entries(all)) {
    if (!a?.guildId || a.guildId !== guildId) continue;
    if (a.endTime && a.endTime < now) { db.del('ausencias', k); continue; } // auto-expire
    activas.push(a);
  }
  return activas;
}

function getChannel(guildId) {
  return db.get('guilds', guildId, {}).ausenciaChannel || null;
}

function setChannel(guildId, channelId) {
  const cfg = db.get('guilds', guildId, {});
  cfg.ausenciaChannel = channelId;
  db.set('guilds', guildId, cfg);
}

module.exports = { parseTime, formatRemaining, set, cancel, get, listGuild, getChannel, setChannel };
