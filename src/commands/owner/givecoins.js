const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getBalance, addCoins, removeCoins } = require('../../systems/economy');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('givecoins')
    .setDescription('[OWNER] Da o quita monedas a un usuario')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addIntegerOption(o => o.setName('cantidad').setDescription('Monedas (negativo para quitar)').setRequired(true)),

  async execute(interaction) {
    const target   = interaction.options.getUser('usuario');
    const cantidad = interaction.options.getInteger('cantidad');

    let bal;
    if (cantidad >= 0) {
      bal = addCoins(target.id, cantidad);
    } else {
      bal = removeCoins(target.id, Math.abs(cantidad)) ?? getBalance(target.id);
    }

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(cantidad >= 0 ? 0x00FF88 : 0xFF4444)
        .setTitle(cantidad >= 0 ? '✅ Monedas Otorgadas' : '➖ Monedas Quitadas')
        .addFields(
          { name: '👤 Usuario',  value: target.toString(),                         inline: true },
          { name: '🪙 Cambio',   value: `${cantidad >= 0 ? '+' : ''}${cantidad}`,  inline: true },
          { name: '👛 Bolsillo', value: `${bal.coins.toLocaleString()} 🪙`,        inline: true },
        )
        .setFooter({ text: 'System 777 · Owner Only 👑' })],
      flags: MessageFlags.Ephemeral
    });
  }
};
