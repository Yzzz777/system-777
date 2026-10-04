const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

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
      embeds: [errorEmbed('💥 Canal Nukeado', `Este canal fue recreado por **${interaction.user.tag}**.\n**Razón:** ${reason}`)]
    });
  }
};
