const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getBalance, addCoins, removeCoins } = require('../../systems/economy');

const PALOS = ['♠️','♥️','♦️','♣️'];
const VALS  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function nuevaBaraja() {
  const b = [];
  for (const p of PALOS) for (const v of VALS) b.push({ v, p });
  return b.sort(() => Math.random() - 0.5);
}

function valor(carta) {
  if (['J','Q','K'].includes(carta.v)) return 10;
  if (carta.v === 'A') return 11;
  return parseInt(carta.v);
}

function sumar(mano) {
  let total = mano.reduce((s, c) => s + valor(c), 0);
  let ases  = mano.filter(c => c.v === 'A').length;
  while (total > 21 && ases > 0) { total -= 10; ases--; }
  return total;
}

function mostrar(mano) {
  return mano.map(c => `${c.v}${c.p}`).join(' ');
}

const partidas = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('🃏 Juega Blackjack contra el bot')
    .addIntegerOption(o => o.setName('apuesta').setDescription('Monedas a apostar').setRequired(true).setMinValue(10).setMaxValue(50000)),

  async execute(interaction) {
    const apuesta = interaction.options.getInteger('apuesta');
    const bal     = getBalance(interaction.user.id);

    if (bal.coins < apuesta) return interaction.reply({ content: `❌ No tienes suficiente. Tienes **${bal.coins}** 🪙`, flags: MessageFlags.Ephemeral });

    removeCoins(interaction.user.id, apuesta);

    const baraja = nuevaBaraja();
    const jugador = [baraja.pop(), baraja.pop()];
    const crupier = [baraja.pop(), baraja.pop()];
    partidas.set(interaction.user.id, { baraja, jugador, crupier, apuesta });

    const pj = sumar(jugador);

    const embed = () => new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle('🃏 Blackjack')
      .addFields(
        { name: `🧑 Tu mano (${pj})`,    value: mostrar(jugador), inline: true },
        { name: `🤖 Crupier`,            value: `${mostrar([crupier[0]])} 🂠`, inline: true },
        { name: '💰 Apuesta',            value: `${apuesta} 🪙`,  inline: true },
      )
      .setFooter({ text: 'System 777 · Blackjack' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${interaction.user.id}`).setLabel('➕ Pedir').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_stand_${interaction.user.id}`).setLabel('✋ Plantarse').setStyle(ButtonStyle.Danger),
    );

    if (pj === 21) {
      const ganancia = Math.floor(apuesta * 2.5);
      addCoins(interaction.user.id, ganancia);
      partidas.delete(interaction.user.id);
      return interaction.reply({
        embeds: [embed().setColor(0xFFD700).setTitle('🃏 ¡BLACKJACK! 🎉')
          .addFields({ name: '🏆 Ganancia', value: `+${ganancia - apuesta} 🪙 (x2.5)` })],
      });
    }

    await interaction.reply({ embeds: [embed()], components: [row] });
  }
};

// Exportar handler para interactionCreate
module.exports.handleButton = async (interaction, client) => {
  const [, action, userId] = interaction.customId.split('_');
  if (interaction.user.id !== userId) return interaction.reply({ content: '❌ No es tu partida.', flags: MessageFlags.Ephemeral });

  const game = partidas.get(userId);
  if (!game) return interaction.reply({ content: '❌ Partida no encontrada. Inicia una nueva.', flags: MessageFlags.Ephemeral });

  const { baraja, jugador, crupier, apuesta } = game;

  if (action === 'hit') {
    jugador.push(baraja.pop());
    const pj = sumar(jugador);

    if (pj > 21) {
      partidas.delete(userId);
      return interaction.update({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setTitle('🃏 Te pasaste — Perdiste')
          .addFields(
            { name: `🧑 Tu mano (${pj})`, value: mostrar(jugador), inline: true },
            { name: '💸 Perdiste',         value: `${apuesta} 🪙`,  inline: true },
          ).setFooter({ text: 'System 777 · Blackjack' })],
        components: []
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${userId}`).setLabel('➕ Pedir').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_stand_${userId}`).setLabel('✋ Plantarse').setStyle(ButtonStyle.Danger),
    );

    return interaction.update({
      embeds: [new EmbedBuilder().setColor(0x2B2D31).setTitle('🃏 Blackjack')
        .addFields(
          { name: `🧑 Tu mano (${pj})`, value: mostrar(jugador), inline: true },
          { name: '🤖 Crupier',         value: `${mostrar([crupier[0]])} 🂠`, inline: true },
          { name: '💰 Apuesta',         value: `${apuesta} 🪙`, inline: true },
        ).setFooter({ text: 'System 777 · Blackjack' })],
      components: [row]
    });
  }

  if (action === 'stand') {
    // Crupier juega: pide hasta 17
    while (sumar(crupier) < 17) crupier.push(baraja.pop());
    partidas.delete(userId);

    const pj = sumar(jugador);
    const pc = sumar(crupier);

    let color, titulo, ganancia;
    if (pc > 21 || pj > pc) {
      ganancia = apuesta * 2;
      addCoins(userId, ganancia);
      color = 0x00FF88; titulo = '🏆 ¡Ganaste!';
    } else if (pj === pc) {
      ganancia = apuesta;
      addCoins(userId, ganancia);
      color = 0xFFAA00; titulo = '🤝 Empate';
    } else {
      ganancia = 0;
      color = 0xFF4444; titulo = '💔 Perdiste';
    }

    return interaction.update({
      embeds: [new EmbedBuilder().setColor(color).setTitle(`🃏 ${titulo}`)
        .addFields(
          { name: `🧑 Tu mano (${pj})`,     value: mostrar(jugador), inline: true },
          { name: `🤖 Crupier (${pc})`,      value: mostrar(crupier), inline: true },
          { name: ganancia > apuesta ? '💰 Ganancia' : ganancia === apuesta ? '💫 Devuelto' : '💸 Perdiste',
            value: `${ganancia > 0 ? '+' : ''}${ganancia - apuesta} 🪙`, inline: true },
        ).setFooter({ text: 'System 777 · Blackjack' })],
      components: []
    });
  }
};
