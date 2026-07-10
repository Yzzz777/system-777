const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pat').setDescription('🥺 Acaricia a alguien')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xFFCC00)
        .setDescription(`🥺 ${interaction.user} le dio palmaditas a ${target}`)
        .setImage('https://media.tenor.com/3i3snCIc3o8AAAAC/anime-headpat.gif')
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })]
    });
  }
};
