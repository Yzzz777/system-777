const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('🔓 Desbloquea un canal')
    .addChannelOption(o => o.setName('canal').setDescription('Canal a desbloquear (default: este)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  userPermissions: [PermissionFlagsBits.ManageChannels],

  async execute(interaction) {
    const canal = interaction.options.getChannel('canal') ?? interaction.channel;

    try {
      await canal.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null,
        AddReactions: null,
      });

      const embed = successEmbed('🔓 Canal Desbloqueado', null, {
        fields: [
          { name: '📢 Canal', value: canal.toString(),     inline: true },
          { name: '👮 Mod',   value: interaction.user.tag, inline: true },
        ]
      });

      await interaction.reply({ embeds: [embed] });
    } catch (e) {
      await interaction.reply({ content: `❌ No pude desbloquear: ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
