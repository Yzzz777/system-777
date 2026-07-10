const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const partidas = new Map();

function tablero(celdas, ganador) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const i   = r * 3 + c;
      const val = celdas[i];
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt_${i}`)
          .setLabel(val || '⬜')
          .setStyle(val === '❌' ? ButtonStyle.Danger : val === '⭕' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(!!val || !!ganador)
      );
    }
    rows.push(row);
  }
  return rows;
}

function checkGanador(celdas) {
  const combos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of combos) {
    if (celdas[a] && celdas[a] === celdas[b] && celdas[a] === celdas[c]) return celdas[a];
  }
  if (celdas.every(Boolean)) return 'empate';
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('❌⭕ Juega Tres en Raya')
    .addUserOption(o => o.setName('usuario').setDescription('Rival').setRequired(true)),

  async execute(interaction) {
    const rival = interaction.options.getUser('usuario');
    if (rival.id === interaction.user.id) return interaction.reply({ content: '❌ No puedes jugar contra ti mismo.', flags: MessageFlags.Ephemeral });
    if (rival.bot) return interaction.reply({ content: '❌ Los bots no juegan TTT.', flags: MessageFlags.Ephemeral });

    const celdas = Array(9).fill(null);
    const jugadores = { '❌': interaction.user.id, '⭕': rival.id };
    let turno = '❌';

    const embed = () => new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('❌⭕ Tres en Raya')
      .setDescription(`Turno de <@${jugadores[turno]}> (${turno})`)
      .setFooter({ text: 'System 777 · Dev: 777' });

    const msg = await interaction.reply({ embeds: [embed()], components: tablero(celdas, null), fetchReply: true });

    const collector = msg.createMessageComponentCollector({ time: 120000 });
    partidas.set(msg.id, true);

    collector.on('collect', async btn => {
      if (btn.user.id !== jugadores[turno]) {
        return btn.reply({ content: `❌ No es tu turno. Espera a que ${turno === '❌' ? interaction.user.username : rival.username} juegue.`, flags: MessageFlags.Ephemeral });
      }

      const i = parseInt(btn.customId.replace('ttt_', ''));
      if (celdas[i]) return btn.reply({ content: '❌ Casilla ocupada.', flags: MessageFlags.Ephemeral });

      celdas[i] = turno;
      const res = checkGanador(celdas);

      if (res) {
        collector.stop();
        partidas.delete(msg.id);
        const finalEmbed = new EmbedBuilder()
          .setColor(res === 'empate' ? 0xFFAA00 : 0x00FF88)
          .setTitle(res === 'empate' ? '🤝 Empate' : `🏆 ¡Ganó ${res}!`)
          .setDescription(res === 'empate' ? 'Nadie ganó esta vez.' : `¡Felicidades <@${jugadores[res]}>!`)
          .setFooter({ text: 'System 777 · Dev: 777' });
        return btn.update({ embeds: [finalEmbed], components: tablero(celdas, res) });
      }

      turno = turno === '❌' ? '⭕' : '❌';
      await btn.update({ embeds: [embed()], components: tablero(celdas, null) });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && partidas.has(msg.id)) {
        partidas.delete(msg.id);
        msg.edit({ components: tablero(celdas, 'timeout') }).catch(() => {});
      }
    });
  }
};
