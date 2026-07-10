const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('color')
    .setDescription('🎨 Muestra info de un color')
    .addStringOption(o => o.setName('hex').setDescription('Código hex (ej: #FF5733 o FF5733)').setRequired(true)),

  async execute(interaction) {
    let hex = interaction.options.getString('hex').replace('#', '');

    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      return interaction.reply({ content: '❌ Código hex inválido. Usa formato: `FF5733` o `#FF5733`', flags: MessageFlags.Ephemeral });
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    const hsl = rgbToHsl(r, g, b);

    const embed = new EmbedBuilder()
      .setColor(parseInt(hex, 16))
      .setTitle(`🎨 Color #${hex.toUpperCase()}`)
      .setDescription(`█`.repeat(20))
      .addFields(
        { name: '🔴 RGB', value: `R: ${r} · G: ${g} · B: ${b}`, inline: true },
        { name: '🌈 HSL', value: `H: ${hsl.h}° · S: ${hsl.s}% · L: ${hsl.l}%`, inline: true },
        { name: '📦 Decimal', value: `${parseInt(hex, 16)}`, inline: true },
        { name: '🔗 CSS', value: `\`#${hex.toUpperCase()}\` · \`rgb(${r},${g},${b})\``, inline: false },
      )
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
