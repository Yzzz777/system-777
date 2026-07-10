const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('🔄 Banea y desbanea (elimina mensajes sin mantener el ban)')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  userPermissions: [PermissionFlagsBits.BanMembers],

  async execute(interaction) {
    const target = interaction.options.getMember('usuario');
    const reason = interaction.options.getString('razon') || 'Softban — limpiar mensajes';

    if (!target?.bannable) return interaction.reply({ content: '❌ No puedo banear a ese usuario.', flags: MessageFlags.Ephemeral });

    await interaction.deferReply();
    await target.ban({ reason, deleteMessageSeconds: 7 * 86400 });
    await interaction.guild.bans.remove(target.id, 'Softban — desbaneado automáticamente');

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0xFF6600)
        .setTitle('🔄 Softban Aplicado')
        .addFields(
          { name: 'Usuario',   value: `${target.user.tag} \`(${target.id})\``, inline: true },
          { name: 'Moderador', value: interaction.user.tag,                      inline: true },
          { name: 'Razón',     value: reason },
          { name: 'Efecto',    value: 'Mensajes de los últimos 7 días eliminados. Usuario puede reingresar.' }
        )
        .setFooter({ text: 'System 777 · Developer 777' })]
    });
  }
};
