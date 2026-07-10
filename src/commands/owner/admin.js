const {
  SlashCommandBuilder, EmbedBuilder, MessageFlags, AttachmentBuilder
} = require('discord.js');
const db         = require('../../utils/db');
const security   = require('../../systems/securityGuard');
const reputation = require('../../systems/reputation');
const staffSys   = require('../../systems/staffSystem');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('[OWNER] Panel de administración avanzado')

    // ── security subcommand group ──────────────────────────────────────────
    .addSubcommandGroup(g => g.setName('security').setDescription('Gestión de seguridad')
      .addSubcommand(s => s.setName('status').setDescription('Estado del sistema de seguridad')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor (opcional)').setRequired(false)))
      .addSubcommand(s => s.setName('alerts').setDescription('Ver alertas de seguridad recientes')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(false)))
      .addSubcommand(s => s.setName('alts').setDescription('Ver alt accounts detectadas')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true)))
      .addSubcommand(s => s.setName('config').setDescription('Configurar protecciones de seguridad')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true))
        .addBooleanOption(o => o.setName('antiphishing').setDescription('Anti-phishing/scam links'))
        .addBooleanOption(o => o.setName('antiinvite').setDescription('Anti-invite spam'))
        .addBooleanOption(o => o.setName('antimention').setDescription('Anti-mass-mention'))
        .addBooleanOption(o => o.setName('antialt').setDescription('Anti-alt accounts'))
        .addBooleanOption(o => o.setName('ghostping').setDescription('Anti-ghost ping'))
        .addBooleanOption(o => o.setName('autoprotect').setDescription('Auto-protect mode'))
        .addIntegerOption(o => o.setName('minaccountage').setDescription('Edad mínima de cuenta en días').setMinValue(1).setMaxValue(365))
        .addIntegerOption(o => o.setName('maxmentions').setDescription('Max menciones por mensaje').setMinValue(2).setMaxValue(50))
        .addStringOption(o => o.setName('altaction').setDescription('Acción en alt detection').addChoices({name:'Solo alertar',value:'warn'},{name:'Expulsar',value:'kick'},{name:'Banear',value:'ban'}))
        .addStringOption(o => o.setName('logchannel').setDescription('ID del canal de logs de seguridad')))
    )

    // ── monitor subcommand group ───────────────────────────────────────────
    .addSubcommandGroup(g => g.setName('monitor').setDescription('Monitoreo del VPS/bot')
      .addSubcommand(s => s.setName('start').setDescription('Iniciar monitoreo automático del VPS')
        .addIntegerOption(o => o.setName('intervalo').setDescription('Intervalo en minutos (default: 5)').setMinValue(1).setMaxValue(60))
        .addIntegerOption(o => o.setName('maxram').setDescription('Alerta si RAM supera N MB (default: 400)').setMinValue(100).setMaxValue(4000))
        .addIntegerOption(o => o.setName('maxrss').setDescription('Alerta si RSS supera N MB (default: 600)').setMinValue(100).setMaxValue(4000)))
      .addSubcommand(s => s.setName('stop').setDescription('Detener monitoreo automático'))
      .addSubcommand(s => s.setName('status').setDescription('Ver estado actual del monitoreo'))
    )

    // ── userlookup subcommand ──────────────────────────────────────────────
    .addSubcommand(s => s.setName('userlookup').setDescription('Historial completo de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario a buscar').setRequired(true))
      .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(false)))

    // ── exportlogs subcommand ─────────────────────────────────────────────
    .addSubcommand(s => s.setName('exportlogs').setDescription('Exportar logs/datos como archivo')
      .addStringOption(o => o.setName('tipo').setDescription('Tipo de datos').setRequired(true)
        .addChoices(
          { name: 'Mod Logs', value: 'modlogs' },
          { name: 'Warns', value: 'warns' },
          { name: 'Security Alerts', value: 'security_alerts' },
          { name: 'Security Flags', value: 'security_flags' },
          { name: 'Alt Accounts', value: 'security_alts' },
          { name: 'Blacklist', value: 'blacklist' },
          { name: 'Analytics', value: 'analytics' }
        ))
      .addStringOption(o => o.setName('serverid').setDescription('ID del servidor (si aplica)').setRequired(false)))

    // ── emergency subcommand group ────────────────────────────────────────
    .addSubcommandGroup(g => g.setName('emergency').setDescription('Modo emergencia — acciones críticas')
      .addSubcommand(s => s.setName('lockdown').setDescription('Bloquea todos los canales de texto de un servidor')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón del lockdown')))
      .addSubcommand(s => s.setName('unlock').setDescription('Restaura permisos de canales tras lockdown')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true)))
      .addSubcommand(s => s.setName('scan').setDescription('Escanea miembros sospechosos de un servidor')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true))
        .addIntegerOption(o => o.setName('mindays').setDescription('Marcar cuentas menores de N días (def: 7)').setMinValue(1).setMaxValue(365)))
      .addSubcommand(s => s.setName('panic').setDescription('PANIC MODE — lockdown + slowmode 120s + deshabilita invites')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true)))
    )

    // ── investigate subcommand group ─────────────────────────────────────
    .addSubcommandGroup(g => g.setName('investigate').setDescription('Investigación y análisis avanzado')
      .addSubcommand(s => s.setName('user').setDescription('Análisis completo de un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a investigar').setRequired(true))
        .addStringOption(o => o.setName('serverid').setDescription('Contexto de servidor').setRequired(false)))
      .addSubcommand(s => s.setName('server').setDescription('Análisis de salud de un servidor')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true)))
      .addSubcommand(s => s.setName('risk').setDescription('Escaneo de riesgo global — top usuarios peligrosos')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true)))
    )

    // ── backup subcommand group ───────────────────────────────────────────
    .addSubcommandGroup(g => g.setName('backup').setDescription('Backup y restauración del servidor')
      .addSubcommand(s => s.setName('create').setDescription('Crea backup de roles y canales del servidor')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true)))
      .addSubcommand(s => s.setName('list').setDescription('Lista backups disponibles')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true)))
      .addSubcommand(s => s.setName('restore').setDescription('Restaura nombres y colores de roles desde backup')
        .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true))
        .addStringOption(o => o.setName('backupid').setDescription('ID del backup (o "latest")').setRequired(false)))
    )

    // ── staff subcommand group ────────────────────────────────────────────
    .addSubcommandGroup(g => g.setName('staff').setDescription('Gestión del equipo staff del bot')
      .addSubcommand(s => s.setName('add').setDescription('Añadir miembro al staff')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addStringOption(o => o.setName('rango').setDescription('Rango').setRequired(true)
          .addChoices(
            { name: '💠 Co-Owner',        value: 'co_owner'        },
            { name: '⚙️ Developer',        value: 'developer'       },
            { name: '🛡️ Admin',            value: 'admin'           },
            { name: '🔨 Moderator',        value: 'moderator'       },
            { name: '💬 Support',          value: 'support'         },
            { name: '💎 Premium Manager',  value: 'premium_manager' },
            { name: '🎫 Ticket Staff',     value: 'ticket_staff'    },
            { name: '🔰 Trial Staff',      value: 'trial_staff'     },
          ))
        .addStringOption(o => o.setName('nota').setDescription('Nota interna').setRequired(false)))
      .addSubcommand(s => s.setName('remove').setDescription('Eliminar miembro del staff')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(false)))
      .addSubcommand(s => s.setName('list').setDescription('Ver lista completa del staff'))
      .addSubcommand(s => s.setName('info').setDescription('Info de un miembro del staff')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))
      .addSubcommand(s => s.setName('promote').setDescription('Cambiar rango de un miembro')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addStringOption(o => o.setName('rango').setDescription('Nuevo rango').setRequired(true)
          .addChoices(
            { name: '💠 Co-Owner',        value: 'co_owner'        },
            { name: '⚙️ Developer',        value: 'developer'       },
            { name: '🛡️ Admin',            value: 'admin'           },
            { name: '🔨 Moderator',        value: 'moderator'       },
            { name: '💬 Support',          value: 'support'         },
            { name: '💎 Premium Manager',  value: 'premium_manager' },
            { name: '🎫 Ticket Staff',     value: 'ticket_staff'    },
            { name: '🔰 Trial Staff',      value: 'trial_staff'     },
          )))
      .addSubcommand(s => s.setName('logs').setDescription('Audit log del staff')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Entradas (máx 20)').setMinValue(1).setMaxValue(20).setRequired(false)))
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const group = interaction.options.getSubcommandGroup(false);
    const sub   = interaction.options.getSubcommand();

    // ════════════════════════════════════════════════════════════════════════
    // SECURITY GROUP
    // ════════════════════════════════════════════════════════════════════════
    if (group === 'security') {

      // ── security status ─────────────────────────────────────────────────
      if (sub === 'status') {
        const guildId = interaction.options.getString('serverid') || null;
        const guild   = guildId ? client.guilds.cache.get(guildId) : null;

        if (guildId && !guild) return interaction.editReply({ content: `❌ Servidor \`${guildId}\` no encontrado.` });

        const displayId = guild?.id;
        const cfg       = displayId ? (db.get('guilds', displayId, {}).security || {}) : {};
        const flags     = displayId ? db.get('security_flags', displayId) || {} : {};
        const alerts    = displayId ? security.getAlerts(displayId, 5) : [];

        const embed = new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle(`🛡️ Security Status${guild ? ` — ${guild.name}` : ' — Global'}`)
          .addFields(
            { name: '🔗 Anti-Phishing',    value: cfg.antiPhishing    ? '✅ Activo' : '❌ Inactivo', inline: true },
            { name: '📨 Anti-Invite',      value: cfg.antiInviteSpam  ? '✅ Activo' : '❌ Inactivo', inline: true },
            { name: '🔔 Anti-Mention',     value: cfg.antiMassMention ? `✅ (máx ${cfg.massMentionLimit || 6})` : '❌ Inactivo', inline: true },
            { name: '👶 Anti-Alt',         value: cfg.antiAlt         ? `✅ (${cfg.minAccountAge || 7}d, ${cfg.altAction || 'warn'})` : '❌ Inactivo', inline: true },
            { name: '👻 Anti-Ghost Ping',  value: cfg.antiGhostPing   ? '✅ Activo' : '❌ Inactivo', inline: true },
            { name: '🤖 Auto-Protect',     value: cfg.autoProtect     ? '✅ Activo' : '❌ Inactivo', inline: true },
            { name: '🚨 Usuarios flagged', value: `${Object.keys(flags).length}`, inline: true },
            { name: '📋 Alertas recientes', value: alerts.length ? alerts.slice(0,3).map(a => `[${a.severity}] ${a.title}`).join('\n') : 'Ninguna', inline: false }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      // ── security alerts ─────────────────────────────────────────────────
      if (sub === 'alerts') {
        const guildId = interaction.options.getString('serverid') || null;
        const guild   = guildId ? client.guilds.cache.get(guildId) : null;
        const alerts  = security.getAlerts(guildId || 'global', 20);

        if (!alerts.length) return interaction.editReply({ content: '✅ Sin alertas recientes.' });

        const severityIcon = { LOW: '🟡', MEDIUM: '🟠', HIGH: '🔴', CRITICAL: '🆘' };
        const lines = alerts.slice(0, 15).map(a =>
          `${severityIcon[a.severity] || '⚪'} **${a.title}** — <t:${Math.floor(a.ts/1000)}:R>\n└ ${a.desc.slice(0,80)}`
        ).join('\n');

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0xFF9900)
          .setTitle(`🚨 Security Alerts${guild ? ` — ${guild.name}` : ''}`)
          .setDescription(lines)
          .setTimestamp()] });
      }

      // ── security alts ────────────────────────────────────────────────────
      if (sub === 'alts') {
        const guildId = interaction.options.getString('serverid');
        const guild   = client.guilds.cache.get(guildId);
        if (!guild) return interaction.editReply({ content: `❌ Servidor \`${guildId}\` no encontrado.` });

        const alts = security.getAltsList(guildId, 25);
        if (!alts.length) return interaction.editReply({ content: '✅ Sin alt accounts registradas.' });

        const lines = alts.map(a => `<@${a.userId}> — \`${a.tag}\` — **${a.ageDays}d** — <t:${Math.floor(a.ts/1000)}:R>`).join('\n');
        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0xFFFF00)
          .setTitle(`👶 Alt Accounts Detectadas — ${guild.name} (${alts.length})`)
          .setDescription(lines.slice(0, 2000))
          .setTimestamp()] });
      }

      // ── security config ──────────────────────────────────────────────────
      if (sub === 'config') {
        const guildId = interaction.options.getString('serverid');
        const guild   = client.guilds.cache.get(guildId);
        if (!guild) return interaction.editReply({ content: `❌ Servidor \`${guildId}\` no encontrado.` });

        const cfg = db.get('guilds', guildId, {});
        if (!cfg.security) cfg.security = {};

        const keys = ['antiphishing','antiinvite','antimention','antialt','ghostping','autoprotect'];
        const props = { antiphishing:'antiPhishing', antiinvite:'antiInviteSpam', antimention:'antiMassMention', antialt:'antiAlt', ghostping:'antiGhostPing', autoprotect:'autoProtect' };

        for (const k of keys) {
          const val = interaction.options.getBoolean(k);
          if (val !== null) cfg.security[props[k]] = val;
        }

        const minAge  = interaction.options.getInteger('minaccountage');
        const maxMenc = interaction.options.getInteger('maxmentions');
        const altAct  = interaction.options.getString('altaction');
        const logCh   = interaction.options.getString('logchannel');

        if (minAge  !== null) cfg.security.minAccountAge   = minAge;
        if (maxMenc !== null) cfg.security.massMentionLimit = maxMenc;
        if (altAct)           cfg.security.altAction        = altAct;
        if (logCh)            cfg.securityLog               = logCh;

        db.set('guilds', guildId, cfg);

        const s = cfg.security;
        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle(`✅ Security Config Actualizado — ${guild.name}`)
          .addFields(
            { name: '🔗 Anti-Phishing',   value: s.antiPhishing    ? '✅' : '❌', inline: true },
            { name: '📨 Anti-Invite',     value: s.antiInviteSpam  ? '✅' : '❌', inline: true },
            { name: '🔔 Anti-Mention',    value: s.antiMassMention ? `✅ (${s.massMentionLimit||6})` : '❌', inline: true },
            { name: '👶 Anti-Alt',        value: s.antiAlt         ? `✅ (${s.minAccountAge||7}d, ${s.altAction||'warn'})` : '❌', inline: true },
            { name: '👻 Ghost Ping',      value: s.antiGhostPing   ? '✅' : '❌', inline: true },
            { name: '🤖 Auto-Protect',    value: s.autoProtect     ? '✅' : '❌', inline: true }
          )
          .setTimestamp()] });
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // MONITOR GROUP
    // ════════════════════════════════════════════════════════════════════════
    if (group === 'monitor') {

      if (sub === 'start') {
        const intervalMin = interaction.options.getInteger('intervalo') || 5;
        const maxRam      = interaction.options.getInteger('maxram')     || 400;
        const maxRss      = interaction.options.getInteger('maxrss')     || 600;

        db.set('bot_config', 'vps_monitor', { intervalMinutes: intervalMin, maxRamMB: maxRam, maxRssMB: maxRss, active: true, startedAt: Date.now() });
        security.stopVPSMonitor();
        security.startVPSMonitor(client);

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('✅ VPS Monitor Iniciado')
          .addFields(
            { name: '⏱️ Intervalo',  value: `${intervalMin} minutos`, inline: true },
            { name: '💾 Alerta RAM', value: `>${maxRam} MB`, inline: true },
            { name: '🧠 Alerta RSS', value: `>${maxRss} MB`, inline: true }
          )
          .setDescription('Recibirás DMs si se detectan problemas.')
          .setTimestamp()] });
      }

      if (sub === 'stop') {
        security.stopVPSMonitor();
        db.set('bot_config', 'vps_monitor', { ...(db.get('bot_config', 'vps_monitor') || {}), active: false });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setTitle('🛑 VPS Monitor Detenido').setTimestamp()] });
      }

      if (sub === 'status') {
        const cfg   = db.get('bot_config', 'vps_monitor') || {};
        const last  = db.get('bot_config', 'last_monitor_check') || null;
        const mem   = process.memoryUsage();

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(cfg.active ? 0x00FF88 : 0x888888)
          .setTitle('📡 VPS Monitor Status')
          .addFields(
            { name: 'Estado',     value: cfg.active ? '✅ Activo' : '❌ Inactivo', inline: true },
            { name: 'Intervalo',  value: `${cfg.intervalMinutes || 5} min`, inline: true },
            { name: 'Alerta RAM', value: `>${cfg.maxRamMB || 400} MB`, inline: true },
            { name: 'RAM actual', value: `${(mem.heapUsed/1024/1024).toFixed(1)} MB heap / ${(mem.rss/1024/1024).toFixed(1)} MB RSS`, inline: false },
            { name: 'Última verificación', value: last ? `<t:${Math.floor(last.ts/1000)}:R>` : 'Nunca', inline: true }
          )
          .setTimestamp()] });
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // USERLOOKUP
    // ════════════════════════════════════════════════════════════════════════
    if (sub === 'userlookup') {
      const user    = interaction.options.getUser('usuario');
      const guildId = interaction.options.getString('serverid') || interaction.guildId;

      const warns   = db.get('warns', guildId) || {};
      const modlogs = db.get('modlogs', guildId) || {};
      const economy = db.get('economy', `${guildId}_${user.id}`) || db.get('economy', user.id) || {};
      const levels  = db.get('levels', `${guildId}_${user.id}`) || {};
      const secFlags = security.getUserFlags(user.id, guildId);
      const premium = db.get('premium', user.id);

      const userWarns = warns[user.id] || [];
      const userLogs  = (modlogs[user.id] || []).slice(0, 5);

      const accountAge = Math.floor((Date.now() - user.createdTimestamp) / (1000*60*60*24));

      const embed = new EmbedBuilder()
        .setColor(0x6366f1)
        .setTitle(`🔍 User Lookup — ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '👤 Info', value: `ID: \`${user.id}\`\nCuenta creada: <t:${Math.floor(user.createdTimestamp/1000)}:D> (${accountAge}d)\nBot: ${user.bot ? '✅ Sí' : '❌ No'}`, inline: false },
          { name: '⚠️ Warns', value: `${userWarns.length} avisos`, inline: true },
          { name: '📋 Mod Actions', value: `${userLogs.length} registros`, inline: true },
          { name: '🚨 Security Score', value: `${secFlags.score} flags`, inline: true },
          { name: '⭐ Nivel', value: levels.level ? `Nivel ${levels.level} (${levels.xp || 0} XP)` : 'Sin datos', inline: true },
          { name: '💰 Economía', value: `Wallet: ${economy.coins || 0} | Bank: ${economy.bank || 0}`, inline: true },
          { name: '👑 Premium', value: premium?.active ? `✅ ${premium.plan} hasta <t:${Math.floor(premium.expiresAt/1000)}:D>` : '❌ No premium', inline: true }
        );

      if (secFlags.flags.length > 0) {
        const flagLines = secFlags.flags.slice(0, 5).map(f => `\`${f.reason}\` — <t:${Math.floor(f.ts/1000)}:R>`).join('\n');
        embed.addFields({ name: '🚨 Security Flags', value: flagLines, inline: false });
      }

      if (userLogs.length > 0) {
        const logLines = userLogs.map(l => `[${l.action}] ${l.reason?.slice(0,40) || 'Sin razón'} — <t:${Math.floor(l.ts/1000)}:R>`).join('\n');
        embed.addFields({ name: '📋 Acciones recientes', value: logLines, inline: false });
      }

      embed.setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    // ════════════════════════════════════════════════════════════════════════
    // EXPORTLOGS
    // ════════════════════════════════════════════════════════════════════════
    if (sub === 'exportlogs') {
      const tipo    = interaction.options.getString('tipo');
      const guildId = interaction.options.getString('serverid') || interaction.guildId;

      let data;
      if (['blacklist', 'analytics'].includes(tipo)) {
        data = db.all(tipo);
      } else if (guildId) {
        data = db.get(tipo, guildId) || db.all(tipo);
      } else {
        data = db.all(tipo);
      }

      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return interaction.editReply({ content: `⚠️ Sin datos en \`${tipo}\`.` });
      }

      const json   = JSON.stringify({ tipo, guildId, exportedAt: new Date().toISOString(), data }, null, 2);
      const buffer = Buffer.from(json, 'utf8');
      const file   = new AttachmentBuilder(buffer, { name: `${tipo}_${Date.now()}.json` });

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle(`📤 Export — ${tipo}`)
          .setDescription(`Tamaño: **${(buffer.length / 1024).toFixed(1)} KB**`)
          .setTimestamp()],
        files: [file]
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // INVESTIGATE GROUP
    // ════════════════════════════════════════════════════════════════════════
    if (group === 'investigate') {

      // ── investigate user ─────────────────────────────────────────────────
      if (sub === 'user') {
        const user    = interaction.options.getUser('usuario');
        const guildId = interaction.options.getString('serverid') || interaction.guildId;
        const guild   = client.guilds.cache.get(guildId);

        const report   = reputation.generateReport(user.id, guildId, user);
        const { trust, summary } = report;
        const secFlags = security.getUserFlags(user.id, guildId);
        const premium  = db.get('premium', user.id);

        const accountAge = ((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24)).toFixed(1);
        const createdTs  = Math.floor(user.createdTimestamp / 1000);

        const riskBar = trust.score >= 81 ? '🟩🟩🟩🟩🟩' :
                        trust.score >= 61 ? '🟩🟩🟩🟨⬜' :
                        trust.score >= 31 ? '🟨🟨⬜⬜⬜' :
                                            '🟥🟥🟥🟥🟥';

        const embed = new EmbedBuilder()
          .setColor(trust.score >= 61 ? 0x00FF88 : trust.score >= 31 ? 0xFFCC00 : 0xFF4444)
          .setTitle(`🔍 Investigación — ${user.tag}`)
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: '👤 Identidad',      value: `ID: \`${user.id}\`\nBot: ${user.bot ? '✅' : '❌'}\nCuenta creada: <t:${createdTs}:D> (${accountAge}d)`, inline: true },
            { name: `${trust.badge.icon} Trust Score`, value: `**${trust.score}/100** — ${trust.badge.label}\n${riskBar}`, inline: true },
            { name: '📊 Historial',      value: `Warns: **${summary.warns}**\nMod actions: **${summary.modActions}**\nSecurity flags: **${secFlags.score}**\nPremium: ${premium?.active ? '✅' : '❌'}`, inline: false },
            { name: '🚨 Factores de Riesgo', value: trust.riskFactors.length ? trust.riskFactors.map(r => `• ${r}`).join('\n') : '✅ Sin factores de riesgo', inline: false },
            { name: '📈 Breakdown',      value: trust.breakdown.join('\n') || 'N/A', inline: false }
          );

        if (secFlags.flags.length > 0) {
          const flagLines = secFlags.flags.slice(0, 5).map(f => `\`${f.reason}\` — <t:${Math.floor(f.ts / 1000)}:R>`).join('\n');
          embed.addFields({ name: '🚩 Security Flags recientes', value: flagLines });
        }

        // Check if in any guild together
        const mutualGuilds = client.guilds.cache.filter(g => g.members.cache.has(user.id)).size;
        embed.addFields({ name: '🌐 Presencia', value: `Servidores mutuos: **${mutualGuilds}**${guild ? `\nEn ${guild.name}: ${guild.members.cache.has(user.id) ? '✅' : '❌'}` : ''}`, inline: true });
        embed.setTimestamp().setFooter({ text: 'System 777 · Investigate · Owner Only' });

        return interaction.editReply({ embeds: [embed] });
      }

      // ── investigate server ───────────────────────────────────────────────
      if (sub === 'server') {
        const guildId = interaction.options.getString('serverid');
        const guild   = client.guilds.cache.get(guildId);
        if (!guild) return interaction.editReply({ content: `❌ Servidor \`${guildId}\` no encontrado.` });

        await guild.members.fetch().catch(() => {});
        const health = reputation.calcServerHealth(guild, guildId);
        const cases  = db.get('mod_cases', guildId) || {};
        const caseCount = Object.keys(cases).length;
        const openCases = Object.values(cases).filter(c => c.status === 'open').length;
        const alerts = security.getAlerts(guildId, 5);

        const riskBar = health.score >= 81 ? '🟩🟩🟩🟩🟩' :
                        health.score >= 61 ? '🟩🟩🟩🟨⬜' :
                        health.score >= 31 ? '🟨🟨⬜⬜⬜' :
                                             '🟥🟥🟥🟥🟥';

        const embed = new EmbedBuilder()
          .setColor(health.score >= 61 ? 0x00FF88 : health.score >= 31 ? 0xFFCC00 : 0xFF4444)
          .setTitle(`🔍 Análisis de Servidor — ${guild.name}`)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: '📊 Stats', value: `Miembros: **${guild.memberCount}**\nBots: **${health.stats.bots}** (${health.stats.botRatio}%)\nCanales: **${guild.channels.cache.size}**\nRoles: **${guild.roles.cache.size}**`, inline: true },
            { name: `${health.badge.icon} Health Score`, value: `**${health.score}/100** — ${health.badge.label}\n${riskBar}`, inline: true },
            { name: '🔒 Seguridad', value: `Usuarios flaggeados: **${health.stats.flagged}**\nAlts detectadas: **${health.stats.alts}**\nWarns totales: **${health.stats.warnTotal}**`, inline: false },
            { name: '📋 Casos', value: `Total: **${caseCount}** | Abiertos: **${openCases}**`, inline: true },
            { name: '🚨 Alertas recientes', value: alerts.slice(0, 3).map(a => `[${a.severity}] ${a.title}`).join('\n') || 'Ninguna', inline: false },
            { name: '⚠️ Issues', value: health.issues.length ? health.issues.map(i => `• ${i}`).join('\n') : '✅ Sin issues detectados', inline: false }
          )
          .setTimestamp().setFooter({ text: 'System 777 · Investigate · Owner Only' });

        return interaction.editReply({ embeds: [embed] });
      }

      // ── investigate risk ─────────────────────────────────────────────────
      if (sub === 'risk') {
        const guildId   = interaction.options.getString('serverid');
        const guild     = client.guilds.cache.get(guildId);
        if (!guild) return interaction.editReply({ content: `❌ Servidor \`${guildId}\` no encontrado.` });

        await interaction.editReply({ content: `🔍 Analizando ${guild.memberCount} miembros...` });
        await guild.members.fetch().catch(() => {});

        const scores = [];
        for (const [id, member] of guild.members.cache) {
          if (member.user.bot) continue;
          const t = reputation.calcTrustScore(id, guildId, member.user);
          if (t.score <= 40) scores.push({ id, tag: member.user.tag, score: t.score, badge: t.badge, risks: t.riskFactors });
        }
        scores.sort((a, b) => a.score - b.score);

        if (!scores.length) return interaction.editReply({ content: null, embeds: [new EmbedBuilder().setColor(0x00FF88).setTitle('✅ Sin usuarios de alto riesgo').setDescription(`Ningún miembro con score ≤40 en ${guild.name}.`)] });

        const lines = scores.slice(0, 15).map(s =>
          `${s.badge.icon} \`${s.score}\` **${s.tag}** — ${s.risks.slice(0, 2).join(', ') || 'flags detectados'}`
        ).join('\n');

        return interaction.editReply({ content: null, embeds: [new EmbedBuilder()
          .setColor(0xFF9900)
          .setTitle(`🚨 Risk Scan — ${guild.name} (${scores.length} usuarios ≤40)`)
          .setDescription(lines)
          .setTimestamp().setFooter({ text: 'System 777 · Risk Analysis · Owner Only' })] });
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // EMERGENCY GROUP
    // ════════════════════════════════════════════════════════════════════════
    if (group === 'emergency') {

      const guildId = interaction.options.getString('serverid');
      const guild   = client.guilds.cache.get(guildId);
      if (!guild) return interaction.editReply({ content: `❌ Servidor \`${guildId}\` no encontrado.` });

      // ── emergency lockdown ───────────────────────────────────────────────
      if (sub === 'lockdown') {
        const razon    = interaction.options.getString('razon') || 'Emergency lockdown por owner';
        const snapshot = {};
        let locked     = 0;

        for (const ch of guild.channels.cache.values()) {
          if (!ch.isTextBased()) continue;
          const overwrite = ch.permissionOverwrites.cache.get(guild.roles.everyone.id);
          snapshot[ch.id] = overwrite ? { allow: overwrite.allow.bitfield.toString(), deny: overwrite.deny.bitfield.toString() } : null;
          await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, AddReactions: false }, { reason: razon }).catch(() => {});
          locked++;
        }

        db.set('emergency_snapshots', guildId, { snapshot, ts: Date.now(), reason: razon });

        await security.sendAlert(client, guild, 'EMERGENCY LOCKDOWN', `${locked} canales bloqueados. Razón: ${razon}`, 0xFF0000, 'CRITICAL');

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔒 EMERGENCY LOCKDOWN ACTIVADO')
          .addFields(
            { name: 'Servidor',        value: guild.name, inline: true },
            { name: 'Canales bloqueados', value: `${locked}`, inline: true },
            { name: 'Razón',           value: razon, inline: false }
          )
          .setDescription('Usa `/admin emergency unlock` para restaurar.')
          .setTimestamp()] });
      }

      // ── emergency unlock ─────────────────────────────────────────────────
      if (sub === 'unlock') {
        const saved = db.get('emergency_snapshots', guildId);
        if (!saved) return interaction.editReply({ content: '⚠️ Sin snapshot guardado. Restaurando permisos default...' });

        let restored = 0;
        for (const [chId, perms] of Object.entries(saved.snapshot)) {
          const ch = guild.channels.cache.get(chId);
          if (!ch) continue;
          if (perms === null) {
            await ch.permissionOverwrites.delete(guild.roles.everyone, 'Emergency unlock').catch(() => {});
          } else {
            const { PermissionsBitField } = require('discord.js');
            await ch.permissionOverwrites.edit(guild.roles.everyone, {
              SendMessages: null,
              AddReactions: null,
            }, { reason: 'Emergency unlock' }).catch(() => {});
          }
          restored++;
        }

        db.del('emergency_snapshots', guildId);
        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('🔓 Emergency Unlock — Completado')
          .addFields({ name: 'Canales restaurados', value: `${restored}`, inline: true })
          .setTimestamp()] });
      }

      // ── emergency scan ───────────────────────────────────────────────────
      if (sub === 'scan') {
        const minDays  = interaction.options.getInteger('mindays') || 7;
        await interaction.editReply({ content: `🔍 Escaneando ${guild.memberCount} miembros...` });

        await guild.members.fetch();
        const now      = Date.now();
        const newAccs  = [];
        const bots     = [];
        const flagged  = [];
        const secFlags = db.get('security_flags', guildId) || {};

        for (const [id, member] of guild.members.cache) {
          const ageDays = (now - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
          if (member.user.bot) { bots.push(member.user.tag); continue; }
          if (ageDays < minDays) newAccs.push({ tag: member.user.tag, id, days: ageDays.toFixed(1) });
          if (secFlags[id]?.score >= 2) flagged.push({ tag: member.user.tag, id, score: secFlags[id].score });
        }

        const newLines  = newAccs.slice(0, 10).map(m => `\`${m.days}d\` ${m.tag}`).join('\n') || 'Ninguna';
        const flagLines = flagged.slice(0, 10).map(m => `score:${m.score} — ${m.tag}`).join('\n') || 'Ninguno';

        return interaction.editReply({ content: null, embeds: [new EmbedBuilder()
          .setColor(0xFF9900)
          .setTitle(`🔍 Security Scan — ${guild.name}`)
          .addFields(
            { name: `👶 Cuentas nuevas (<${minDays}d) — ${newAccs.length}`, value: newLines, inline: false },
            { name: `🚨 Usuarios flaggeados — ${flagged.length}`, value: flagLines, inline: false },
            { name: `🤖 Bots — ${bots.length}`, value: bots.slice(0, 5).join(', ') || 'Ninguno', inline: false }
          )
          .setTimestamp()] });
      }

      // ── emergency panic ──────────────────────────────────────────────────
      if (sub === 'panic') {
        const snapshot = {};
        let count      = 0;

        // 1. Lockdown all text channels + 120s slowmode
        for (const ch of guild.channels.cache.values()) {
          if (!ch.isTextBased()) continue;
          const ow = ch.permissionOverwrites.cache.get(guild.roles.everyone.id);
          snapshot[ch.id] = ow ? { allow: ow.allow.bitfield.toString(), deny: ow.deny.bitfield.toString() } : null;
          await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, AddReactions: false }, { reason: 'PANIC MODE' }).catch(() => {});
          await ch.setRateLimitPerUser(120, 'PANIC MODE').catch(() => {});
          count++;
        }

        // 2. Disable all invites
        const invites = await guild.invites.fetch().catch(() => null);
        if (invites) for (const inv of invites.values()) await inv.delete('PANIC MODE').catch(() => {});

        db.set('emergency_snapshots', guildId, { snapshot, ts: Date.now(), reason: 'PANIC MODE' });
        await security.sendAlert(client, guild, '🆘 PANIC MODE ACTIVATED', `${count} canales bloqueados + slowmode 120s + invites deshabilitados`, 0xFF0000, 'CRITICAL');

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🆘 PANIC MODE ACTIVADO')
          .setDescription('**Acciones tomadas:**\n✅ Todos los canales bloqueados\n✅ Slowmode 120s en todos los canales\n✅ Todas las invites eliminadas')
          .addFields({ name: 'Para desactivar', value: '`/admin emergency unlock`', inline: false })
          .setTimestamp()] });
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // BACKUP GROUP
    // ════════════════════════════════════════════════════════════════════════
    if (group === 'backup') {

      const guildId = interaction.options.getString('serverid');
      const guild   = client.guilds.cache.get(guildId);
      if (!guild) return interaction.editReply({ content: `❌ Servidor \`${guildId}\` no encontrado.` });

      // ── backup create ────────────────────────────────────────────────────
      if (sub === 'create') {
        await interaction.editReply({ content: `💾 Creando backup de **${guild.name}**...` });

        await guild.roles.fetch();
        await guild.channels.fetch();

        const rolesData    = guild.roles.cache
          .filter(r => !r.managed && r.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => ({ id: r.id, name: r.name, color: r.color, permissions: r.permissions.bitfield.toString(), hoist: r.hoist, mentionable: r.mentionable, position: r.position }));

        const channelsData = guild.channels.cache
          .map(c => ({
            id: c.id, name: c.name, type: c.type, parentId: c.parentId || null,
            position: c.position, topic: c.topic || null, nsfw: c.nsfw || false,
            rateLimitPerUser: c.rateLimitPerUser || 0
          }));

        const guildCfg = db.get('guilds', guildId, {});

        const backupId = `bk_${Date.now()}`;
        const backup   = {
          id: backupId, guildId, guildName: guild.name,
          iconURL: guild.iconURL(),
          memberCount: guild.memberCount,
          ts: Date.now(),
          roles: rolesData,
          channels: channelsData,
          config: guildCfg
        };

        const existing = db.get('server_backups', guildId) || {};
        existing[backupId] = backup;
        // Keep max 5 backups
        const keys = Object.keys(existing).sort();
        while (keys.length > 5) { delete existing[keys.shift()]; keys.shift(); }
        db.set('server_backups', guildId, existing);

        return interaction.editReply({ content: null, embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('💾 Backup Creado')
          .addFields(
            { name: 'ID',       value: `\`${backupId}\``, inline: true },
            { name: 'Servidor', value: guild.name,         inline: true },
            { name: 'Roles',    value: `${rolesData.length}`,  inline: true },
            { name: 'Canales',  value: `${channelsData.length}`, inline: true }
          )
          .setTimestamp()] });
      }

      // ── backup list ──────────────────────────────────────────────────────
      if (sub === 'list') {
        const backups = db.get('server_backups', guildId) || {};
        const entries = Object.values(backups).sort((a, b) => b.ts - a.ts);
        if (!entries.length) return interaction.editReply({ content: '⚠️ Sin backups para este servidor.' });

        const lines = entries.map(b => `\`${b.id}\` — <t:${Math.floor(b.ts / 1000)}:R> — ${b.roles?.length || 0} roles, ${b.channels?.length || 0} canales`).join('\n');
        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle(`💾 Backups — ${guild.name} (${entries.length})`)
          .setDescription(lines)
          .setTimestamp()] });
      }

      // ── backup restore ───────────────────────────────────────────────────
      if (sub === 'restore') {
        const backupId = interaction.options.getString('backupid') || 'latest';
        const backups  = db.get('server_backups', guildId) || {};
        let backup;

        if (backupId === 'latest') {
          backup = Object.values(backups).sort((a, b) => b.ts - a.ts)[0];
        } else {
          backup = backups[backupId];
        }

        if (!backup) return interaction.editReply({ content: `❌ Backup \`${backupId}\` no encontrado.` });

        await interaction.editReply({ content: `♻️ Restaurando desde backup \`${backup.id}\` (${new Date(backup.ts).toLocaleString()})...` });

        let restoredRoles = 0;
        for (const saved of backup.roles) {
          const role = guild.roles.cache.get(saved.id);
          if (!role || role.managed) continue;
          try {
            await role.edit({ name: saved.name, color: saved.color }, 'Backup restore');
            restoredRoles++;
          } catch {}
        }

        if (backup.config) db.set('guilds', guildId, backup.config);

        return interaction.editReply({ content: null, embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('♻️ Backup Restaurado')
          .addFields(
            { name: 'Backup ID', value: `\`${backup.id}\``, inline: true },
            { name: 'Fecha',     value: `<t:${Math.floor(backup.ts / 1000)}:F>`, inline: true },
            { name: 'Roles restaurados', value: `${restoredRoles}`, inline: true }
          )
          .setDescription('Nombres y colores de roles restaurados. La config del servidor fue restaurada.')
          .setTimestamp()] });
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // STAFF GROUP
    // ════════════════════════════════════════════════════════════════════════
    if (group === 'staff') {
      const { RANKS } = staffSys;

      // ── staff add ────────────────────────────────────────────────────────
      if (sub === 'add') {
        const user = interaction.options.getUser('usuario');
        const rank = interaction.options.getString('rango');
        const nota = interaction.options.getString('nota') || '';

        if (user.id === process.env.OWNER_ID)
          return interaction.editReply({ content: '❌ El owner ya tiene acceso completo por defecto.' });
        if (staffSys.getMember(user.id))
          return interaction.editReply({ content: `⚠️ ${user.tag} ya es staff. Usa \`promote\` para cambiar rango.` });

        staffSys.addMember(user.id, rank, interaction.user.id, nota);
        const rInfo = RANKS[rank];

        try {
          await user.send({ embeds: [new EmbedBuilder()
            .setColor(rInfo.color)
            .setTitle(`${rInfo.icon} Bienvenido al Staff de System 777`)
            .setDescription(`Has sido añadido como **${rInfo.label}**.\n${nota ? `\n📝 ${nota}` : ''}`)
            .setTimestamp()] });
        } catch {}

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(rInfo.color)
          .setTitle(`${rInfo.icon} Staff Añadido`)
          .addFields(
            { name: 'Usuario', value: `${user.tag} (\`${user.id}\`)`, inline: true },
            { name: 'Rango',   value: `${rInfo.icon} ${rInfo.label}`, inline: true },
            ...(nota ? [{ name: 'Nota', value: nota }] : [])
          )
          .setTimestamp()] });
      }

      // ── staff remove ─────────────────────────────────────────────────────
      if (sub === 'remove') {
        const user  = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';
        const ok    = staffSys.removeMember(user.id, interaction.user.id, razon);
        if (!ok) return interaction.editReply({ content: `❌ ${user.tag} no está en el staff.` });

        try {
          await user.send({ embeds: [new EmbedBuilder()
            .setColor(0xFF4444)
            .setTitle('❌ Removido del staff de System 777')
            .setDescription(`Razón: ${razon}`)
            .setTimestamp()] });
        } catch {}

        return interaction.editReply({ content: `✅ **${user.tag}** removido del staff. Razón: ${razon}` });
      }

      // ── staff list ───────────────────────────────────────────────────────
      if (sub === 'list') {
        const members = staffSys.listStaff();
        if (!members.length) return interaction.editReply({ content: '📋 No hay miembros en el staff.' });

        const lines = await Promise.all(members.map(async m => {
          const rInfo   = RANKS[m.rank];
          let tag       = m.userId;
          try { const u = await client.users.fetch(m.userId); tag = u.tag; } catch {}
          const seen = m.lastSeen ? `<t:${Math.floor(m.lastSeen/1000)}:R>` : 'Nunca';
          return `${rInfo.icon} **${rInfo.label}** — ${tag}\n  └ Acciones: ${m.actions || 0} · Último: ${seen}`;
        }));

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle(`👥 Staff de System 777 (${members.length})`)
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'System 777 · Staff Panel · Owner Only' })
          .setTimestamp()] });
      }

      // ── staff info ───────────────────────────────────────────────────────
      if (sub === 'info') {
        const user   = interaction.options.getUser('usuario');
        const member = staffSys.getMember(user.id);
        if (!member) return interaction.editReply({ content: `❌ ${user.tag} no está en el staff.` });

        const rInfo   = RANKS[member.rank];
        const tasks   = staffSys.getTasksFor(user.id);
        const pending = tasks.filter(t => t.status === 'pending').length;

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(rInfo.color)
          .setTitle(`${rInfo.icon} Staff — ${user.tag}`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: 'Rango',            value: `${rInfo.icon} ${rInfo.label}`, inline: true },
            { name: 'Acciones',         value: `${member.actions || 0}`,       inline: true },
            { name: 'Añadido',          value: `<t:${Math.floor(member.addedAt/1000)}:R>`, inline: true },
            { name: 'Última actividad', value: member.lastSeen ? `<t:${Math.floor(member.lastSeen/1000)}:R>` : 'Nunca', inline: true },
            { name: 'Tareas pendientes', value: `${pending}`, inline: true },
            ...(member.note ? [{ name: 'Nota interna', value: member.note }] : [])
          )
          .setTimestamp()] });
      }

      // ── staff promote ────────────────────────────────────────────────────
      if (sub === 'promote') {
        const user    = interaction.options.getUser('usuario');
        const newRank = interaction.options.getString('rango');
        const ok      = staffSys.setRank(user.id, newRank, interaction.user.id);
        if (!ok) return interaction.editReply({ content: `❌ ${user.tag} no está en el staff. Usa \`add\` primero.` });

        const rInfo = RANKS[newRank];
        try {
          await user.send({ embeds: [new EmbedBuilder()
            .setColor(rInfo.color)
            .setTitle(`${rInfo.icon} Tu rango en System 777 fue actualizado`)
            .setDescription(`Ahora eres **${rInfo.label}**.`)
            .setTimestamp()] });
        } catch {}

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(rInfo.color)
          .setTitle('✅ Rango actualizado')
          .addFields(
            { name: 'Usuario',     value: user.tag,                        inline: true },
            { name: 'Nuevo rango', value: `${rInfo.icon} ${rInfo.label}`,  inline: true }
          )
          .setTimestamp()] });
      }

      // ── staff logs ───────────────────────────────────────────────────────
      if (sub === 'logs') {
        const cantidad = interaction.options.getInteger('cantidad') || 10;
        const logs     = staffSys.getAuditLog(cantidad);
        if (!logs.length) return interaction.editReply({ content: '📋 Sin registros en el audit log.' });

        const ACTION_ICONS = { add_staff: '➕', remove_staff: '➖', change_rank: '🔄' };
        const lines = await Promise.all(logs.map(async l => {
          let byTag = l.byUserId;
          try { const u = await client.users.fetch(l.byUserId); byTag = u.tag; } catch {}
          let targetTag = '';
          if (l.details?.target) {
            try { const u = await client.users.fetch(l.details.target); targetTag = ` → ${u.tag}`; } catch {}
          }
          const icon = ACTION_ICONS[l.action] || '📝';
          return `${icon} **${l.action}** por ${byTag}${targetTag} <t:${Math.floor(l.ts/1000)}:R>`;
        }));

        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle(`📋 Staff Audit Log (${logs.length})`)
          .setDescription(lines.join('\n').slice(0, 4000))
          .setTimestamp()] });
      }
    }
  }
};
