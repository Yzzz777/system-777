const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const sysLogger = require('../../systems/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un usuario del servidor')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  userPermissions: [PermissionFlagsBits.KickMembers],

  async execute(interaction) {
    const target = interaction.options.getMember('usuario');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';

    if (!target?.kickable) return interaction.reply({ content: '❌ No puedo expulsar a ese usuario.', flags: MessageFlags.Ephemeral });

    await interaction.deferReply();
    await target.kick(`${reason} | Moderador: ${interaction.user.tag}`);

    const embed = new EmbedBuilder()
      .setColor(0xFF6600)
      .setTitle('👢 Usuario Expulsado')
      .setThumbnail(target.user.displayAvatarURL())
      .addFields(
        { name: 'Usuario',   value: `${target.user.tag} \`(${target.id})\``, inline: true },
        { name: 'Moderador', value: interaction.user.tag,                      inline: true },
        { name: 'Razón',     value: reason }
      )
      .setTimestamp()
      .setFooter({ text: 'System 777 · Developer 777' });

    await interaction.editReply({ embeds: [embed] });
    await sysLogger.logKick(interaction.guild, target.user, interaction.user, reason);
  }
};
