const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('⏱️ Silencia temporalmente a un usuario')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(o => o.setName('duracion').setDescription('Duración (ej: 10m, 1h, 1d)').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  userPermissions: [PermissionFlagsBits.ModerateMembers],

  async execute(interaction) {
    const target   = interaction.options.getMember('usuario');
    const duration = interaction.options.getString('duracion');
    const reason   = interaction.options.getString('razon') || 'Sin razón';
    const msTime   = ms(duration);

    if (!target?.moderatable) return interaction.reply({ content: '❌ No puedo moderar a ese usuario.', flags: MessageFlags.Ephemeral });
    if (!msTime || msTime < 5000 || msTime > 2419200000)
      return interaction.reply({ content: '❌ Duración inválida. Usa: `10s`, `5m`, `2h`, `1d` (máx 28 días).', flags: MessageFlags.Ephemeral });

    await target.timeout(msTime, `${reason} | Mod: ${interaction.user.tag}`);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xFF9900)
        .setTitle('⏱️ Timeout Aplicado')
        .addFields(
          { name: 'Usuario',  value: `${target.user.tag}`,                              inline: true },
          { name: 'Duración', value: duration,                                           inline: true },
          { name: 'Termina',  value: `<t:${Math.floor((Date.now()+msTime)/1000)}:R>`,   inline: true },
          { name: 'Razón',    value: reason }
        )
        .setFooter({ text: 'System 777 · Developer 777' })]
    });
  }
};
