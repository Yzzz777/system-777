const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('🐢 Activa o desactiva el modo lento en el canal')
    .addIntegerOption(o => o.setName('segundos').setDescription('Segundos (0 = desactivar, máx 21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  userPermissions: [PermissionFlagsBits.ManageChannels],

  async execute(interaction) {
    const seg = interaction.options.getInteger('segundos');
    await interaction.channel.setRateLimitPerUser(seg);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(seg === 0 ? 0x00FF88 : 0xFF9900)
        .setDescription(seg === 0
          ? `✅ Slowmode desactivado en <#${interaction.channel.id}>`
          : `🐢 Slowmode activado: **${seg}s** en <#${interaction.channel.id}>`)
        .setFooter({ text: 'System 777 · Developer 777' })]
    });
  }
};
