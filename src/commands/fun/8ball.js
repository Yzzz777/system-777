const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const RESPUESTAS = [
  { text: 'Sí, definitivamente.', color: 0x00FF88 },
  { text: 'Así es.', color: 0x00FF88 },
  { text: 'Sin duda alguna.', color: 0x00FF88 },
  { text: 'Puedes contar con ello.', color: 0x00FF88 },
  { text: 'Lo más probable.', color: 0xFFCC00 },
  { text: 'Las señales dicen que sí.', color: 0xFFCC00 },
  { text: 'Mejor no decirte ahora.', color: 0xFFCC00 },
  { text: 'No puedo predecirlo ahora.', color: 0xFFCC00 },
  { text: 'Concéntrate y pregunta de nuevo.', color: 0xFFCC00 },
  { text: 'No cuentes con ello.', color: 0xFF4444 },
  { text: 'Mi respuesta es no.', color: 0xFF4444 },
  { text: 'Mis fuentes dicen que no.', color: 0xFF4444 },
  { text: 'Las perspectivas no son buenas.', color: 0xFF4444 },
  { text: 'Muy dudoso.', color: 0xFF4444 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('🎱 Pregúntale a la bola mágica')
    .addStringOption(o => o.setName('pregunta').setDescription('Tu pregunta').setRequired(true)),

  async execute(interaction) {
    const pregunta = interaction.options.getString('pregunta');
    const resp     = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)];

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(resp.color)
        .setTitle('🎱 La Bola Mágica')
        .addFields(
          { name: '❓ Pregunta', value: pregunta },
          { name: '🎱 Respuesta', value: `**${resp.text}**` }
        )
        .setFooter({ text: `System 777 · Developer 777` })]
    });
  }
};
