const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('🎲 Lanza dados')
    .addIntegerOption(o => o.setName('caras').setDescription('Caras del dado (default: 6)').setMinValue(2).setMaxValue(1000))
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad de dados (default: 1)').setMinValue(1).setMaxValue(10)),

  async execute(interaction) {
    try {
      const caras    = interaction.options.getInteger('caras')    ?? 6;
      const cantidad = interaction.options.getInteger('cantidad') ?? 1;

      const resultados = Array.from({ length: cantidad }, () => Math.floor(Math.random() * caras) + 1);
      const total      = resultados.reduce((a, b) => a + b, 0);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🎲 Dados d${caras}`)
        .addFields(
          { name: '🎲 Resultados', value: resultados.map(r => `**${r}**`).join('  '), inline: true },
          { name: '➕ Total',      value: `**${total}**`,                                inline: true },
          { name: '📊 Promedio',   value: `**${(total / cantidad).toFixed(1)}**`,        inline: true },
        )
        .setFooter({ text: 'System 777 • jrsystem7777.com' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[ERROR] dice:', error);
      const reply = { content: '❌ Error interno del comando.', ephemeral: true };
      if (interaction.deferred) await interaction.editReply(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
  }
};
