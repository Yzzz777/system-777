const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const sysLogger = require('../../systems/logger');
const db = require('../../utils/db');
const { modEmbed } = require('../../utils/embeds');

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
    try {
      await target.kick(`${reason} | Moderador: ${interaction.user.tag}`);
    } catch (e) {
      return interaction.editReply({ content: `❌ No pude expulsar: ${e.message}`, flags: MessageFlags.Ephemeral });
    }
    db.logActivity(interaction.guild.id, { actionType: 'kick', userId: interaction.user.id, targetId: target.id, details: `Kick: ${target.user.tag} | Razón: ${reason}` });

    const embed = modEmbed('👢 Usuario Expulsado', null, {
      thumbnail: target.user.displayAvatarURL(),
      fields: [
        { name: 'Usuario',   value: `${target.user.tag} \`(${target.id})\``, inline: true },
        { name: 'Moderador', value: interaction.user.tag,                      inline: true },
        { name: 'Razón',     value: reason }
      ]
    });

    await interaction.editReply({ embeds: [embed] });
    await sysLogger.logKick(interaction.guild, target.user, interaction.user, reason);
  }
};
