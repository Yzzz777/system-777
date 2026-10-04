const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('🪙 Lanza una moneda'),

  async execute(interaction) {
    try {
      const result = Math.random() < 0.5 ? '🦅 Cara' : '🔢 Cruz';
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xF5C518)
          .setTitle('🪙 Lanzamiento de Moneda')
          .setDescription(`## ${result}`)
          .setFooter({ text: `Pedido por ${interaction.user.tag} · System 777` })]
      });
    } catch (error) {
      console.error('[ERROR] coinflip:', error);
      const reply = { content: '❌ Error interno del comando.', ephemeral: true };
      if (interaction.deferred) await interaction.editReply(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
  }
};
