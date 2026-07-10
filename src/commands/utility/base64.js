const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('base64')
    .setDescription('🔐 Codifica o decodifica Base64')
    .addStringOption(o => o.setName('texto').setDescription('Texto a procesar').setRequired(true))
    .addStringOption(o =>
      o.setName('modo')
        .setDescription('Codificar o decodificar')
        .addChoices(
          { name: '🔒 Codificar', value: 'encode' },
          { name: '🔓 Decodificar', value: 'decode' },
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('texto');
    const mode = interaction.options.getString('modo');

    let result;
    try {
      if (mode === 'encode') {
        result = Buffer.from(text, 'utf-8').toString('base64');
      } else {
        result = Buffer.from(text, 'base64').toString('utf-8');
        if (!result || /[\x00-\x08\x0E-\x1F]/.test(result)) {
          return interaction.reply({ content: '❌ No es un Base64 válido.', flags: MessageFlags.Ephemeral });
        }
      }
    } catch {
      return interaction.reply({ content: '❌ Error al procesar el texto.', flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setColor(0x7C3AED)
      .setTitle('🔐 Base64')
      .addFields(
        { name: '📥 Entrada', value: `\`\`\`${text.slice(0, 500)}\`\`\``, inline: false },
        { name: `📤 ${mode === 'encode' ? 'Codificado' : 'Decodificado'}`, value: `\`\`\`${result.slice(0, 500)}\`\`\``, inline: false },
      )
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
