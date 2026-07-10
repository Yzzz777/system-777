const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Elimina mensajes del canal')
    .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('usuario').setDescription('Filtrar por usuario'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  userPermissions: [PermissionFlagsBits.ManageMessages],

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const amount = interaction.options.getInteger('cantidad');
    const target = interaction.options.getUser('usuario');

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const filtered = target
      ? messages.filter(m => m.author.id === target.id).first(amount)
      : [...messages.values()].slice(0, amount);

    const deleted = await interaction.channel.bulkDelete(filtered, true);

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x00CCFF)
        .setDescription(`🗑️ ${deleted.size} mensajes eliminados${target ? ` de **${target.tag}**` : ''}.`)
        .setFooter({ text: 'System 777 · Developer 777' })]
    });
  }
};
