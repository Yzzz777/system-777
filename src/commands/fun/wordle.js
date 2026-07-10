const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const PALABRAS = [
  'PERRO','GATO','CASA','LUNA','SOL',
  'AGUA','FUEGO','TIERRA','AIRE','FLOR',
  'LIBRO','MESA','SILLA','CAMPO','CIUDAD',
  'ARBOL','PUERTO','MONTE','RIO','VALLE',
  'PLAYA','CIELO','NUBE','LLUVIA','NIEVE',
  'FELIZ','TRISTE','RAPIDO','CARINO','AMIGO',
  'PARED','VENTANA','PISO','TECHO','SALON',
  'JUEGO','CORAZON','MUSICA','DANZA','ARTE',
];

const MAX_INTENTOS = 6;

function generarFilas(letrasEstado) {
  const filas = [];
  const fila1 = 'QWERTYUIOP'.split('');
  const fila2 = 'ASDFGHJKL'.split('');
  const fila3 = 'ZXCVBNM'.split('');

  const estilo = (l) => {
    if (letrasEstado[l] === 'green') return ButtonStyle.Success;
    if (letrasEstado[l] === 'yellow') return ButtonStyle.Primary;
    if (letrasEstado[l] === 'gray') return ButtonStyle.Secondary;
    return ButtonStyle.Secondary;
  };

  filas.push(new ActionRowBuilder().addComponents(
    fila1.map(l => new ButtonBuilder().setCustomId(`w_${l}`).setLabel(l).setStyle(estilo(l)).setDisabled(!!letrasEstado[l]))
  ));
  filas.push(new ActionRowBuilder().addComponents(
    fila2.map(l => new ButtonBuilder().setCustomId(`w_${l}`).setLabel(l).setStyle(estilo(l)).setDisabled(!!letrasEstado[l]))
  ));
  filas.push(new ActionRowBuilder().addComponents(
    fila3.map(l => new ButtonBuilder().setCustomId(`w_${l}`).setLabel(l).setStyle(estilo(l)).setDisabled(!!letrasEstado[l]))
  ));
  return filas;
}

function evaluarGuess(palabra, guess) {
  const resultado = Array(5).fill('⬛');
  const palabraArr = palabra.split('');
  const guessArr = guess.split('');
  const usados = Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === palabraArr[i]) {
      resultado[i] = '🟩';
      usados[i] = true;
      palabraArr[i] = null;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (resultado[i] === '🟩') continue;
    const idx = palabraArr.indexOf(guessArr[i]);
    if (idx !== -1) {
      resultado[i] = '🟨';
      palabraArr[idx] = null;
    }
  }

  return resultado;
}

const partidas = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wordle')
    .setDescription('🟩🟨⬛ Juega Wordle en español'),

  async execute(interaction) {
    for (const [, game] of partidas) {
      if (game.jugadorId === interaction.user.id && !game.terminado) {
        return interaction.reply({ content: '❌ Ya tienes una partida activa.', flags: MessageFlags.Ephemeral });
      }
    }

    const palabra = PALABRAS[Math.floor(Math.random() * PALABRAS.length)].toUpperCase();
    const historial = [];
    const letrasEstado = {};
    let intentos = 0;

    const embed = () => new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🟩🟨⬛ Wordle — System 777')
      .setDescription(
        `Adivina la palabra de **5 letras**\n` +
        `Intentos: **${intentos}/${MAX_INTENTOS}**\n\n` +
        (historial.length > 0 ? historial.join('\n') : '_Escribe o usa los botones para adivinar..._')
      )
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    const filas = generarFilas(letrasEstado);
    const msg = await interaction.reply({ embeds: [embed()], components: filas, fetchReply: true });

    partidas.set(msg.id, {
      jugadorId: interaction.user.id,
      palabra,
      historial,
      letrasEstado,
      intentos,
      terminado: false,
    });

    const messageCollector = msg.channel.createMessageCollector({
      filter: m => m.author.id === interaction.user.id && m.content.length === 5 && /^[a-zA-Záéíóúñ]+$/.test(m.content),
      time: 180000,
    });

    const componentCollector = msg.createMessageComponentCollector({ time: 180000 });

    let inputActual = '';

    componentCollector.on('collect', async btn => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: '❌ Esta no es tu partida.', flags: MessageFlags.Ephemeral });
      }

      const game = partidas.get(msg.id);
      if (!game || game.terminado) {
        return btn.reply({ content: '❌ La partida ya terminó.', flags: MessageFlags.Ephemeral });
      }

      const letra = btn.customId.replace('w_', '');
      inputActual += letra;

      if (inputActual.length < 5) {
        return btn.reply({
          embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`📝 **${inputActual}**${'_'.repeat(5 - inputActual.length)}`)],
          flags: MessageFlags.Ephemeral,
        });
      }

      const guess = inputActual.toUpperCase();
      inputActual = '';

      await procesarGuess(guess, game, msg, componentCollector, messageCollector);
    });

    messageCollector.on('collect', async m => {
      const game = partidas.get(msg.id);
      if (!game || game.terminado) return;

      const guess = m.content.toUpperCase();
      if (guess.length !== 5) return;
      try { await m.delete(); } catch {}

      await procesarGuess(guess, game, msg, componentCollector, messageCollector);
    });

    async function procesarGuess(guess, game, msg, compCol, msgCol) {
      game.intentos++;
      const resultado = evaluarGuess(game.palabra, guess);
      const row = guess.split('').map((l, i) => `${resultado[i]}${l}`).join('');
      game.historial.push(row);

      for (let i = 0; i < 5; i++) {
        const l = guess[i];
        if (resultado[i] === '🟩') game.letrasEstado[l] = 'green';
        else if (resultado[i] === '🟨' && game.letrasEstado[l] !== 'green') game.letrasEstado[l] = 'yellow';
        else if (!game.letrasEstado[l]) game.letrasEstado[l] = 'gray';
      }

      const ganado = guess === game.palabra;
      const perdido = game.intentos >= MAX_INTENTOS;

      if (ganado || perdido) {
        game.terminado = true;
        compCol.stop();
        msgCol.stop();

        const finalEmbed = new EmbedBuilder()
          .setColor(ganado ? 0x00FF88 : 0xFF4444)
          .setTitle(ganado ? '🏆 ¡Ganaste!' : '💀 ¡Perdiste!')
          .setDescription(
            game.historial.join('\n') + '\n\n' +
            `La palabra era: **${game.palabra}**` +
            (ganado ? `\n¡En ${game.intentos} intento${game.intentos > 1 ? 's' : ''}!` : '')
          )
          .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

        partidas.delete(msg.id);
        return msg.update({ embeds: [finalEmbed], components: generarFilas(game.letrasEstado) });
      }

      await msg.update({ embeds: [embed()], components: generarFilas(game.letrasEstado) });
    }

    componentCollector.on('end', (_, reason) => {
      if (reason === 'time') {
        const game = partidas.get(msg.id);
        if (game) {
          game.terminado = true;
          partidas.delete(msg.id);
          msg.edit({
            embeds: [new EmbedBuilder()
              .setColor(0xFFAA00)
              .setTitle('⏰ Tiempo agotado')
              .setDescription(`La palabra era: **${game.palabra}**`)
              .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })],
            components: generarFilas(game.letrasEstado),
          }).catch(() => {});
        }
        messageCollector.stop();
      }
    });
  }
};
