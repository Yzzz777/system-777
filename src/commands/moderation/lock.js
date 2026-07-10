const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('🔒 Bloquea un canal (nadie puede escribir)')
    .addChannelOption(o => o.setName('canal').setDescription('Canal a bloquear (default: este)'))
    .addStringOption(o => o.setName('razon').setDescription('Razón'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  userPermissions: [PermissionFlagsBits.ManageChannels],

  async execute(interaction) {
    const canal  = interaction.options.getChannel('canal') ?? interaction.channel;
    const razon  = interaction.options.getString('razon') ?? 'Sin razón';

    try {
      await canal.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false,
      });

      const embed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('🔒 Canal Bloqueado')
        .addFields(
          { name: '📢 Canal',     value: canal.toString(),         inline: true },
          { name: '👮 Mod',       value: interaction.user.tag,     inline: true },
          { name: '📝 Razón',     value: razon,                    inline: false },
        )
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (e) {
      await interaction.reply({ content: `❌ No pude bloquear: ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
