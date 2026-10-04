const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slap').setDescription('👋 Cachetea a alguien')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)),
  async execute(interaction) {
    try {
      const target = interaction.options.getUser('usuario');
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xFF4444)
          .setDescription(`👋 ${interaction.user} le dio una cachetada a ${target} 😤`)
          .setImage('https://media.tenor.com/6LsQarDKhm8AAAAC/anime-slap.gif')
          .setFooter({ text: 'System 777 • jrsystem7777.com' })]
      });
    } catch (error) {
      console.error('[ERROR] slap:', error);
      const reply = { content: '❌ Error interno del comando.', ephemeral: true };
      if (interaction.deferred) await interaction.editReply(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
  }
};
