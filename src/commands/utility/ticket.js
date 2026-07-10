const {
  SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags,
} = require('discord.js');
const db = require('../../utils/db');
const tkt = require('../../systems/ticketSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 Sistema de tickets profesional')

    // ── setup ───────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Configurar el sistema de tickets')
      .addChannelOption(o => o.setName('panel-canal').setDescription('Canal donde aparece el panel').setRequired(true))
      .addRoleOption(o => o.setName('rol-soporte').setDescription('Rol del equipo de soporte').setRequired(true))
      .addChannelOption(o => o.setName('log-canal').setDescription('Canal de logs y transcripts'))
      .addStringOption(o => o.setName('categoria-discord').setDescription('ID de categoría de Discord para los canales de ticket')))

    // ── categoria ───────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('categoria')
      .setDescription('Agregar categoría de ticket al select menu')
      .addStringOption(o => o.setName('id').setDescription('ID único (ej: soporte, ventas)').setRequired(true))
      .addStringOption(o => o.setName('nombre').setDescription('Nombre visible').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji').setRequired(true))
      .addStringOption(o => o.setName('descripcion').setDescription('Descripción corta').setRequired(true))
      .addStringOption(o => o.setName('categoria-discord').setDescription('ID de categoría Discord específica para esta tipo')))

    // ── remove-categoria ────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('remove-categoria')
      .setDescription('Eliminar categoría del select menu')
      .addStringOption(o => o.setName('id').setDescription('ID de la categoría').setRequired(true)))

    // ── panel ───────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('panel')
      .setDescription('Reenviar/actualizar el panel de tickets en el canal configurado')
      .addStringOption(o => o.setName('descripcion').setDescription('Descripción personalizada del panel')))

    // ── add ─────────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Añadir usuario al ticket actual')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario a añadir').setRequired(true)))

    // ── remove ──────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remover usuario del ticket actual')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario a remover').setRequired(true)))

    // ── rename ──────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('rename')
      .setDescription('Renombrar el canal del ticket actual')
      .addStringOption(o => o.setName('nombre').setDescription('Nuevo nombre').setRequired(true)))

    // ── close ───────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('close')
      .setDescription('Cerrar el ticket actual')
      .addStringOption(o => o.setName('razon').setDescription('Razón del cierre')))

    // ── status ──────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('status')
      .setDescription('Ver configuración actual del sistema de tickets'))

    // ── stats ───────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('stats')
      .setDescription('Estadísticas del sistema de tickets'))

    // ── config ──────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('config')
      .setDescription('Opciones avanzadas del sistema de tickets')
      .addStringOption(o => o.setName('opcion').setDescription('Opción a configurar').setRequired(true)
        .addChoices(
          { name: '🎨 Color embed',              value: 'color' },
          { name: '🔔 Ping al staff al abrir',   value: 'ping' },
          { name: '🔢 Máx tickets por usuario',  value: 'max' },
          { name: '📩 DM transcript al cerrar',  value: 'dm_transcript' },
          { name: '📝 Mensaje bienvenida ticket',value: 'welcome_msg' },
          { name: '⏰ Auto-cierre inactivo (h)', value: 'auto_close' },
          { name: '👥 Rol adicional de soporte', value: 'extra_role' },
          { name: '🏷️ Prefijo de canales',      value: 'prefix' },
        ))
      .addStringOption(o => o.setName('valor').setDescription('Valor de la opción').setRequired(true)))

    // ── disable ─────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('disable')
      .setDescription('Desactivar el sistema de tickets'))

    // ── premium ──────────────────────────────────────────────────────────────
    .addSubcommand(s => s
      .setName('premium')
      .setDescription('💠 Funciones premium del sistema de tickets (requiere Premium Pro)')
      .addStringOption(o => o.setName('accion').setDescription('Acción').setRequired(true)
        .addChoices(
          { name: 'Ver analytics de tickets',       value: 'analytics' },
          { name: 'Configurar branding premium',    value: 'branding'  },
          { name: 'Auto-assign de tickets',         value: 'autoassign' },
          { name: 'Prioridad premium en tickets',   value: 'priority'  },
        ))
      .addStringOption(o => o.setName('valor').setDescription('Valor (si aplica)').setRequired(false)))

    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  userPermissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const cfg = db.get('ticketConfig', interaction.guild.id, {});

    // ── setup ───────────────────────────────────────────────────────────────
    if (sub === 'setup') {
      const panelCh  = interaction.options.getChannel('panel-canal');
      const roleSup  = interaction.options.getRole('rol-soporte');
      const logCh    = interaction.options.getChannel('log-canal');
      const catDiscId= interaction.options.getString('categoria-discord');

      cfg.panelChannel  = panelCh.id;
      cfg.supportRole   = roleSup.id;
      if (logCh)     cfg.logChannel     = logCh.id;
      if (catDiscId) cfg.ticketCategory = catDiscId;
      if (!cfg.categories) cfg.categories = [];

      db.set('ticketConfig', interaction.guild.id, cfg);

      // Enviar panel
      const panel = tkt.buildPanel(cfg, interaction.guild);
      const msg   = await panelCh.send(panel);
      cfg.panelMessageId = msg.id;
      db.set('ticketConfig', interaction.guild.id, cfg);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('✅ Sistema de Tickets Configurado')
          .addFields(
            { name: '📌 Panel',       value: `${panelCh}`,                                              inline: true },
            { name: '🛡️ Rol soporte', value: `${roleSup}`,                                             inline: true },
            { name: '📋 Logs',        value: logCh ? `${logCh}` : '❌ Sin configurar',                 inline: true },
            { name: '📂 Categorías',  value: cfg.categories.length ? `${cfg.categories.length} tipo(s)` : '0 (botón simple)', inline: true },
          )
          .setDescription('Usa `/ticket categoria` para agregar tipos de ticket al select menu.')
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── categoria ───────────────────────────────────────────────────────────
    if (sub === 'categoria') {
      const id    = interaction.options.getString('id').toLowerCase().replace(/\s/g, '_');
      const label = interaction.options.getString('nombre');
      const emoji = interaction.options.getString('emoji');
      const desc  = interaction.options.getString('descripcion');
      const catId = interaction.options.getString('categoria-discord');

      if (!cfg.categories) cfg.categories = [];
      if (cfg.categories.length >= 25) return interaction.reply({ content: '❌ Máximo 25 categorías.', flags: MessageFlags.Ephemeral });
      if (cfg.categories.find(c => c.id === id)) return interaction.reply({ content: '❌ Ya existe una categoría con ese ID.', flags: MessageFlags.Ephemeral });

      cfg.categories.push({ id, label, emoji, description: desc, channelCategoryId: catId ?? null });
      db.set('ticketConfig', interaction.guild.id, cfg);

      // Actualizar panel
      await updatePanel(interaction.client, interaction.guild, cfg);

      return interaction.reply({ content: `✅ Categoría **${label}** agregada al panel.`, flags: MessageFlags.Ephemeral });
    }

    // ── remove-categoria ────────────────────────────────────────────────────
    if (sub === 'remove-categoria') {
      const id = interaction.options.getString('id');
      if (!cfg.categories) return interaction.reply({ content: '❌ Sin categorías configuradas.', flags: MessageFlags.Ephemeral });
      cfg.categories = cfg.categories.filter(c => c.id !== id);
      db.set('ticketConfig', interaction.guild.id, cfg);
      await updatePanel(interaction.client, interaction.guild, cfg);
      return interaction.reply({ content: `✅ Categoría \`${id}\` eliminada.`, flags: MessageFlags.Ephemeral });
    }

    // ── panel ───────────────────────────────────────────────────────────────
    if (sub === 'panel') {
      if (!cfg.panelChannel) return interaction.reply({ content: '❌ Usa `/ticket setup` primero.', flags: MessageFlags.Ephemeral });
      const desc = interaction.options.getString('descripcion');
      if (desc) { cfg.panelDescription = desc; db.set('ticketConfig', interaction.guild.id, cfg); }

      await updatePanel(interaction.client, interaction.guild, cfg);
      return interaction.reply({ content: '✅ Panel actualizado.', flags: MessageFlags.Ephemeral });
    }

    // ── add ─────────────────────────────────────────────────────────────────
    if (sub === 'add') {
      if (!interaction.channel.name.startsWith('ticket-')) return interaction.reply({ content: '❌ Usa dentro de un ticket.', flags: MessageFlags.Ephemeral });
      const user = interaction.options.getUser('usuario');
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
      });
      return interaction.reply({ content: `✅ ${user} añadido al ticket.` });
    }

    // ── remove ──────────────────────────────────────────────────────────────
    if (sub === 'remove') {
      if (!interaction.channel.name.startsWith('ticket-')) return interaction.reply({ content: '❌ Usa dentro de un ticket.', flags: MessageFlags.Ephemeral });
      const user = interaction.options.getUser('usuario');
      await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: false });
      return interaction.reply({ content: `✅ ${user} removido del ticket.` });
    }

    // ── rename ──────────────────────────────────────────────────────────────
    if (sub === 'rename') {
      if (!interaction.channel.name.startsWith('ticket-')) return interaction.reply({ content: '❌ Usa dentro de un ticket.', flags: MessageFlags.Ephemeral });
      const nombre = interaction.options.getString('nombre').toLowerCase().replace(/[^a-z0-9-]/g, '-');
      await interaction.channel.setName(`ticket-${nombre}`);
      return interaction.reply({ content: `✅ Canal renombrado a \`ticket-${nombre}\`.` });
    }

    // ── close ───────────────────────────────────────────────────────────────
    if (sub === 'close') {
      if (!interaction.channel.name.startsWith('ticket-')) return interaction.reply({ content: '❌ Usa dentro de un ticket.', flags: MessageFlags.Ephemeral });
      const razon = interaction.options.getString('razon') ?? 'Cerrado por comando';
      return tkt.closeTicket(interaction, razon);
    }

    // ── status ──────────────────────────────────────────────────────────────
    if (sub === 'status') {
      const panelCh = cfg.panelChannel ? `<#${cfg.panelChannel}>` : '❌';
      const roleSup = cfg.supportRole  ? `<@&${cfg.supportRole}>` : '❌';
      const logCh   = cfg.logChannel   ? `<#${cfg.logChannel}>`   : '❌';
      const cats    = cfg.categories?.map(c => `${c.emoji} **${c.label}** (\`${c.id}\`)`).join('\n') || '*Sin categorías (botón simple)*';

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🎫 Config — Sistema de Tickets')
          .addFields(
            { name: '📌 Canal panel',  value: panelCh, inline: true },
            { name: '🛡️ Rol soporte', value: roleSup, inline: true },
            { name: '📋 Canal logs',   value: logCh,   inline: true },
            { name: '📂 Categorías',   value: cats,    inline: false },
          )
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── stats ───────────────────────────────────────────────────────────────
    if (sub === 'stats') {
      const allTickets = db.all('tickets');
      const guildTkts  = Object.values(allTickets).filter(t => t && t.guildId === interaction.guild.id);
      const open    = guildTkts.filter(t => t.status === 'open').length;
      const closed  = guildTkts.filter(t => t.status === 'closed').length;
      const claimed = guildTkts.filter(t => t.claimedBy).length;
      const total   = db.get('ticketConfig', `count_${interaction.guild.id}`) ?? 0;

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📊 Estadísticas de Tickets')
          .addFields(
            { name: '📬 Total creados', value: `${total}`,  inline: true },
            { name: '🟢 Abiertos',      value: `${open}`,   inline: true },
            { name: '🔴 Cerrados',       value: `${closed}`, inline: true },
            { name: '🟡 Reclamados',     value: `${claimed}`,inline: true },
          )
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── config ──────────────────────────────────────────────────────────────
    if (sub === 'config') {
      const opcion = interaction.options.getString('opcion');
      const valor  = interaction.options.getString('valor');

      const configMap = {
        color:       () => { cfg.embedColor = parseInt(valor.replace('#',''), 16) || 0x5865F2; return `🎨 Color: #${valor.replace('#','').toUpperCase()}`; },
        ping:        () => { cfg.pingOnOpen = valor === 'true' || valor === '1' || valor === 'on'; return `🔔 Ping al staff: **${cfg.pingOnOpen ? 'activado' : 'desactivado'}**`; },
        max:         () => { cfg.maxPerUser = Math.max(1, parseInt(valor) || 1); return `🔢 Máx tickets por usuario: **${cfg.maxPerUser}**`; },
        dm_transcript:()=>{ cfg.dmTranscript = valor === 'true' || valor === '1' || valor === 'on'; return `📩 DM transcript al cerrar: **${cfg.dmTranscript ? 'activado' : 'desactivado'}**`; },
        welcome_msg: () => { cfg.welcomeMsg = valor; return `📝 Mensaje bienvenida actualizado`; },
        auto_close:  () => { cfg.autoCloseHours = Math.max(0, parseInt(valor) || 0); return `⏰ Auto-cierre: **${cfg.autoCloseHours > 0 ? cfg.autoCloseHours + 'h' : 'desactivado'}**`; },
        extra_role:  () => { cfg.extraSupportRole = valor; return `👥 Rol extra: <@&${valor}>`; },
        prefix:      () => { cfg.channelPrefix = valor.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,10) || 'ticket'; return `🏷️ Prefijo: \`${cfg.channelPrefix}\``; },
      };

      if (!configMap[opcion]) return interaction.reply({ content: '❌ Opción inválida.', flags: MessageFlags.Ephemeral });
      const msg = configMap[opcion]();
      db.set('ticketConfig', interaction.guild.id, cfg);

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(cfg.embedColor ?? 0x5865F2)
          .setTitle('✅ Configuración Actualizada')
          .setDescription(msg)
          .addFields(buildConfigFields(cfg))
          .setFooter({ text: 'System 777 · Tickets Config' })],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── disable ─────────────────────────────────────────────────────────────
    if (sub === 'disable') {
      db.set('ticketConfig', interaction.guild.id, {});
      return interaction.reply({ content: '✅ Sistema de tickets desactivado.', flags: MessageFlags.Ephemeral });
    }

    if (sub === 'premium') {
      const gate = require('../../utils/premiumGate');
      if (!await gate.check(interaction, 'pro')) return;

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const accion = interaction.options.getString('accion');
      const valor  = interaction.options.getString('valor') || '';
      const cfg    = db.get('ticketConfig', interaction.guild.id) || {};

      if (accion === 'analytics') {
        const allTickets = db.all('tickets') || {};
        const guildTix   = Object.values(allTickets).filter(t => t?.guildId === interaction.guild.id);
        const open       = guildTix.filter(t => t.status === 'open').length;
        const closed     = guildTix.filter(t => t.status === 'closed').length;
        const avgTime    = guildTix.filter(t => t.closedAt && t.openedAt)
          .reduce((a, t) => a + (t.closedAt - t.openedAt), 0) / (closed || 1);

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('💠 Ticket Analytics Premium')
          .addFields(
            { name: '📂 Total tickets',  value: `${guildTix.length}`, inline: true },
            { name: '🟢 Abiertos',       value: `${open}`,            inline: true },
            { name: '✅ Cerrados',        value: `${closed}`,          inline: true },
            { name: '⏱️ Tiempo medio',   value: closed > 0 ? `${Math.floor(avgTime/3600000)}h` : 'N/A', inline: true },
          )
          .setFooter({ text: 'System 777 · Ticket Analytics · Pro' })
          .setTimestamp()] });
      }

      if (accion === 'branding') {
        if (valor) {
          cfg.premiumBranding = valor;
          db.set('ticketConfig', interaction.guild.id, cfg);
          return interaction.editReply({ content: `✅ Branding premium actualizado: **${valor}**` });
        }
        return interaction.editReply({ content: `🎨 Branding actual: **${cfg.premiumBranding || 'No configurado'}**\nEspecifica un valor para cambiarlo.` });
      }

      if (accion === 'autoassign') {
        cfg.premiumAutoAssign = !cfg.premiumAutoAssign;
        db.set('ticketConfig', interaction.guild.id, cfg);
        return interaction.editReply({ content: `✅ Auto-assign ${cfg.premiumAutoAssign ? '**activado**' : '**desactivado**'}.` });
      }

      if (accion === 'priority') {
        cfg.premiumPriority = !cfg.premiumPriority;
        db.set('ticketConfig', interaction.guild.id, cfg);
        return interaction.editReply({ content: `✅ Prioridad premium en tickets ${cfg.premiumPriority ? '**activada**' : '**desactivada**'}.` });
      }
    }
  }
};

