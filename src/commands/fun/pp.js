const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pp')
    .setDescription('📏 Mide el tamaño del pp de alguien')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a medir (default: tú)')),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') ?? interaction.user;
    // Determinista por ID
    const size   = Number(BigInt(target.id) % 15n);
    const bar    = '8' + '='.repeat(size) + 'D';

    const nivel = size >= 13 ? '👑 Legendario'
                : size >= 10 ? '💪 Impresionante'
                : size >= 7  ? '😏 Decente'
                : size >= 4  ? '😐 Normal'
                :              '🔬 Microscópico';

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle(`📏 PP de ${target.username}`)
      .setDescription(`\`${bar}\``)
      .addFields(
        { name: '📐 Tamaño', value: `**${size} cm**`, inline: true },
        { name: '🏆 Nivel',  value: nivel,             inline: true },
      )
      .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

    await interaction.reply({ embeds: [embed] });
  }
};
