const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
} = require('discord.js');
const db = require('../../utils/db');
const tkt = require('../../systems/ticketSystem');
const ticketDb = require('../../utils/ticketDb');
const { ticketEmbed, successEmbed, infoEmbed, createEmbed } = require('../../utils/embeds');

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
    if (!interaction.guild) return interaction.reply({ content: '❌ Este comando solo funciona en servidores.', flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();
    // Fuente única: PostgreSQL (con fallback al JSON legacy vía ticketSystem)
    const cfg = await tkt.getConfig(interaction.guild.id) || {};
    const saveCfg = () => tkt.saveGuildConfig(interaction.guild.id, cfg);

    // ── setup ───────────────────────────────────────────────────────────────
    if (sub === 'setup') {
      return interaction.reply({
        embeds: [ticketEmbed('🎫 Configura Tickets desde el Dashboard', 'Ya no necesitas comandos. Todo se configura desde la web.\n\n🌐 **[Abrir Dashboard](https://jrsystem7777.com/bot/dashboard)**')],
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

      const existing = await ticketDb.getCategories(interaction.guild.id);
      if (existing.length >= 25) return interaction.reply({ content: '❌ Máximo 25 categorías.', flags: MessageFlags.Ephemeral });
      if (existing.find(c => String(c.id) === id || c.categoryId === id)) return interaction.reply({ content: '❌ Ya existe una categoría con ese ID.', flags: MessageFlags.Ephemeral });

      await ticketDb.addCategory(interaction.guild.id, {
        categoryId: id, label, emoji, description: desc,
        channelCategoryId: catId || '', sortOrder: existing.length,
      });

      // Actualizar panel
      await updatePanel(interaction.client, interaction.guild, await tkt.getConfig(interaction.guild.id) || {});

      return interaction.reply({ content: `✅ Categoría **${label}** agregada al panel.`, flags: MessageFlags.Ephemeral });
    }

    // ── remove-categoria ────────────────────────────────────────────────────
    if (sub === 'remove-categoria') {
      const id = interaction.options.getString('id');
      const cats = await ticketDb.getCategories(interaction.guild.id);
      const found = cats.find(c => String(c.id) === id || c.categoryId === id);
      if (!found) return interaction.reply({ content: '❌ Sin categorías configuradas (o ID inexistente).', flags: MessageFlags.Ephemeral });
      await ticketDb.deleteCategory(found.id);
      await updatePanel(interaction.client, interaction.guild, await tkt.getConfig(interaction.guild.id) || {});
      return interaction.reply({ content: `✅ Categoría \`${found.categoryId}\` eliminada.`, flags: MessageFlags.Ephemeral });
    }

    // ── panel ───────────────────────────────────────────────────────────────
    if (sub === 'panel') {
      if (!cfg.panelChannel) return interaction.reply({ content: '❌ Usa `/ticket setup` primero.', flags: MessageFlags.Ephemeral });
      const desc = interaction.options.getString('descripcion');
      if (desc) { cfg.panelDescription = desc; await saveCfg(); }

      await updatePanel(interaction.client, interaction.guild, cfg);
      return interaction.reply({ content: '✅ Panel actualizado.', flags: MessageFlags.Ephemeral });
    }

    // ── add ─────────────────────────────────────────────────────────────────
    if (sub === 'add') {
      if (!await ticketDb.getTicket(interaction.channel.id)) return interaction.reply({ content: '❌ Usa dentro de un ticket.', flags: MessageFlags.Ephemeral });
      const user = interaction.options.getUser('usuario');
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
      });
      return interaction.reply({ content: `✅ ${user} añadido al ticket.` });
    }

    // ── remove ──────────────────────────────────────────────────────────────
    if (sub === 'remove') {
      if (!await ticketDb.getTicket(interaction.channel.id)) return interaction.reply({ content: '❌ Usa dentro de un ticket.', flags: MessageFlags.Ephemeral });
      const user = interaction.options.getUser('usuario');
      await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: false });
      return interaction.reply({ content: `✅ ${user} removido del ticket.` });
    }

    // ── rename ──────────────────────────────────────────────────────────────
    if (sub === 'rename') {
      if (!await ticketDb.getTicket(interaction.channel.id)) return interaction.reply({ content: '❌ Usa dentro de un ticket.', flags: MessageFlags.Ephemeral });
      const nombre = interaction.options.getString('nombre').toLowerCase().replace(/[^a-z0-9-]/g, '-');
      await interaction.channel.setName(`ticket-${nombre}`);
      return interaction.reply({ content: `✅ Canal renombrado a \`ticket-${nombre}\`.` });
    }

    // ── close ───────────────────────────────────────────────────────────────
    if (sub === 'close') {
      if (!await ticketDb.getTicket(interaction.channel.id)) return interaction.reply({ content: '❌ Usa dentro de un ticket.', flags: MessageFlags.Ephemeral });
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
        embeds: [ticketEmbed('🎫 Config — Sistema de Tickets', null, {
          fields: [
            { name: '📌 Canal panel',  value: panelCh, inline: true },
            { name: '🛡️ Rol soporte', value: roleSup, inline: true },
            { name: '📋 Canal logs',   value: logCh,   inline: true },
            { name: '📂 Categorías',   value: cats,    inline: false },
          ]
        })],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── stats ───────────────────────────────────────────────────────────────
    if (sub === 'stats') {
      const s   = await ticketDb.getStats(interaction.guild.id);
      const st  = await ticketDb.getStaffStats(interaction.guild.id);
      const claimed = (st || []).reduce((a, r) => a + Number(r.total || 0), 0);
      const total   = Number(s.totalTickets) || 0;
      const open    = Number(s.openTickets) || 0;
      const closed  = Number(s.closedTickets) || 0;

      return interaction.reply({
        embeds: [ticketEmbed('📊 Estadísticas de Tickets', null, {
          fields: [
            { name: '📬 Total creados', value: `${total}`,  inline: true },
            { name: '🟢 Abiertos',      value: `${open}`,   inline: true },
            { name: '🔴 Cerrados',       value: `${closed}`, inline: true },
            { name: '🟡 Reclamados',     value: `${claimed}`,inline: true },
            { name: '⭐ Valoración',     value: s.totalRatings > 0 ? `${Number(s.avgRating).toFixed(1)}/5 (${s.totalRatings})` : 'Sin valoraciones', inline: true },
          ]
        })],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── config ──────────────────────────────────────────────────────────────
    if (sub === 'config') {
      const opcion = interaction.options.getString('opcion');
      const valor  = interaction.options.getString('valor');

      const configMap = {
        color:       () => { cfg.panelColor = '#' + valor.replace('#','').toUpperCase(); return `🎨 Color: ${cfg.panelColor}`; },
        ping:        () => { cfg.pingOnOpen = valor === 'true' || valor === '1' || valor === 'on'; return `🔔 Ping al staff: **${cfg.pingOnOpen ? 'activado' : 'desactivado'}**`; },
        max:         () => { cfg.maxPerUser = Math.max(1, parseInt(valor) || 1); return `🔢 Máx tickets por usuario: **${cfg.maxPerUser}**`; },
        dm_transcript:()=>{ cfg.dmTranscript = valor === 'true' || valor === '1' || valor === 'on'; return `📩 DM transcript al cerrar: **${cfg.dmTranscript ? 'activado' : 'desactivado'}**`; },
        welcome_msg: () => { cfg.welcomeMessage = valor; return `📝 Mensaje bienvenida actualizado`; },
        auto_close:  () => { const h = Math.max(0, parseInt(valor) || 0); cfg.autoCloseMinutes = h * 60; return `⏰ Auto-cierre: **${h > 0 ? h + 'h' : 'desactivado'}**`; },
        extra_role:  () => { cfg.extraSupportRole = valor; return `👥 Rol extra: <@&${valor}>`; },
        prefix:      () => { cfg.channelPrefix = valor.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,10) || 'ticket'; return `🏷️ Prefijo: \`${cfg.channelPrefix}\``; },
      };

      if (!configMap[opcion]) return interaction.reply({ content: '❌ Opción inválida.', flags: MessageFlags.Ephemeral });
      const msg = configMap[opcion]();
      await saveCfg();

      return interaction.reply({
        embeds: [ticketEmbed('✅ Configuración Actualizada', msg, {
          fields: buildConfigFields(cfg)
        })],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── disable ─────────────────────────────────────────────────────────────
    if (sub === 'disable') {
      // Vaciar las TRES fuentes si no, getConfig reviviría el config legacy
      db.set('ticketConfig', interaction.guild.id, {});
      const g = db.get('guilds', interaction.guild.id, {}) || {};
      if (g.tickets) { delete g.tickets; db.set('guilds', interaction.guild.id, g); }
      await tkt.saveGuildConfig(interaction.guild.id, { ...cfg, panelChannel: '', panelMessageId: '' });
      return interaction.reply({ content: '✅ Sistema de tickets desactivado.', flags: MessageFlags.Ephemeral });
    }

    if (sub === 'premium') {
      const gate = require('../../utils/premiumGate');
      if (!await gate.check(interaction, 'pro')) return;

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const accion = interaction.options.getString('accion');
      const valor  = interaction.options.getString('valor') || '';
      const cfg    = await tkt.getConfig(interaction.guild.id) || {};

      if (accion === 'analytics') {
        const s  = await ticketDb.getStats(interaction.guild.id);
        const st = await ticketDb.getStaffStats(interaction.guild.id);
        const open   = Number(s.openTickets) || 0;
        const closed = Number(s.closedTickets) || 0;
        const avgTime = (st || []).length
          ? (st || []).reduce((a, r) => a + Number(r.avg_rating || 0), 0)
          : 0;

        return interaction.editReply({ embeds: [ticketEmbed('💠 Ticket Analytics Premium', null, {
          fields: [
            { name: '📂 Total tickets',  value: `${Number(s.totalTickets) || 0}`, inline: true },
            { name: '🟢 Abiertos',       value: `${open}`,            inline: true },
            { name: '✅ Cerrados',        value: `${closed}`,          inline: true },
            { name: '⭐ Valoración media', value: s.totalRatings > 0 ? `${Number(s.avgRating).toFixed(1)}/5` : 'N/A', inline: true },
          ]
        })] });
      }

      if (accion === 'branding') {
        if (valor) {
          cfg.premiumBranding = valor;
          await tkt.saveGuildConfig(interaction.guild.id, cfg);
          return interaction.editReply({ content: `✅ Branding premium actualizado: **${valor}**` });
        }
        return interaction.editReply({ content: `🎨 Branding actual: **${cfg.premiumBranding || 'No configurado'}**\nEspecifica un valor para cambiarlo.` });
      }

      if (accion === 'autoassign') {
        cfg.premiumAutoAssign = !cfg.premiumAutoAssign;
        await tkt.saveGuildConfig(interaction.guild.id, cfg);
        return interaction.editReply({ content: `✅ Auto-assign ${cfg.premiumAutoAssign ? '**activado**' : '**desactivado**'}.` });
      }

      if (accion === 'priority') {
        cfg.premiumPriority = !cfg.premiumPriority;
        await tkt.saveGuildConfig(interaction.guild.id, cfg);
        return interaction.editReply({ content: `✅ Prioridad premium en tickets ${cfg.premiumPriority ? '**activada**' : '**desactivada**'}.` });
      }
    }
  }
};

function buildConfigFields(cfg) {
  const color = cfg.panelColor || cfg.embedColor || '#5865F2';
  const autoCloseH = cfg.autoCloseMinutes != null ? Math.round(cfg.autoCloseMinutes / 60) : (cfg.autoCloseHours || 0);
  return [
    { name: '🎨 Color',              value: `${color}`,                                          inline: true },
    { name: '🔔 Ping staff',         value: cfg.pingOnOpen ? '✅ Sí' : '❌ No',                               inline: true },
    { name: '🔢 Máx por usuario',    value: `${cfg.maxPerUser ?? 1}`,                                          inline: true },
    { name: '📩 DM transcript',      value: cfg.dmTranscript ? '✅ Sí' : '❌ No',                              inline: true },
    { name: '⏰ Auto-cierre',         value: autoCloseH ? `${autoCloseH}h` : '❌ Off',          inline: true },
    { name: '🏷️ Prefijo canales',    value: `\`${cfg.channelPrefix ?? 'ticket'}\``,                           inline: true },
    { name: '📝 Mensaje bienvenida', value: (cfg.welcomeMessage || cfg.welcomeMsg) ? (cfg.welcomeMessage || cfg.welcomeMsg).slice(0,50)+'...' : '*Default*',   inline: false },
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
    await tkt.saveGuildConfig(guild.id, cfg);
  } catch {}
}
