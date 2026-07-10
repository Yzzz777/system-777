const db = require('../utils/db');

function set(userId, reason = 'AFK') {
  db.set('afk', userId, { reason: String(reason).slice(0, 100), since: Date.now() });
}

function remove(userId) { db.del('afk', userId); }

function get(userId) { return db.get('afk', userId) || null; }

function isAfk(userId) { return !!get(userId); }

module.exports = { set, remove, get, isAfk };
