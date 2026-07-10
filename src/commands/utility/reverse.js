const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reverse')
    .setDescription('🔄 Invierte un texto')
    .addStringOption(o => o.setName('texto').setDescription('Texto a invertir').setRequired(true).setMaxLength(200)),

  async execute(interaction) {
    const text = interaction.options.getString('texto');
    const reversed = text.split('').reverse().join('');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔄 Texto Invertido')
      .addFields(
        { name: '📥 Original', value: text, inline: false },
        { name: '📤 Invertido', value: reversed, inline: false },
      )
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
