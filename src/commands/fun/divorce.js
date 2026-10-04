const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('divorce')
    .setDescription('💔 Divorciarte de tu pareja'),

  async execute(interaction) {
    try {
      const marr = db.get('marriages', interaction.user.id, null);

      if (!marr) return interaction.reply({ content: '❌ No estás casado/a.', flags: MessageFlags.Ephemeral });

      db.del('marriages', interaction.user.id);
      db.del('marriages', marr.partnerId);

      const since = Math.floor(marr.since / 1000);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('💔 Divorcio')
          .setDescription(`Te divorciaste de <@${marr.partnerId}>.`)
          .addFields({ name: '📅 Casados desde', value: `<t:${since}:R>` })
          .setFooter({ text: 'System 777 • jrsystem7777.com' })
          .setTimestamp()]
      });
    } catch (error) {
      console.error('[ERROR] divorce:', error);
      const reply = { content: '❌ Error interno del comando.', ephemeral: true };
      if (interaction.deferred) await interaction.editReply(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
  }
};
