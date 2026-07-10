const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('divorce')
    .setDescription('💔 Divorciarte de tu pareja'),

  async execute(interaction) {
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
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
        .setTimestamp()]
    });
  }
};
