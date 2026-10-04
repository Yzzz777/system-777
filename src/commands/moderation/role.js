const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('🎭 Gestión de roles')
    .addSubcommand(s => s
      .setName('add')
      .setDescription('➕ Da un rol a un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addRoleOption(o => o.setName('rol').setDescription('Rol a asignar').setRequired(true))
    )
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('➖ Quita un rol a un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addRoleOption(o => o.setName('rol').setDescription('Rol a quitar').setRequired(true))
    )
    .addSubcommand(s => s
      .setName('info')
      .setDescription('ℹ️ Info de un rol')
      .addRoleOption(o => o.setName('rol').setDescription('Rol').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const sub    = interaction.options.getSubcommand();
    const ownerId = process.env.OWNER_ID || client.application?.owner?.id;

    // Solo owner del bot, owner del servidor o admins
    const isOwnerBot    = interaction.user.id === ownerId;
    const isOwnerServer = interaction.guild.ownerId === interaction.user.id;
    const isAdmin       = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwnerBot && !isOwnerServer && !isAdmin) {
      return interaction.reply({
        embeds: [errorEmbed('🔒 Sin Permiso', 'Solo el **dueño del bot**, **dueño del servidor** o **administradores** pueden gestionar roles.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'info') {
      const rol = interaction.options.getRole('rol');
      const embed = infoEmbed(`🎭 Rol: ${rol.name}`, null, {
        color: rol.color || undefined,
        fields: [
          { name: '🆔 ID',          value: rol.id,                                      inline: true },
          { name: '👥 Miembros',    value: `${rol.members.size}`,                       inline: true },
          { name: '📍 Posición',    value: `${rol.position}`,                           inline: true },
          { name: '🎨 Color',       value: rol.hexColor,                                inline: true },
          { name: '📌 Mencionable', value: rol.mentionable ? 'Sí' : 'No',              inline: true },
          { name: '📎 Separado',    value: rol.hoist ? 'Sí' : 'No',                    inline: true },
          { name: '🛡️ Permisos',   value: rol.permissions.has(PermissionFlagsBits.Administrator) ? 'Administrador' : 'Limitados', inline: true },
          { name: '📅 Creado',      value: `<t:${Math.floor(rol.createdTimestamp / 1000)}:R>`, inline: true },
        ]
      });
      return interaction.reply({ embeds: [embed] });
    }

    const target = interaction.options.getUser('usuario');
    const rol    = interaction.options.getRole('rol');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '❌ Usuario no encontrado en el servidor.', flags: MessageFlags.Ephemeral });
    }

    // El bot no puede manejar roles por encima del suyo
    const botMember = interaction.guild.members.me;
    if (rol.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: `❌ No puedo gestionar el rol **${rol.name}** porque está por encima (o igual) al mío en la jerarquía.\n> Ve a Configuración → Roles y sube el rol de **System 777** más arriba.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // El ejecutor no puede dar roles por encima del suyo (excepto owner del bot/servidor)
    if (!isOwnerBot && !isOwnerServer) {
      if (rol.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          content: `❌ No puedes gestionar el rol **${rol.name}** porque está por encima de tu rol más alto.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (sub === 'add') {
      if (member.roles.cache.has(rol.id)) {
        return interaction.reply({ content: `❌ **${target.username}** ya tiene el rol ${rol}.`, flags: MessageFlags.Ephemeral });
      }

      await member.roles.add(rol, `System 777 · Asignado por ${interaction.user.tag}`);

      await interaction.reply({
        embeds: [successEmbed('✅ Rol Asignado', null, {
          thumbnail: target.displayAvatarURL({ size: 128 }),
          fields: [
            { name: '👤 Usuario', value: `${target} \`(${target.id})\``, inline: true },
            { name: '🎭 Rol',     value: rol.toString(),                  inline: true },
            { name: '👮 Por',     value: interaction.user.tag,            inline: true },
          ]
        })]
      });

    } else if (sub === 'remove') {
      if (!member.roles.cache.has(rol.id)) {
        return interaction.reply({ content: `❌ **${target.username}** no tiene el rol ${rol}.`, flags: MessageFlags.Ephemeral });
      }

      await member.roles.remove(rol, `System 777 · Quitado por ${interaction.user.tag}`);

      await interaction.reply({
        embeds: [errorEmbed('➖ Rol Quitado', null, {
          thumbnail: target.displayAvatarURL({ size: 128 }),
          fields: [
            { name: '👤 Usuario', value: `${target} \`(${target.id})\``, inline: true },
            { name: '🎭 Rol',     value: rol.toString(),                  inline: true },
            { name: '👮 Por',     value: interaction.user.tag,            inline: true },
          ]
        })]
      });
    }
  }
};
