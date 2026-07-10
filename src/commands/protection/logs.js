const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

const CATEGORIAS = {
  mod:          { label: '🔨 Moderación',       desc: 'Ban, kick, warn, timeout' },
  ban:          { label: '🔨 Bans/Unbans',       desc: 'Bans y desbans' },
  delete:       { label: '🗑️ Mensajes borrados', desc: 'Mensajes eliminados' },
  edit:         { label: '✏️ Mensajes editados', desc: 'Ediciones de mensajes' },
  join:         { label: '📥 Entradas',          desc: 'Miembros que entran' },
  leave:        { label: '📤 Salidas',           desc: 'Miembros que salen' },
  voice_join:   { label: '🔊 Voz (entradas)',    desc: 'Entradas a canales de voz' },
  voice_leave:  { label: '🔇 Voz (salidas)',     desc: 'Salidas de voz' },
  voice_move:   { label: '🔀 Voz (movimientos)', desc: 'Movimientos en voz' },
  role_add:     { label: '🎭 Roles añadidos',    desc: 'Roles asignados' },
  role_remove:  { label: '🎭 Roles quitados',    desc: 'Roles removidos' },
  nick:         { label: '📝 Nicknames',         desc: 'Cambios de nickname' },
  channel_create: { label: '➕ Canales creados', desc: 'Canales nuevos' },
  channel_delete: { label: '➖ Canales borrados',desc: 'Canales eliminados' },
  flood:        { label: '🚨 Flood',             desc: 'Alertas de flood' },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('📋 Configura los canales de logs')

    .addSubcommand(s => s
      .setName('set')
      .setDescription('Asigna un canal a una categoría de logs')
      .addStringOption(o => {
        const opt = o.setName('categoria').setDescription('Categoría').setRequired(true);
        Object.keys(CATEGORIAS).forEach(k => opt.addChoices({ name: CATEGORIAS[k].label, value: k }));
        return opt;
      })
      .addChannelOption(o => o.setName('canal').setDescription('Canal de logs').setRequired(true)))

    .addSubcommand(s => s
      .setName('setall')
      .setDescription('Enviar TODOS los logs a un solo canal')
      .addChannelOption(o => o.setName('canal').setDescription('Canal para todos los logs').setRequired(true)))

    .addSubcommand(s => s
      .setName('clear')
      .setDescription('Elimina la config de logs de una categoría')
      .addStringOption(o => {
        const opt = o.setName('categoria').setDescription('Categoría').setRequired(true);
        Object.keys(CATEGORIAS).forEach(k => opt.addChoices({ name: CATEGORIAS[k].label, value: k }));
        return opt;
      }))

    .addSubcommand(s => s
      .setName('status')
      .setDescription('Ver configuración actual de logs'))

    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  userPermissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const cfg = db.get('guilds', interaction.guild.id, {});

    if (sub === 'set') {
      const cat   = interaction.options.getString('categoria');
      const canal = interaction.options.getChannel('canal');
      cfg[`log_${cat}`] = canal.id;
      db.set('guilds', interaction.guild.id, cfg);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('✅ Log Configurado')
          .addFields(
            { name: '📋 Categoría', value: CATEGORIAS[cat].label, inline: true },
            { name: '📢 Canal',     value: canal.toString(),       inline: true },
          )
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });

    } else if (sub === 'setall') {
      const canal = interaction.options.getChannel('canal');
      cfg.logChannel = canal.id;
      Object.keys(CATEGORIAS).forEach(k => { cfg[`log_${k}`] = canal.id; });
      db.set('guilds', interaction.guild.id, cfg);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('✅ Todos los Logs Configurados')
          .setDescription(`Todas las categorías → ${canal}`)
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });

    } else if (sub === 'clear') {
      const cat = interaction.options.getString('categoria');
      delete cfg[`log_${cat}`];
      db.set('guilds', interaction.guild.id, cfg);

      await interaction.reply({ content: `✅ Log de **${CATEGORIAS[cat].label}** eliminado.`, flags: MessageFlags.Ephemeral });

    } else if (sub === 'status') {
      const lines = Object.entries(CATEGORIAS).map(([k, v]) => {
        const chId = cfg[`log_${k}`] ?? cfg.logChannel;
        const ch   = chId ? `<#${chId}>` : '❌ Sin canal';
        return `${v.label}: ${ch}`;
      });

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📋 Configuración de Logs — System 777')
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
