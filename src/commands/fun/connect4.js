const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const FILAS = 6;
const COLS = 7;

function crearTablero() {
  return Array(FILAS).fill(null).map(() => Array(COLS).fill(null));
}

function renderizarTablero(tablero, turno, disabled) {
  const filas = [];
  for (let r = 0; r < FILAS; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < COLS; c++) {
      const val = tablero[r][c];
      let label, style;
      if (val === 1) { label = '🔴'; style = ButtonStyle.Danger; }
      else if (val === 2) { label = '🟡'; style = ButtonStyle.Primary; }
      else { label = '⬜'; style = ButtonStyle.Secondary; }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`c4_${r}_${c}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled || !!val)
      );
    }
    filas.push(row);
  }
  return filas;
}

function verificarGanador(tablero) {
  for (let r = 0; r < FILAS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const val = tablero[r][c];
      if (val && val === tablero[r][c+1] && val === tablero[r][c+2] && val === tablero[r][c+3]) return val;
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= FILAS - 4; r++) {
      const val = tablero[r][c];
      if (val && val === tablero[r+1][c] && val === tablero[r+2][c] && val === tablero[r+3][c]) return val;
    }
  }
  for (let r = 0; r <= FILAS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const val = tablero[r][c];
      if (val && val === tablero[r+1][c+1] && val === tablero[r+2][c+2] && val === tablero[r+3][c+3]) return val;
    }
  }
  for (let r = 3; r < FILAS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const val = tablero[r][c];
      if (val && val === tablero[r-1][c+1] && val === tablero[r-2][c+2] && val === tablero[r-3][c+3]) return val;
    }
  }
  return null;
}

function tableroLleno(tablero) {
  return tablero[0].every(cell => cell !== null);
}

const partidas = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('connect4')
    .setDescription('🔴🟡 Conecta 4 contra otro jugador')
    .addUserOption(o => o.setName('rival').setDescription('Jugador rival').setRequired(true)),

  async execute(interaction) {
    const rival = interaction.options.getUser('rival');
    if (rival.id === interaction.user.id) return interaction.reply({ content: '❌ No puedes jugar contra ti mismo.', flags: MessageFlags.Ephemeral });
    if (rival.bot) return interaction.reply({ content: '❌ Los bots no juegan Connect 4.', flags: MessageFlags.Ephemeral });

    const tablero = crearTablero();
    let turno = 1;
    const jugadores = { 1: interaction.user.id, 2: rival.id };

    const embed = () => new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔴🟡 Connect 4 — System 777')
      .setDescription(
        `🔴 **${interaction.user.username}** vs 🟡 **${rival.username}**\n\n` +
        `Turno: <@${jugadores[turno]}> (${turno === 1 ? '🔴' : '🟡'})`
      )
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    const filas = renderizarTablero(tablero, turno, false);
    const msg = await interaction.reply({ embeds: [embed()], components: filas, fetchReply: true });

    partidas.set(msg.id, { tablero, turno, jugadores, terminado: false });

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async btn => {
      if (btn.user.id !== jugadores[turno]) {
        return btn.reply({ content: `❌ No es tu turno. Espera a <@${jugadores[turno]}>.`, flags: MessageFlags.Ephemeral });
      }

      const game = partidas.get(msg.id);
      if (!game || game.terminado) {
        return btn.reply({ content: '❌ La partida ya terminó.', flags: MessageFlags.Ephemeral });
      }

      const [, rStr, cStr] = btn.customId.split('_');
      const r = parseInt(rStr);
      const c = parseInt(cStr);

      if (game.tablero[r][c] !== null) {
        return btn.reply({ content: '❌ Casilla ocupada.', flags: MessageFlags.Ephemeral });
      }

      let dropRow = -1;
      for (let row = FILAS - 1; row >= 0; row--) {
        if (game.tablero[row][c] === null) {
          dropRow = row;
          break;
        }
      }

      if (dropRow === -1) return btn.reply({ content: '❌ Columna llena.', flags: MessageFlags.Ephemeral });

      game.tablero[dropRow][c] = game.turno;

      const ganador = verificarGanador(game.tablero);
      const lleno = tableroLleno(game.tablero);

      if (ganador || lleno) {
        game.terminado = true;
        collector.stop();
        partidas.delete(msg.id);

        const ganadorUser = game.jugadores[ganador];
        const nombreGanador = ganador === 1 ? interaction.user.username : rival.username;
        const emoji = ganador === 1 ? '🔴' : '🟡';

        const finalEmbed = new EmbedBuilder()
          .setColor(ganador ? 0x00FF88 : 0xFFAA00)
          .setTitle(ganador ? '🏆 ¡Ganó Connect 4!' : '🤝 Empate')
          .setDescription(
            ganador
              ? `${emoji} **¡${nombreGanador} ganó!**`
              : '¡El tablero se llenó sin ganador!'
          )
          .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

        return btn.update({
          embeds: [finalEmbed],
          components: renderizarTablero(game.tablero, game.turno, true)
        });
      }

      game.turno = game.turno === 1 ? 2 : 1;
      await btn.update({ embeds: [embed()], components: renderizarTablero(game.tablero, game.turno, false) });
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
            .setDescription('La partida terminó por inactividad.')
            .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })],
          components: renderizarTablero(game.tablero, game.turno, true)
        }).catch(() => {});
      }
    });
  }
};
