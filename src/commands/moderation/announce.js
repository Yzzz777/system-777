const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('📢 Crea un anuncio con embed personalizado')
    .addStringOption(o => o.setName('titulo').setDescription('Título del anuncio').setRequired(true))
    .addStringOption(o => o.setName('mensaje').setDescription('Contenido del anuncio').setRequired(true))
    .addChannelOption(o => o.setName('canal').setDescription('Canal destino (default: este)'))
    .addStringOption(o => o.setName('color').setDescription('Color hex (ej: FF0000). Default: dorado'))
    .addStringOption(o => o.setName('imagen').setDescription('URL de imagen'))
    .addRoleOption(o => o.setName('ping').setDescription('Rol a mencionar'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  userPermissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction) {
    const titulo  = interaction.options.getString('titulo');
    const mensaje = interaction.options.getString('mensaje');
    const canal   = interaction.options.getChannel('canal') ?? interaction.channel;
    const hexStr  = interaction.options.getString('color')?.replace('#','') ?? 'F5C518';
    const imagen  = interaction.options.getString('imagen');
    const pingRol = interaction.options.getRole('ping');

    const color = parseInt(hexStr, 16) || 0xF5C518;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`📢 ${titulo}`)
      .setDescription(mensaje)
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ size: 64 }) })
      .setFooter({ text: `System 777 · Anuncio por ${interaction.user.tag}` })
      .setTimestamp();

    if (imagen) embed.setImage(imagen);

    const content = pingRol ? `${pingRol}` : undefined;

    try {
      await canal.send({ content, embeds: [embed], allowedMentions: { roles: pingRol ? [pingRol.id] : [] } });
      await interaction.reply({ content: `✅ Anuncio enviado en ${canal}.`, flags: MessageFlags.Ephemeral });
    } catch (e) {
      await interaction.reply({ content: `❌ No pude enviar al canal: ${e.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
