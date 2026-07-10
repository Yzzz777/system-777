const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rate')
    .setDescription('⭐ Califica algo del 1 al 10')
    .addStringOption(o => o.setName('algo').setDescription('¿Qué calificar?').setRequired(true)),

  async execute(interaction) {
    const algo = interaction.options.getString('algo');
    const rating = Math.floor(Math.random() * 11);
    const stars = '⭐'.repeat(rating) + '☆'.repeat(10 - rating);

    let desc;
    if (rating >= 9)       desc = '🔥 ¡PERFECTO! Esto es insuperable.';
    else if (rating >= 7)  desc = '👏 Muy bueno, le faltó poco para la perfección.';
    else if (rating >= 5)  desc = '🤷 Regular, cumple su función.';
    else if (rating >= 3)  desc = '😬 Meh... hay cosas mejores.';
    else if (rating >= 1)  desc = '💀 Ni tu abuela lo calificaría bien.';
    else                   desc = '☠️ Esto no debería existir.';

    const embed = new EmbedBuilder()
      .setColor(rating >= 7 ? 0x00FF88 : rating >= 4 ? 0xFFD93D : 0xFF4500)
      .setTitle('⭐ Rate Machine')
      .setDescription(`¿**${algo}**?\n\n${stars}\n\n**${rating}/10** — ${desc}`)
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
