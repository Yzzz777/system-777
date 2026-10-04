const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buttonroles')
    .setDescription('Crear menú de roles por botones')
    .addSubcommand(s => s
      .setName('create')
      .setDescription('Crear un panel de roles con botones')
      .addStringOption(o => o.setName('titulo').setDescription('Título del embed').setRequired(true))
      .addStringOption(o => o.setName('descripcion').setDescription('Descripción del embed').setRequired(true))
      .addStringOption(o => o.setName('roles').setDescription('Roles (ID:emoji:label, separados por coma)').setRequired(true))
      .addChannelOption(o => o.setName('canal').setDescription('Canal donde enviar el panel')))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('Ver panels de roles activos'))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Eliminar un panel de roles')
      .addStringOption(o => o.setName('message_id').setDescription('ID del mensaje del panel').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const title       = interaction.options.getString('titulo');
      const description = interaction.options.getString('descripcion');
      const rolesRaw    = interaction.options.getString('roles');
      const channel     = interaction.options.getChannel('canal') || interaction.channel;

      const roleEntries = rolesRaw.split(',').map(r => {
        const parts = r.trim().split(':');
        if (parts.length < 2) return null;
        const roleId = parts[0].trim();
        const emoji  = parts[1].trim();
        const label  = parts.slice(2).join(':').trim() || 'Toggle';
        return { roleId, emoji, label };
      }).filter(Boolean);

      if (!roleEntries.length) {
        return interaction.reply({ content: '❌ Formato inválido. Usa: `ID_ROL:emoji:Label` separados por coma.', flags: MessageFlags.Ephemeral });
      }

      const validRoles = [];
      for (const entry of roleEntries) {
        const role = interaction.guild.roles.cache.get(entry.roleId);
        if (role) validRoles.push(entry);
      }

      if (!validRoles.length) {
        return interaction.reply({ content: '❌ Ningún rol válido encontrado. Verifica los IDs.', flags: MessageFlags.Ephemeral });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'System 777 · Button Roles' })
        .setTimestamp();

      const rows = [];
      for (let i = 0; i < validRoles.length; i += 5) {
        const row = new ActionRowBuilder();
        for (const entry of validRoles.slice(i, i + 5)) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`role_toggle_${entry.roleId}`)
              .setLabel(entry.label)
              .setEmoji(entry.emoji)
              .setStyle(ButtonStyle.Secondary)
          );
        }
        rows.push(row);
      }

      const msg = await channel.send({ embeds: [embed], components: rows }).catch(() => null);
      if (!msg) {
        return interaction.reply({ content: '❌ No pude enviar el panel. Verifica permisos del bot en ese canal.', flags: MessageFlags.Ephemeral });
      }

      const panels = db.get('buttonroles', interaction.guild.id, []);
      panels.push({
        messageId: msg.id,
        channelId: channel.id,
        title,
        description,
        roles: validRoles,
        createdAt: Date.now(),
      });
      db.set('buttonroles', interaction.guild.id, panels);

      return interaction.reply({
        content: `✅ Panel de roles creado en ${channel}\nRoles: ${validRoles.map(r => `${r.emoji} ${r.label}`).join(', ')}`,
        flags: MessageFlags.Ephemeral
      });

    } else if (sub === 'list') {
      const panels = db.get('buttonroles', interaction.guild.id, []);
      if (!panels.length) {
        return interaction.reply({ content: '📋 No hay panels de roles activos.', flags: MessageFlags.Ephemeral });
      }

      const lines = panels.map((p, i) => {
        const ch = interaction.guild.channels.cache.get(p.channelId);
        return `**${i + 1}.** ${p.title} — ${ch ? `<#${ch.id}>` : 'canal eliminado'} — ${p.roles.length} roles — [Mensaje](https://discord.com/channels/${interaction.guild.id}/${p.channelId}/${p.messageId})`;
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`📋 Panels de Roles (${panels.length})`)
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'System 777 · Button Roles' })],
        flags: MessageFlags.Ephemeral
      });

    } else if (sub === 'remove') {
      const messageId = interaction.options.getString('message_id');
      const panels = db.get('buttonroles', interaction.guild.id, []);
      const idx = panels.findIndex(p => p.messageId === messageId);
      if (idx === -1) {
        return interaction.reply({ content: '❌ Panel no encontrado.', flags: MessageFlags.Ephemeral });
      }

      const panel = panels[idx];
      const ch = interaction.guild.channels.cache.get(panel.channelId);
      if (ch) {
        const msg = await ch.messages.fetch(messageId).catch(() => null);
        if (msg) await msg.delete().catch(() => {});
      }

      panels.splice(idx, 1);
      db.set('buttonroles', interaction.guild.id, panels);

      return interaction.reply({ content: `✅ Panel "${panel.title}" eliminado.`, flags: MessageFlags.Ephemeral });
    }
  }
};
