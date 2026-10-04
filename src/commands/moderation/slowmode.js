const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, warningEmbed } = require('../../utils/embeds');

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
      embeds: [seg === 0
        ? successEmbed('🐢 Slowmode Desactivado', `Slowmode desactivado en <#${interaction.channel.id}>`)
        : warningEmbed('🐢 Slowmode Activado', `Slowmode activado: **${seg}s** en <#${interaction.channel.id}>`)]
    });
  }
};
