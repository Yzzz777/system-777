const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bmi')
    .setDescription('⚖️ Calcula tu índice de masa corporal')
    .addNumberOption(o => o.setName('peso').setDescription('Peso en kg').setRequired(true).setMinValue(1).setMaxValue(500))
    .addNumberOption(o => o.setName('altura').setDescription('Altura en cm').setRequired(true).setMinValue(50).setMaxValue(300)),

  async execute(interaction) {
    const peso = interaction.options.getNumber('peso');
    const altura = interaction.options.getNumber('altura');
    const altM = altura / 100;
    const bmi = peso / (altM * altM);

    let category, color, emoji;
    if (bmi < 18.5)       { category = 'Bajo peso'; color = 0x00C8FF; emoji = '🔵'; }
    else if (bmi < 25)    { category = 'Peso normal'; color = 0x00FF88; emoji = '🟢'; }
    else if (bmi < 30)    { category = 'Sobrepeso'; color = 0xFFD93D; emoji = '🟡'; }
    else if (bmi < 35)    { category = 'Obesidad grado I'; color = 0xFF8C42; emoji = '🟠'; }
    else if (bmi < 40)    { category = 'Obesidad grado II'; color = 0xFF6B6B; emoji = '🔴'; }
    else                  { category = 'Obesidad grado III'; color = 0x8B0000; emoji = '⚫'; }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('⚖️ Calculadora de IMC')
      .addFields(
        { name: '📥 Peso', value: `${peso} kg`, inline: true },
        { name: '📏 Altura', value: `${altura} cm`, inline: true },
        { name: '📊 IMC', value: `${emoji} **${bmi.toFixed(1)}**`, inline: true },
        { name: '📋 Categoría', value: category, inline: false },
      )
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
