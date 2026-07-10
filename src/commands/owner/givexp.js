const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('givexp')
    .setDescription('[OWNER] Da o quita XP a un usuario')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addIntegerOption(o => o.setName('cantidad').setDescription('XP (negativo para quitar)').setRequired(true)),

  async execute(interaction) {
    const target   = interaction.options.getUser('usuario');
    const cantidad = interaction.options.getInteger('cantidad');
    const key      = `${target.id}_${interaction.guild.id}`;

    const data = db.get('levels', key, { xp: 0, level: 0, messages: 0 });
    data.xp    = Math.max(0, data.xp + cantidad);
    data.level = Math.floor(Math.sqrt(data.xp / 100));
    db.set('levels', key, data);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(cantidad >= 0 ? 0x00FF88 : 0xFF4444)
        .setTitle(cantidad >= 0 ? '✅ XP Otorgado' : '➖ XP Quitado')
        .addFields(
          { name: '👤 Usuario',  value: target.toString(),                    inline: true },
          { name: '✨ XP',       value: `${cantidad >= 0 ? '+' : ''}${cantidad}`, inline: true },
          { name: '📊 Total',    value: `${data.xp} XP · Nv.${data.level}`,  inline: true },
        )
        .setFooter({ text: 'System 777 · Owner Only 👑' })],
      flags: MessageFlags.Ephemeral
    });
  }
};
