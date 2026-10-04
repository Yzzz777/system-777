const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/db');
const { FOOTER_BASE } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('📢 Crea un anuncio con embed personalizado')
    .addStringOption(o => o.setName('titulo').setDescription('Título del anuncio').setRequired(true))
    .addStringOption(o => o.setName('mensaje').setDescription('Contenido del anuncio (soporta emojis y markdown)').setRequired(true))
    .addChannelOption(o => o.setName('canal').setDescription('Canal destino (default: este)'))
    .addStringOption(o => o.setName('color').setDescription('Color hex (ej: FF0000). Default: dorado'))
    .addStringOption(o => o.setName('imagen').setDescription('URL de imagen banner'))
    .addStringOption(o => o.setName('thumbnail').setDescription('URL de imagen miniatura (esquina)'))
    .addStringOption(o => o.setName('footer').setDescription('Texto del pie de página'))
    .addRoleOption(o => o.setName('ping').setDescription('Rol a mencionar'))
    .addBooleanOption(o => o.setName('everyone').setDescription('Mencionar @everyone'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  userPermissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction) {
    const titulo    = interaction.options.getString('titulo');
    const mensaje   = interaction.options.getString('mensaje');
    const canal     = interaction.options.getChannel('canal') ?? interaction.channel;
    const hexStr    = interaction.options.getString('color')?.replace('#','') ?? 'F5C518';
    const imagen    = interaction.options.getString('imagen');
    const thumbnail = interaction.options.getString('thumbnail');
    const footer    = interaction.options.getString('footer');
    const pingRol   = interaction.options.getRole('ping');
    const everyone  = interaction.options.getBoolean('everyone') ?? false;

    const color = parseInt(hexStr, 16) || 0xF5C518;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(titulo)
      .setDescription(mensaje)
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ size: 64 }) })
      .setFooter({ text: footer || `${FOOTER_BASE} · Anuncio por ${interaction.user.tag}` })
      .setTimestamp();

    if (imagen) embed.setImage(imagen);
    if (thumbnail) embed.setThumbnail(thumbnail);

    let content;
    const allowedRoles = [];
    if (pingRol) { content = `${pingRol}`; allowedRoles.push(pingRol.id); }
    if (everyone) { content = (content || '') + ' @everyone'; }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await canal.send({
        content: content || undefined,
        embeds: [embed],
        allowedMentions: { roles: allowedRoles, parse: everyone ? ['everyone'] : [] },
      });
      db.logActivity(interaction.guild.id, { actionType: 'other', userId: interaction.user.id, details: `Anuncio enviado en #${canal.name}: ${titulo}` });
      await interaction.editReply({ content: `✅ Anuncio enviado en ${canal}.` });
    } catch (e) {
      await interaction.editReply({ content: `❌ No pude enviar al canal: ${e.message}` });
    }
  }
};
