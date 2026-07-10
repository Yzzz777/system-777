const db = require('../utils/db');
const { sendAlert } = require('../systems/securityGuard');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban, client) {
    const gbans = db.get('globalbans', 'users', {});
    if (!gbans[ban.user.id]) return;

    // Re-apply ban immediately — global ban is permanent
    try {
      await ban.guild.bans.create(ban.user.id, {
        reason: `System 777 · Ban Global Permanente Re-aplicado: ${gbans[ban.user.id].reason}`,
      });
      await sendAlert(client, ban.guild,
        '⛔ Ban Global Re-aplicado',
        `Alguien intentó desbanear a \`${ban.user.tag}\` (\`${ban.user.id}\`) que tiene ban global permanente.\nBan re-aplicado automáticamente.\nPara levantarlo, solo el owner puede usar \`/globalban remove\`.`,
        0xFF0000, 'CRITICAL');
    } catch {}
  }
};
