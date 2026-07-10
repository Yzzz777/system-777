const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const PREGUNTAS = [
  { q: '¿Cuántos planetas tiene el sistema solar?', opts: ['7','8','9','10'], r: 1 },
  { q: '¿En qué año fue fundado Discord?', opts: ['2013','2014','2015','2016'], r: 2 },
  { q: '¿Cuál es el país más grande del mundo?', opts: ['China','Canadá','EE.UU.','Rusia'], r: 3 },
  { q: '¿Cuánto es la raíz cuadrada de 144?', opts: ['11','12','13','14'], r: 1 },
  { q: '¿Cuál es el idioma más hablado del mundo?', opts: ['Español','Inglés','Mandarín','Hindi'], r: 2 },
  { q: '¿Cuántos lados tiene un hexágono?', opts: ['5','6','7','8'], r: 1 },
  { q: '¿Cuál es el elemento químico del oro?', opts: ['Go','Au','Ag','Ou'], r: 1 },
  { q: '¿Cuántos huesos tiene el cuerpo humano adulto?', opts: ['186','206','216','226'], r: 1 },
  { q: '¿Cuál es la capital de Japón?', opts: ['Osaka','Seúl','Tokio','Kioto'], r: 2 },
  { q: '¿Qué animal es el símbolo de la paz?', opts: ['Paloma','Águila','Cisne','Gaviota'], r: 0 },
  { q: '¿En qué continente está Brasil?', opts: ['África','Europa','América del Norte','América del Sur'], r: 3 },
  { q: '¿Cuánto es 15 × 15?', opts: ['200','215','225','235'], r: 2 },
  { q: '¿Cuál es el océano más grande?', opts: ['Atlántico','Índico','Ártico','Pacífico'], r: 3 },
  { q: '¿Qué lenguaje de programación usa el símbolo #?', opts: ['Java','Python','C#','Rust'], r: 2 },
  { q: '¿Cuántos colores tiene el arcoíris?', opts: ['5','6','7','8'], r: 2 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('🧠 Pregunta de trivia aleatoria'),

  async execute(interaction) {
    const preg  = PREGUNTAS[Math.floor(Math.random() * PREGUNTAS.length)];
    const emojis = ['🇦','🇧','🇨','🇩'];
    const colores = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary];

    const row = new ActionRowBuilder().addComponents(
      preg.opts.map((opt, i) =>
        new ButtonBuilder()
          .setCustomId(`trivia_${i}_${preg.r}_${interaction.id}`)
          .setLabel(`${emojis[i]} ${opt}`)
          .setStyle(colores[i])
      )
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🧠 Trivia — System 777')
      .setDescription(`**${preg.q}**`)
      .setFooter({ text: 'Tienes 20 segundos · System 777' });

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const respondidos = new Set();

    const collector = msg.createMessageComponentCollector({ time: 20000 });

    collector.on('collect', async btn => {
      if (respondidos.has(btn.user.id)) {
        return btn.reply({ content: '❌ Ya respondiste.', flags: MessageFlags.Ephemeral });
      }
      respondidos.add(btn.user.id);

      const [, elegidoStr, correctoStr] = btn.customId.split('_');
      const elegido  = parseInt(elegidoStr);
      const correcto = parseInt(correctoStr);
      const acierto  = elegido === correcto;

      await btn.reply({
        embeds: [new EmbedBuilder()
          .setColor(acierto ? 0x00FF88 : 0xFF4444)
          .setDescription(acierto
            ? `✅ **¡Correcto, ${btn.user.username}!** La respuesta era **${preg.opts[correcto]}**.`
            : `❌ **Incorrecto, ${btn.user.username}.** La respuesta era **${preg.opts[correcto]}**.`
          )],
        flags: MessageFlags.Ephemeral
      });
    });

    collector.on('end', () => {
      const disRow = new ActionRowBuilder().addComponents(
        preg.opts.map((opt, i) =>
          new ButtonBuilder()
            .setCustomId(`trivia_done_${i}`)
            .setLabel(`${emojis[i]} ${opt}${i === preg.r ? ' ✅' : ''}`)
            .setStyle(i === preg.r ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(true)
        )
      );
      msg.edit({ components: [disRow] }).catch(() => {});
    });
  }
};
