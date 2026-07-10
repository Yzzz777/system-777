const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('[OWNER] Gestiona la blacklist de usuarios')
    .addSubcommand(s => s.setName('add').setDescription('Añadir usuario a blacklist')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario a bloquear').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(false)))
    .addSubcommand(s => s.setName('remove').setDescription('Quitar usuario de blacklist')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario a desbloquear').setRequired(true)))
    .addSubcommand(s => s.setName('check').setDescription('Ver si usuario está en blacklist')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('Ver todos los usuarios en blacklist')),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub  = interaction.options.getSubcommand();
    const user = interaction.options.getUser('usuario');
    const bl   = db.get('blacklist', 'users') || {};

    if (sub === 'add') {
      if (user.id === interaction.user.id) return interaction.editReply({ content: '❌ No puedes bloquearte a ti mismo.' });
      if (bl[user.id]) return interaction.editReply({ content: `⚠️ ${user.tag} ya está en blacklist.` });

      bl[user.id] = {
        reason: interaction.options.getString('razon') || 'Sin razón',
        by: interaction.user.id,
        at: Date.now()
      };
      db.set('blacklist', 'users', bl);

      const embed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('🚫 Usuario Bloqueado')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'Usuario', value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: 'Razón', value: bl[user.id].reason, inline: true }
        )
        .setFooter({ text: 'System 777 · Blacklist · Owner Only' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'remove') {
      if (!bl[user.id]) return interaction.editReply({ content: `⚠️ ${user.tag} no está en blacklist.` });
      delete bl[user.id];
      db.set('blacklist', 'users', bl);

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('✅ Usuario Desbloqueado')
        .setDescription(`${user.tag} (\`${user.id}\`) removido de blacklist.`)
        .setFooter({ text: 'System 777 · Blacklist · Owner Only' })
        .setTimestamp()] });
    }

    if (sub === 'check') {
      const entry = bl[user.id];
      if (!entry) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00FF88).setTitle('✅ No está en blacklist').setDescription(`${user.tag} puede usar el bot normalmente.`)] });
      }
      const embed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('🚫 Usuario en Blacklist')
        .addFields(
          { name: 'Usuario', value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: 'Razón', value: entry.reason, inline: true },
          { name: 'Bloqueado', value: `<t:${Math.floor(entry.at / 1000)}:R>`, inline: true }
        )
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'list') {
      const entries = Object.entries(bl);
      if (entries.length === 0) return interaction.editReply({ content: 'Blacklist vacía.' });

      const lines = entries.slice(0, 25).map(([id, e]) => `<@${id}> — ${e.reason.slice(0, 40)}`).join('\n');
      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0xFF9900)
        .setTitle(`🚫 Blacklist — ${entries.length} usuarios`)
        .setDescription(lines)
        .setFooter({ text: 'System 777 · Blacklist · Owner Only' })
        .setTimestamp()] });
    }
  }
};
