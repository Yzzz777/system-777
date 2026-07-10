const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getBalance, addCoins, removeCoins } = require('../../systems/economy');

const ROJOS  = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('🎡 Ruleta europea')
    .addIntegerOption(o => o.setName('apuesta').setDescription('Monedas').setRequired(true).setMinValue(10).setMaxValue(100000))
    .addStringOption(o => o.setName('tipo').setDescription('red/black/par/impar/número (0-36)').setRequired(true)),

  async execute(interaction) {
    const apuesta = interaction.options.getInteger('apuesta');
    const tipo    = interaction.options.getString('tipo').toLowerCase().trim();
    const bal     = getBalance(interaction.user.id);

    if (bal.coins < apuesta) return interaction.reply({ content: `❌ No tienes suficiente. Tienes **${bal.coins}** 🪙`, flags: MessageFlags.Ephemeral });

    // Girar ruleta
    const numero = Math.floor(Math.random() * 37); // 0-36
    const esRojo = ROJOS.includes(numero);
    const colorN = numero === 0 ? '🟢' : esRojo ? '🔴' : '⚫';

    let mult = 0;
    let desc = '';

    if (tipo === 'red' || tipo === 'rojo') {
      mult = esRojo && numero !== 0 ? 2 : 0;
      desc = `Apostaste al **rojo** 🔴`;
    } else if (tipo === 'black' || tipo === 'negro') {
      mult = !esRojo && numero !== 0 ? 2 : 0;
      desc = `Apostaste al **negro** ⚫`;
    } else if (tipo === 'par' || tipo === 'even') {
      mult = numero !== 0 && numero % 2 === 0 ? 2 : 0;
      desc = `Apostaste al **par**`;
    } else if (tipo === 'impar' || tipo === 'odd') {
      mult = numero % 2 !== 0 ? 2 : 0;
      desc = `Apostaste al **impar**`;
    } else if (/^\d+$/.test(tipo)) {
      const num = parseInt(tipo);
      if (num < 0 || num > 36) return interaction.reply({ content: '❌ Número entre 0 y 36.', flags: MessageFlags.Ephemeral });
      mult = numero === num ? 36 : 0;
      desc = `Apostaste al número **${num}** (x36 si acierta)`;
    } else {
      return interaction.reply({ content: '❌ Tipo inválido. Usa: `red`, `black`, `par`, `impar`, o un número 0-36.', flags: MessageFlags.Ephemeral });
    }

    removeCoins(interaction.user.id, apuesta);
    let ganancia = 0;
    if (mult > 0) { ganancia = apuesta * mult; addCoins(interaction.user.id, ganancia); }

    const neto  = ganancia - apuesta;
    const color = neto > 0 ? 0x00FF88 : neto === 0 ? 0xFFAA00 : 0xFF4444;

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(color)
        .setTitle('🎡 Ruleta')
        .setDescription(`${desc}\n\n## ${colorN} **${numero}** ${colorN}`)
        .addFields(
          { name: '💰 Apostado', value: `${apuesta} 🪙`,                                      inline: true },
          { name: neto >= 0 ? '📈 Ganancia' : '📉 Pérdida', value: `${neto >= 0 ? '+' : ''}${neto} 🪙`, inline: true },
          { name: '👛 Saldo',    value: `${getBalance(interaction.user.id).coins.toLocaleString()} 🪙`, inline: true },
        )
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })]
    });
  }
};
