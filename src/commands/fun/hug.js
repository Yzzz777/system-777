const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hug').setDescription('🤗 Abraza a alguien')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xFF9999)
        .setDescription(`🤗 ${interaction.user} le dio un abrazo a ${target}`)
        .setImage('https://media.tenor.com/ZB3Iel5O6_QAAAAC/anime-hug.gif')
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })]
    });
  }
};