function buildConfigFields(cfg) {
  return [
    { name: '🎨 Color',              value: cfg.embedColor ? `#${cfg.embedColor.toString(16).toUpperCase().padStart(6,'0')}` : '#5865F2', inline: true },
    { name: '🔔 Ping staff',         value: cfg.pingOnOpen ? '✅ Sí' : '❌ No',                               inline: true },
    { name: '🔢 Máx por usuario',    value: `${cfg.maxPerUser ?? 1}`,                                          inline: true },
    { name: '📩 DM transcript',      value: cfg.dmTranscript ? '✅ Sí' : '❌ No',                              inline: true },
    { name: '⏰ Auto-cierre',         value: cfg.autoCloseHours ? `${cfg.autoCloseHours}h` : '❌ Off',          inline: true },
    { name: '🏷️ Prefijo canales',    value: `\`${cfg.channelPrefix ?? 'ticket'}\``,                           inline: true },
    { name: '📝 Mensaje bienvenida', value: cfg.welcomeMsg ? cfg.welcomeMsg.slice(0,50)+'...' : '*Default*',   inline: false },
  ];
}

async function updatePanel(client, guild, cfg) {
  if (!cfg.panelChannel) return;
  try {
    const ch  = guild.channels.cache.get(cfg.panelChannel);
    if (!ch) return;
    const panel = tkt.buildPanel(cfg, guild);
    if (cfg.panelMessageId) {
      const msg = await ch.messages.fetch(cfg.panelMessageId).catch(() => null);
      if (msg) { await msg.edit(panel); return; }
    }
    const msg = await ch.send(panel);
    cfg.panelMessageId = msg.id;
    db.set('ticketConfig', guild.id, cfg);
  } catch {}
}
