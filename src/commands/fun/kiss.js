const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kiss').setDescription('💋 Besa a alguien')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xFF69B4)
        .setDescription(`💋 ${interaction.user} le dio un beso a ${target}`)
        .setImage('https://media.tenor.com/t_-FeRFB4LMAAAAC/anime-kiss.gif')
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })]
    });
  }
};
