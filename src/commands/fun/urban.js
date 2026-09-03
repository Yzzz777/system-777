const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('urban')
    .setDescription('📖 Busca una definición en Urban Dictionary')
    .addStringOption(o => o.setName('termino').setDescription('Término a buscar').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const term = interaction.options.getString('termino');

    try {
      const url = `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.list || data.list.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('📖 Urban Dictionary')
            .setDescription(`No se encontró una definición para **${term}**.`)
            .setFooter({ text: 'System 777 • jrsystem7777.com' })]
        });
      }

      const def = data.list[0];
      const desc = def.definition.length > 1500
        ? def.definition.slice(0, 1500) + '...'
        : def.definition;

      const example = def.example
        ? `\n\n**Ejemplo:**\n> ${def.example.slice(0, 500)}`
        : '';

      const embed = new EmbedBuilder()
        .setColor(0x1A1A2E)
        .setTitle(`📖 ${def.word}`)
        .setDescription(desc + example)
        .addFields(
          { name: '👍 Thumbs Up', value: `${def.thumbs_up}`, inline: true },
          { name: '👎 Thumbs Down', value: `${def.thumbs_down}`, inline: true },
          { name: '🔗 Link', value: `[Ver en Urban Dictionary](${def.permalink})`, inline: true }
        )
        .setAuthor({ name: `Escrito por ${def.author}` })
        .setFooter({ text: 'System 777 • jrsystem7777.com' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('❌ Error')
          .setDescription('No pude consultar Urban Dictionary. Intenta de nuevo.')
          .setFooter({ text: 'System 777 • jrsystem7777.com' })]
      });
    }
  }
};
