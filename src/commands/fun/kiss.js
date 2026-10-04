const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kiss').setDescription('💋 Besa a alguien')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)),
  async execute(interaction) {
    try {
      const target = interaction.options.getUser('usuario');
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xFF69B4)
          .setDescription(`💋 ${interaction.user} le dio un beso a ${target}`)
          .setImage('https://media.tenor.com/t_-FeRFB4LMAAAAC/anime-kiss.gif')
          .setFooter({ text: 'System 777 • jrsystem7777.com' })]
      });
    } catch (error) {
      console.error('[ERROR] kiss:', error);
      const reply = { content: '❌ Error interno del comando.', ephemeral: true };
      if (interaction.deferred) await interaction.editReply(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
  }
};
