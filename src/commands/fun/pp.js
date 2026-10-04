const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pp')
    .setDescription('📏 Mide el tamaño del pp de alguien')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario a medir (default: tú)')),

  async execute(interaction) {
    try {
      const target = interaction.options.getUser('usuario') ?? interaction.user;
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
        .setFooter({ text: 'System 777 • jrsystem7777.com' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[ERROR] pp:', error);
      const reply = { content: '❌ Error interno del comando.', ephemeral: true };
      if (interaction.deferred) await interaction.editReply(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
  }
};
