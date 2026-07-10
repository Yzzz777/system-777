const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const ADIVINANZAS = [
  { q: '¿Qué sube y nunca baja?', a: 'La edad' },
  { q: '¿Qué tiene dientes pero no puede comer?', a: 'Un peine' },
  { q: '¿Qué se puede romper sin tocarlo?', a: 'Un secreto' },
  { q: '¿Qué tiene manos pero no puede aplaudir?', a: 'Un reloj' },
  { q: '¿Qué tiene ojos pero no puede ver?', a: 'Una aguja' },
  { q: '¿Qué se puede llenar sin ser un vaso?', a: 'Un zapato' },
  { q: '¿Qué viaja por el mundo sin salir de su esquina?', a: 'Un sello' },
  { q: '¿Qué tiene un borde pero no tiene cabeza?', a: 'Una moneda' },
  { q: '¿Qué tiene patas pero no puede caminar?', a: 'Una mesa' },
  { q: '¿Qué se rompe cuando lo nombras?', a: 'El silencio' },
  { q: '¿Qué es tan grande que cabe en todo el mundo pero no pesa nada?', a: 'El aire' },
  { q: '¿Qué corre pero no tiene piernas?', a: 'El agua' },
  { q: '¿Qué se duplica cada vez que lo partes?', a: 'El número 8' },
  { q: '¿Qué puede llenar una habitación sin ocupar espacio?', a: 'La luz' },
  { q: '¿Qué tiene cuello pero no tiene cabeza?', a: 'Una botella' },
  { q: '¿Qué tiene largo pero no es una serpiente?', a: 'Un camino' },
  { q: '¿Qué tiene orejas pero no puede escuchar?', a: 'Una planta' },
  { q: '¿Qué se levanta más alto cuanto más lo empujas?', a: 'Un globo' },
];

const EMOJIS = ['🇦','🇧','🇨','🇩'];
const COLORES = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary];

const partidas = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('riddles')
    .setDescription('🧩 Adivinanzas interactivas con botones'),

  async execute(interaction) {
    const adivinanza = ADIVINANZAS[Math.floor(Math.random() * ADIVINANZAS.length)];

    const opciones = [adivinanza.a];
    const respuestasIncorrectas = ADIVINANZAS
      .filter(a => a.a !== adivinanza.a)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(a => a.a);
    opciones.push(...respuestasIncorrectas);

    for (let i = opciones.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
    }

    const correctIdx = opciones.indexOf(adivinanza.a);

    const row = new ActionRowBuilder().addComponents(
      opciones.map((opt, i) =>
        new ButtonBuilder()
          .setCustomId(`riddle_${i}_${correctIdx}`)
          .setLabel(`${EMOJIS[i]} ${opt}`)
          .setStyle(COLORES[i])
      )
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🧩 Adivinanza — System 777')
      .setDescription(`**${adivinanza.q}**`)
      .setFooter({ text: '30 segundos · System 777 · Dev: 777 · IG: @yzz.yzx' });

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const ganadores = new Set();
    const respondidos = new Set();

    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async btn => {
      if (respondidos.has(btn.user.id)) {
        return btn.reply({ content: '❌ Ya respondiste.', flags: MessageFlags.Ephemeral });
      }
      respondidos.add(btn.user.id);

      const [, elegidoStr, correctoStr] = btn.customId.split('_');
      const elegido = parseInt(elegidoStr);
      const correcto = parseInt(correctoStr);
      const acierto = elegido === correcto;

      if (acierto) ganadores.add(btn.user.username);

      await btn.reply({
        embeds: [new EmbedBuilder()
          .setColor(acierto ? 0x00FF88 : 0xFF4444)
          .setDescription(
            acierto
              ? `✅ **¡Correcto, ${btn.user.username}!** La respuesta era **${adivinanza.a}**.`
              : `❌ **Incorrecto, ${btn.user.username}.** La respuesta era **${adivinanza.a}**.`
          )],
        flags: MessageFlags.Ephemeral
      });
    });

    collector.on('end', () => {
      const finalEmbed = new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('🧩 Resultado — Adivinanza')
        .setDescription(
          `**${adivinanza.q}**\n\n` +
          `**Respuesta:** ${adivinanza.a}\n\n` +
          (ganadores.size > 0
            ? `🏆 **Ganadores:** ${[...ganadores].join(', ')}`
            : '🏆 Nadie acertó esta vez.')
        )
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

      const disRow = new ActionRowBuilder().addComponents(
        opciones.map((opt, i) =>
          new ButtonBuilder()
            .setCustomId(`riddle_done_${i}`)
            .setLabel(`${EMOJIS[i]} ${opt}${i === correctIdx ? ' ✅' : ''}`)
            .setStyle(i === correctIdx ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(true)
        )
      );

      msg.edit({ embeds: [finalEmbed], components: [disRow] }).catch(() => {});
    });
  }
};
