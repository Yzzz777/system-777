const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('📢 Hace que el bot diga algo')
    .addStringOption(o => o.setName('mensaje').setDescription('Mensaje').setRequired(true))
    .addChannelOption(o => o.setName('canal').setDescription('Canal destino (opcional)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const msg = interaction.options.getString('mensaje');
    const ch  = interaction.options.getChannel('canal') ?? interaction.channel;

    if (!ch?.isTextBased()) {
      return interaction.reply({ content: '❌ Canal inválido o no es de texto.', flags: MessageFlags.Ephemeral });
    }

    try {
      await ch.send(msg);
      await interaction.reply({ content: '✅ Mensaje enviado.', flags: MessageFlags.Ephemeral });
    } catch (e) {
      await interaction.reply({ content: `❌ No pude enviar: ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
