const { AuditLogEvent } = require('discord.js');
const antiNuke = require('../systems/antiNuke');
const shield   = require('../systems/botShield');
const logger   = require('../systems/logger');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    try {
      // Baneos hechos fuera del bot (otro mod, la web de Discord, etc.).
      // Los que hace el bot con /ban ya registran su propio log.
      try {
        const entry = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 })
          .then(l => l.entries.first()).catch(() => null);
        const byBot = entry?.executor?.id === client.user?.id;
        if (!byBot) {
          await logger.logBan(ban.guild, ban.user, entry?.executor ?? null, entry?.reason ?? 'Sin razón');
        }
      } catch {}
      await shield.onBanAdd(ban.guild, ban.user, client);
      await antiNuke.onBanAdd(ban.guild, ban.user, client);
    } catch (error) {
      console.error('[EVENT ERROR] guildBanAdd:', error);
    }
  }
};
