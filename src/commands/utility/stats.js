const db = require('../../utils/db');

function updateStats(client) {
  try {
    const stats = {
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
      commands: client.commands?.size || 0,
      uptime: Math.floor(client.uptime / 1000),
      ts: Date.now(),
    };
    db.set('stats', 'bot', stats);
  } catch {}
}

module.exports = { updateStats };
