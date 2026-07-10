const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('💘 Calcula la compatibilidad entre dos usuarios')
    .addUserOption(o => o.setName('usuario1').setDescription('Primer usuario').setRequired(true))
    .addUserOption(o => o.setName('usuario2').setDescription('Segundo usuario').setRequired(true)),

  async execute(interaction) {
    const u1 = interaction.options.getUser('usuario1');
    const u2 = interaction.options.getUser('usuario2');

    // Determinista: mismo par siempre da mismo %
    const seed  = (BigInt(u1.id) + BigInt(u2.id)) % 101n;
    const pct   = Number(seed);

    const bar   = '❤️'.repeat(Math.floor(pct / 10)) + '🖤'.repeat(10 - Math.floor(pct / 10));
    const color = pct >= 80 ? 0xFF69B4 : pct >= 50 ? 0xFF9900 : 0x5865F2;

    const nivel = pct >= 90 ? '💍 Almas gemelas'
                : pct >= 75 ? '💕 Muy compatibles'
                : pct >= 50 ? '💛 Buena onda'
                : pct >= 25 ? '🤔 Puede ser...'
                :             '💔 No se llevan';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('💘 Ship — Compatibilidad')
      .setDescription(`**${u1.username}** ❤️ **${u2.username}**\n\n${bar}`)
      .addFields(
        { name: '💯 Compatibilidad', value: `**${pct}%**`, inline: true },
        { name: '📊 Nivel',          value: nivel,          inline: true },
      )
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
