const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('serverblacklist')
    .setDescription('[OWNER] Gestiona la blacklist de servidores')
    .addSubcommand(s => s.setName('add').setDescription('Blacklistear servidor (y salir)')
      .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(false)))
    .addSubcommand(s => s.setName('remove').setDescription('Quitar servidor de blacklist')
      .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('Ver servidores bloqueados')),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();
    const bl  = db.get('blacklist', 'servers') || {};

    if (sub === 'add') {
      const serverId = interaction.options.getString('serverid');
      const reason   = interaction.options.getString('razon') || 'Sin razón';

      bl[serverId] = { reason, by: interaction.user.id, at: Date.now() };
      db.set('blacklist', 'servers', bl);

      const guild = client.guilds.cache.get(serverId);
      if (guild) {
        try { await guild.leave(); } catch {}
      }

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('🚫 Servidor Bloqueado')
        .addFields(
          { name: 'Servidor', value: guild ? `${guild.name} (\`${serverId}\`)` : `\`${serverId}\``, inline: true },
          { name: 'Razón', value: reason, inline: true },
          { name: 'Acción', value: guild ? '✅ Bot salió del servidor' : '⚠️ Servidor no encontrado en caché', inline: false }
        )
        .setFooter({ text: 'System 777 · Server Blacklist · Owner Only' })
        .setTimestamp()] });
    }

    if (sub === 'remove') {
      const serverId = interaction.options.getString('serverid');
      if (!bl[serverId]) return interaction.editReply({ content: `⚠️ Servidor \`${serverId}\` no está en blacklist.` });
      delete bl[serverId];
      db.set('blacklist', 'servers', bl);

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('✅ Servidor Desbloqueado')
        .setDescription(`\`${serverId}\` removido de blacklist.`)
        .setTimestamp()] });
    }

    if (sub === 'list') {
      const entries = Object.entries(bl);
      if (entries.length === 0) return interaction.editReply({ content: 'Server blacklist vacía.' });

      const lines = entries.slice(0, 25).map(([id, e]) => {
        const g = client.guilds.cache.get(id);
        return `\`${id}\` ${g ? `(${g.name}) ` : ''} — ${e.reason.slice(0, 40)}`;
      }).join('\n');

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0xFF9900)
        .setTitle(`🚫 Server Blacklist — ${entries.length} servidores`)
        .setDescription(lines)
        .setFooter({ text: 'System 777 · Server Blacklist · Owner Only' })
        .setTimestamp()] });
    }
  }
};
