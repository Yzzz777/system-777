const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('🪙 Lanza una moneda'),

  async execute(interaction) {
    const result = Math.random() < 0.5 ? '🦅 Cara' : '🔢 Cruz';
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xF5C518)
        .setTitle('🪙 Lanzamiento de Moneda')
        .setDescription(`## ${result}`)
        .setFooter({ text: `Pedido por ${interaction.user.tag} · System 777` })]
    });
  }
};
