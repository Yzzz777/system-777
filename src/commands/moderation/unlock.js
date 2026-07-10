const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

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

      const embed = new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('🔓 Canal Desbloqueado')
        .addFields(
          { name: '📢 Canal', value: canal.toString(),     inline: true },
          { name: '👮 Mod',   value: interaction.user.tag, inline: true },
        )
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (e) {
      await interaction.reply({ content: `❌ No pude desbloquear: ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
