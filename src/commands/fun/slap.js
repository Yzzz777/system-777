const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slap').setDescription('👋 Cachetea a alguien')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xFF4444)
        .setDescription(`👋 ${interaction.user} le dio una cachetada a ${target} 😤`)
        .setImage('https://media.tenor.com/6LsQarDKhm8AAAAC/anime-slap.gif')
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })]
    });
  }
};
