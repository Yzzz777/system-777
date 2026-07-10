const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('🎭 Rol automático al unirse al servidor')
    .addSubcommand(s => s
      .setName('set')
      .setDescription('Configurar rol automático para nuevos miembros')
      .addRoleOption(o => o.setName('rol').setDescription('Rol a asignar automáticamente').setRequired(true)))
    .addSubcommand(s => s
      .setName('bot')
      .setDescription('Configurar rol automático para bots')
      .addRoleOption(o => o.setName('rol').setDescription('Rol a asignar a bots').setRequired(true)))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Desactivar autorole de miembros o bots')
      .addStringOption(o => o.setName('tipo').setDescription('¿Cuál quitar?').setRequired(true)
        .addChoices({ name: 'Miembros', value: 'members' }, { name: 'Bots', value: 'bots' }, { name: 'Ambos', value: 'both' })))
    .addSubcommand(s => s
      .setName('status')
      .setDescription('Ver configuración del autorole'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  userPermissions: [PermissionFlagsBits.ManageRoles],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const cfg = db.get('guilds', interaction.guild.id, {});

    if (sub === 'set') {
      const rol = interaction.options.getRole('rol');
      if (rol.managed) return interaction.reply({ content: '❌ No puedes usar roles de integración.', flags: MessageFlags.Ephemeral });
      if (rol.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ content: '❌ El rol está por encima del bot.', flags: MessageFlags.Ephemeral });
      }
      cfg.autorole = rol.id;
      db.set('guilds', interaction.guild.id, cfg);
      return interaction.reply({ content: `✅ Auto-rol para miembros: **${rol.name}**`, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'bot') {
      const rol = interaction.options.getRole('rol');
      cfg.autoroleBot = rol.id;
      db.set('guilds', interaction.guild.id, cfg);
      return interaction.reply({ content: `✅ Auto-rol para bots: **${rol.name}**`, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'remove') {
      const tipo = interaction.options.getString('tipo');
      if (tipo === 'members' || tipo === 'both') delete cfg.autorole;
      if (tipo === 'bots'    || tipo === 'both') delete cfg.autoroleBot;
      db.set('guilds', interaction.guild.id, cfg);
      return interaction.reply({ content: '✅ Auto-rol desactivado.', flags: MessageFlags.Ephemeral });
    }

    if (sub === 'status') {
      const mr = cfg.autorole    ? `<@&${cfg.autorole}>`    : '❌ Sin configurar';
      const br = cfg.autoroleBot ? `<@&${cfg.autoroleBot}>` : '❌ Sin configurar';
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🎭 Estado del Auto-Rol')
          .addFields(
            { name: '👤 Miembros', value: mr, inline: true },
            { name: '🤖 Bots',     value: br, inline: true },
          ).setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
};
