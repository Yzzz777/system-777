const { EmbedBuilder, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildDelete',
  async execute(guild, client) {
    logger.warn(`Bot removido de: ${guild.name} (${guild.id})`);

    // Intentar obtener quién expulsó al bot (audit log)
    let responsable = 'Desconocido';
    let tipoAccion  = 'Removido';

    try {
      if (guild.members?.me !== null) {
        const logs = await guild.fetchAuditLogs({
          type: AuditLogEvent.BotRemove,
          limit: 5,
        }).catch(() => null);

        if (logs) {
          const entrada = logs.entries.find(e =>
            e.target?.id === client.user.id &&
            Date.now() - e.createdTimestamp < 10000
          );
          if (entrada) {
            responsable = `${entrada.executor?.tag ?? 'Desconocido'} (${entrada.executor?.id ?? '?'})`;
            tipoAccion  = 'Expulsado por admin';
          }
        }
      }
    } catch {}

    // Generar link de reinvitación
    const clientId = client.user.id;
    const reinvite = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot+applications.commands`;

    const embed = new EmbedBuilder()
      .setColor(0xFF2222)
      .setTitle('🚨 System 777 — Expulsado de un Servidor')
      .setDescription(
        `⚠️ **El bot fue removido sin su autorización, Jefe.**\n\n` +
        `Use el link de abajo para re-agregar el bot al servidor.`
      )
      .addFields(
        { name: '🏠 Servidor',        value: `**${guild.name}**`,     inline: true  },
        { name: '🆔 ID Servidor',     value: guild.id,               inline: true  },
        { name: '👤 Responsable',     value: responsable,            inline: false },
        { name: '⚡ Acción',          value: tipoAccion,             inline: true  },
        { name: '📊 Servidores restantes', value: `${client.guilds.cache.size}`, inline: true },
        { name: '🔗 Re-agregar bot',  value: `[Click aquí](${reinvite})`, inline: false },
      )
      .setThumbnail(guild.iconURL({ size: 128 }) ?? null)
      .setFooter({ text: 'System 777 · Developer 777 · Alerta de protección' })
      .setTimestamp();

    await logger.dmOwner(client, null, embed);
  }
};
