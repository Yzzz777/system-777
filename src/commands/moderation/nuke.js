const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('💥 Recrea el canal limpiando TODOS los mensajes')
    .addStringOption(o => o.setName('razon').setDescription('Razón'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  userPermissions: [PermissionFlagsBits.ManageChannels],

  async execute(interaction) {
    const reason  = interaction.options.getString('razon') || 'Nuke por moderador';
    const channel = interaction.channel;

    await interaction.reply({ content: '💥 Nukeando canal...', flags: MessageFlags.Ephemeral });

    const newChannel = await channel.clone({ reason: `Nuke: ${reason} | ${interaction.user.tag}` });
    await newChannel.setPosition(channel.position);
    await channel.delete(`Nuke: ${reason}`);

    await newChannel.send({
      embeds: [new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('💥 Canal Nukeado')
        .setDescription(`Este canal fue recreado por **${interaction.user.tag}**.\n**Razón:** ${reason}`)
        .setFooter({ text: 'System 777 · Developer 777' })
        .setTimestamp()]
    });
  }
};
