const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('⏰ Genera timestamps de Discord')
    .addStringOption(o => o.setName('fecha').setDescription('Fecha (YYYY-MM-DD HH:MM) o "ahora"').setRequired(true))
    .addStringOption(o =>
      o.setName('formato')
        .setDescription('Formato del timestamp')
        .addChoices(
          { name: '📅 Fecha corta', value: 'd' },
          { name: '📅 Fecha larga', value: 'D' },
          { name: '🕐 Hora', value: 't' },
          { name: '🕐 Hora larga', value: 'T' },
          { name: '📅🕐 Fecha + Hora', value: 'f' },
          { name: '📅🕐 Fecha + Hora (largo)', value: 'F' },
          { name: '⏳ Relativo', value: 'R' },
        )
    ),

  async execute(interaction) {
    const input = interaction.options.getString('fecha');
    const format = interaction.options.getString('formato') || 'f';

    let date;
    if (input.toLowerCase() === 'ahora') {
      date = new Date();
    } else {
      date = new Date(input);
      if (isNaN(date.getTime())) {
        return interaction.reply({ content: '❌ Fecha inválida. Usa formato: `YYYY-MM-DD HH:MM` o `ahora`', flags: MessageFlags.Ephemeral });
      }
    }

    const unix = Math.floor(date.getTime() / 1000);
    const stamp = `<t:${unix}:${format}>`;
    const stampCode = `\`<t:${unix}:${format}>\``;

    const examples = ['d', 'D', 't', 'T', 'f', 'F', 'R'].map(f =>
      `**${f}**: <t:${unix}:${f}> → \`<t:${unix}:${f}>\``
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xFFD93D)
      .setTitle('⏰ Timestamp Generator')
      .addFields(
        { name: '📥 Fecha', value: date.toISOString(), inline: false },
        { name: '📤 Tu Timestamp', value: `${stamp}\n${stampCode}`, inline: false },
        { name: '📋 Todos los formatos', value: examples, inline: false },
      )
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
