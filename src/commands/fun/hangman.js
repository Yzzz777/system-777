const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const PALABRAS = [
  'murcielago','elefante','mariposa','canguro','delfin',
  'tortuga','serpiente','jirafa','pinguino','cocodrilo',
  'cebra','rinoceronte','ballena','tiburon','loro',
  'puma','águila','cabra','burro','toro',
  'mono','leopardo','guepardo','foca','bisonte',
];

const PARTES = ['🦵','🦵','💪','💪','👀','😱'];
const MAX_ERRORES = PARTES.length;

function generarFilas() {
  const filas = [];
  const alfabeto = 'ABCDEFGHIJKLM'.split('');
  const segunda = 'NOPQRSTUVWXYZ'.split('');

  filas.push(new ActionRowBuilder().addComponents(
    alfabeto.map(l => new ButtonBuilder().setCustomId(`hm_${l}`).setLabel(l).setStyle(ButtonStyle.Secondary))
  ));
  filas.push(new ActionRowBuilder().addComponents(
    segunda.map(l => new ButtonBuilder().setCustomId(`hm_${l}`).setLabel(l).setStyle(ButtonStyle.Secondary))
  ));
  return filas;
}

function dibujarAhorcado(errores) {
  if (errores === 0) return '⬜';
  return PARTES.slice(0, errores).join('');
}

function buscarPartida(interaction, partidas) {
  for (const [id, game] of partidas) {
    if (game.jugadorId === interaction.user.id && !game.terminado) return id;
  }
  return null;
}

const partidas = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('💀 Juega al Ahorcado'),

  async execute(interaction) {
    const existente = buscarPartida(interaction, partidas);
    if (existente) return interaction.reply({ content: '❌ Ya tienes una partida activa.', flags: MessageFlags.Ephemeral });

    const palabra = PALABRAS[Math.floor(Math.random() * PALABRAS.length)].toUpperCase();
    const estado = Array(palabra.length).fill('＿');
    const usadas = new Set();
    let errores = 0;

    const embed = () => new EmbedBuilder()
      .setColor(errores >= MAX_ERRORES ? 0xFF4444 : 0x00FF88)
      .setTitle('💀 Ahorcado — System 777')
      .setDescription(
        `**Palabra:** ${estado.join(' ')}\n\n` +
        `**Ahorcado:** ${dibujarAhorcado(errores)}\n` +
        `**Errores:** ${errores}/${MAX_ERRORES}\n` +
        `**Letras usadas:** ${usadas.size > 0 ? [...usadas].join(', ') : 'Ninguna'}`
      )
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    const filas = generarFilas();
    const msg = await interaction.reply({ embeds: [embed()], components: filas, fetchReply: true });

    const collector = msg.createMessageComponentCollector({ time: 180000 });

    partidas.set(msg.id, {
      jugadorId: interaction.user.id,
      palabra,
      estado,
      usadas,
      errores,
      terminado: false,
    });

    collector.on('collect', async btn => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: '❌ Esta no es tu partida.', flags: MessageFlags.Ephemeral });
      }

      const game = partidas.get(msg.id);
      if (!game || game.terminado) {
        return btn.reply({ content: '❌ La partida ya terminó.', flags: MessageFlags.Ephemeral });
      }

      const letra = btn.customId.replace('hm_', '');

      if (game.usadas.has(letra)) {
        return btn.reply({ content: `❌ Ya usaste la letra **${letra}**.`, flags: MessageFlags.Ephemeral });
      }

      game.usadas.add(letra);
      const deshabilitarBtn = msg.components.flatMap(r => r.components).find(c => c.customId === btn.customId);
      if (deshabilitarBtn) {
        const filaIdx = msg.components.findIndex(r => r.components.some(c => c.customId === btn.customId));
        const colIdx = msg.components[filaIdx].components.findIndex(c => c.customId === btn.customId);
        msg.components[filaIdx].components[colIdx].setDisabled(true);
      }

      let acerto = false;
      for (let i = 0; i < game.palabra.length; i++) {
        if (game.palabra[i] === letra) {
          game.estado[i] = letra;
          acerto = true;
        }
      }

      if (!acerto) game.errores++;

      const ganado = game.estado.every(e => e !== '＿');
      const perdido = game.errores >= MAX_ERRORES;

      if (ganado || perdido) {
        game.terminado = true;
        collector.stop();
        partidas.delete(msg.id);

        const finalEmbed = new EmbedBuilder()
          .setColor(ganado ? 0x00FF88 : 0xFF4444)
          .setTitle(ganado ? '🏆 ¡Ganaste!' : '💀 ¡Ahorcado!')
          .setDescription(
            `La palabra era: **${game.palabra}**\n\n` +
            `${game.estado.join(' ')}\n\n` +
            `${ganado ? '¡Felicidades!' : '¡Mejor suerte la próxima vez!'}`
          )
          .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

        return btn.update({
          embeds: [finalEmbed],
          components: msg.components.map(r => {
            const newRow = ActionRowBuilder.from(r);
            newRow.components.forEach(c => c.setDisabled(true));
            return newRow;
          })
        });
      }

      await btn.update({ embeds: [embed()], components: msg.components });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && partidas.has(msg.id)) {
        const game = partidas.get(msg.id);
        game.terminado = true;
        partidas.delete(msg.id);
        msg.edit({
          embeds: [new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle('⏰ Tiempo agotado')
            .setDescription(`La palabra era: **${game.palabra}**`)
            .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })],
          components: msg.components.map(r => {
            const newRow = ActionRowBuilder.from(r);
            newRow.components.forEach(c => c.setDisabled(true));
            return newRow;
          })
        }).catch(() => {});
      }
    });
  }
};
