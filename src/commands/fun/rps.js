const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const OPTS = ['🪨 Piedra', '📄 Papel', '✂️ Tijeras'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('✊ Piedra, papel o tijeras contra el bot')
    .addStringOption(o => o.setName('eleccion').setDescription('Elige').setRequired(true).addChoices(
      { name: '🪨 Piedra',  value: '0' },
      { name: '📄 Papel',   value: '1' },
      { name: '✂️ Tijeras', value: '2' },
    )),

  async execute(interaction) {
    const player = parseInt(interaction.options.getString('eleccion'));
    const bot    = Math.floor(Math.random() * 3);

    let result, color;
    if (player === bot)               { result = '🤝 Empate'; color = 0xFFCC00; }
    else if ((player - bot + 3) % 3 === 1) { result = '🏆 ¡Ganaste!'; color = 0x00FF88; }
    else                              { result = '💀 Perdiste'; color = 0xFF4444; }

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(color)
        .setTitle('✊ Piedra, Papel o Tijeras')
        .addFields(
          { name: 'Tú',    value: OPTS[player], inline: true },
          { name: 'Bot',   value: OPTS[bot],    inline: true },
          { name: 'Resultado', value: `## ${result}` }
        )
        .setFooter({ text: 'System 777 · Developer 777' })]
    });
  }
};
