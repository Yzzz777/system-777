const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Configura la protección anti-raid del servidor')
    .addSubcommand(s => s
      .setName('status')
      .setDescription('Ver configuración y estado actual del anti-raid'))
    .addSubcommand(s => s
      .setName('setup')
      .setDescription('Configurar anti-raid básico')
      .addChannelOption(o => o.setName('logs').setDescription('Canal de logs').setRequired(true))
      .addBooleanOption(o => o.setName('new_accounts').setDescription('Bloquear cuentas nuevas (<7 días)'))
      .addBooleanOption(o => o.setName('anti_multicuenta').setDescription('Detectar multi-cuentas'))
      .addBooleanOption(o => o.setName('anti_bots').setDescription('Bloquear bots sin whitelist')))
    .addSubcommand(s => s
      .setName('lockdown')
      .setDescription('Activar lockdown manual — bloquea todos los canales'))
    .addSubcommand(s => s
      .setName('unlock')
      .setDescription('Desactivar lockdown y restaurar todos los canales'))
    .addSubcommand(s => s
      .setName('honeypot')
      .setDescription('Canal trampa — banea automáticamente a quien escriba ahí')
      .addChannelOption(o => o.setName('canal').setDescription('Canal honeypot (omitir para desactivar)')))
    .addSubcommand(s => s
      .setName('threshold')
      .setDescription('Configurar umbrales de detección de raid')
      .addIntegerOption(o => o.setName('warn').setDescription('Joins para ALERTA (default 5)').setMinValue(2).setMaxValue(50))
      .addIntegerOption(o => o.setName('soft').setDescription('Joins para SOFT LOCKDOWN (default 8)').setMinValue(3).setMaxValue(100))
      .addIntegerOption(o => o.setName('hard').setDescription('Joins para HARD LOCKDOWN (default 12)').setMinValue(5).setMaxValue(200))
      .addIntegerOption(o => o.setName('window').setDescription('Ventana de tiempo en segundos (default 10)').setMinValue(5).setMaxValue(300)))
    .addSubcommand(s => s
      .setName('autokick')
      .setDescription('Acción automática cuando se detecta raid')
      .addStringOption(o => o
        .setName('modo')
        .setDescription('Qué hacer con los raiders automáticamente')
        .setRequired(true)
        .addChoices(
          { name: 'Desactivado (solo lockdown)', value: 'off'  },
          { name: 'Auto-kick (expulsar raiders)', value: 'kick' },
          { name: 'Auto-ban (banear raiders)',    value: 'ban'  },
        )))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    // ── setup ────────────────────────────────────────────────────────────────
    if (sub === 'setup') {
      const logCh  = interaction.options.getChannel('logs');
      const newAcc = interaction.options.getBoolean('new_accounts') ?? true;
      const multi  = interaction.options.getBoolean('anti_multicuenta') ?? true;
      const bots   = interaction.options.getBoolean('anti_bots') ?? true;

      const cfg = db.get('guilds', gid, {});
      cfg.logChannel           = logCh.id;
      cfg.antiNewAccount       = newAcc;
      cfg.antiMultiAccount     = multi;
      cfg.antiUnauthorizedBots = bots;
      if (!cfg.antiRaid) cfg.antiRaid = {};
      cfg.antiRaid.enabled = true;
      db.set('guilds', gid, cfg);

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('✅ Anti-Raid Configurado')
          .addFields(
            { name: '📋 Canal de logs',  value: `<#${logCh.id}>`,                           inline: true },
            { name: '🆕 Cuentas nuevas', value: newAcc ? '✅ Activado' : '❌ Desactivado',  inline: true },
            { name: '👥 Multi-cuenta',   value: multi  ? '✅ Activado' : '❌ Desactivado',  inline: true },
            { name: '🤖 Anti-bots',      value: bots   ? '✅ Activado' : '❌ Desactivado',  inline: true },
          )
          .setDescription('Usa `/antiraid threshold` y `/antiraid autokick` para configurar umbrales y acciones automáticas.')
          .setFooter({ text: 'System 777 · Anti-Raid' })]
      });

    // ── status ───────────────────────────────────────────────────────────────
    } else if (sub === 'status') {
      const cfg  = db.get('guilds', gid, {});
      const ar   = cfg.antiRaid || {};
      const { getRaidState, LEVEL } = require('../../systems/antiRaid');
      const state = getRaidState(gid);
      const levelNames = { 0: '✅ Sin raid', 1: '⚠️ ALERTA', 2: '🔶 SOFT LOCKDOWN', 3: '🔴 HARD LOCKDOWN', 4: '💀 CRITICAL' };

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(state.lockdown ? 0xFF0000 : 0x5865F2)
          .setTitle('🛡️ Estado Anti-Raid')
          .addFields(
            { name: '📡 Estado actual',   value: levelNames[state.level] || '✅ Normal',                 inline: true },
            { name: '🔒 Lockdown',        value: state.lockdown ? '🔒 ACTIVO' : '🔓 Inactivo',          inline: true },
            { name: '👥 Joins recientes', value: `${state.recentJoins}`,                                 inline: true },
            { name: '📋 Logs',            value: cfg.logChannel ? `<#${cfg.logChannel}>` : '❌ Sin configurar', inline: true },
            { name: '🆕 Cuentas nuevas',  value: cfg.antiNewAccount        ? '✅' : '❌',               inline: true },
            { name: '👥 Multi-cuenta',    value: cfg.antiMultiAccount      ? '✅' : '❌',               inline: true },
            { name: '🤖 Anti-bots',       value: cfg.antiUnauthorizedBots  ? '✅' : '❌',               inline: true },
            { name: '⚠️ Umbral ALERTA',   value: `${ar.warnThreshold ?? 5} joins`,                      inline: true },
            { name: '🔶 Umbral SOFT',     value: `${ar.softThreshold ?? 8} joins`,                      inline: true },
            { name: '🔴 Umbral HARD',     value: `${ar.hardThreshold ?? 12} joins`,                     inline: true },
            { name: '⏱️ Ventana',         value: `${(ar.windowMs ?? 10000) / 1000}s`,                   inline: true },
            { name: '⚡ Auto-acción',     value: ar.autoBan ? '🔨 Auto-ban' : ar.autoKick ? '👢 Auto-kick' : '❌ Desactivado', inline: true },
            { name: '🍯 Honeypot',        value: ar.honeypotChannel ? `<#${ar.honeypotChannel}>` : '❌ Sin configurar', inline: true },
          )
          .setFooter({ text: 'System 777 · Anti-Raid' })]
      });

    // ── lockdown ─────────────────────────────────────────────────────────────
    } else if (sub === 'lockdown') {
      const { activateLockdown } = require('../../systems/antiRaid');
      const cfg = db.get('guilds', gid, {});
      await activateLockdown(interaction.guild, cfg, 'Lockdown manual por admin');
      await interaction.editReply({ content: '🔒 Lockdown activado. Todos los canales bloqueados.\nUsa `/antiraid unlock` para restaurar.' });

    // ── unlock ───────────────────────────────────────────────────────────────
    } else if (sub === 'unlock') {
      const { deactivateLockdown } = require('../../systems/antiRaid');
      await deactivateLockdown(interaction.guild);
      await interaction.editReply({ content: '🔓 Lockdown desactivado. Canales restaurados a su estado normal.' });

    // ── honeypot ─────────────────────────────────────────────────────────────
    } else if (sub === 'honeypot') {
      const canal = interaction.options.getChannel('canal');
      const cfg   = db.get('guilds', gid, {});
      if (!cfg.antiRaid) cfg.antiRaid = {};
      cfg.antiRaid.honeypotChannel = canal?.id || null;
      db.set('guilds', gid, cfg);

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(canal ? 0xFF9900 : 0x57F287)
          .setTitle(canal ? '🍯 Honeypot Configurado' : '🍯 Honeypot Desactivado')
          .setDescription(canal
            ? `Canal trampa: ${canal}\n\n**Efecto:** Cualquier usuario (no-bot) que envíe un mensaje en ese canal será **baneado automáticamente** y notificado en el canal de logs.\n\n> Pon el canal con permisos visibles para @everyone pero sin permitir hablar — los raiders curiosos caerán solos.`
            : 'El canal honeypot fue desactivado.')
          .setFooter({ text: 'System 777 · Anti-Raid · Honeypot' })]
      });

    // ── threshold ────────────────────────────────────────────────────────────
    } else if (sub === 'threshold') {
      const warn   = interaction.options.getInteger('warn');
      const soft   = interaction.options.getInteger('soft');
      const hard   = interaction.options.getInteger('hard');
      const window = interaction.options.getInteger('window');

      const cfg = db.get('guilds', gid, {});
      if (!cfg.antiRaid) cfg.antiRaid = {};
      if (warn   !== null) cfg.antiRaid.warnThreshold = warn;
      if (soft   !== null) cfg.antiRaid.softThreshold = soft;
      if (hard   !== null) cfg.antiRaid.hardThreshold = hard;
      if (window !== null) cfg.antiRaid.windowMs      = window * 1000;
      db.set('guilds', gid, cfg);

      const ar = cfg.antiRaid;
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('⚙️ Umbrales Anti-Raid Actualizados')
          .addFields(
            { name: '⚠️ ALERTA',        value: `${ar.warnThreshold ?? 5} joins/${(ar.windowMs ?? 10000)/1000}s`,  inline: true },
            { name: '🔶 SOFT LOCKDOWN', value: `${ar.softThreshold ?? 8} joins/${(ar.windowMs ?? 10000)/1000}s`,  inline: true },
            { name: '🔴 HARD LOCKDOWN', value: `${ar.hardThreshold ?? 12} joins/${(ar.windowMs ?? 10000)/1000}s`, inline: true },
          )
          .setDescription('Los cambios toman efecto inmediatamente.')
          .setFooter({ text: 'System 777 · Anti-Raid' })]
      });

    // ── autokick ─────────────────────────────────────────────────────────────
    } else if (sub === 'autokick') {
      const modo = interaction.options.getString('modo');
      const cfg  = db.get('guilds', gid, {});
      if (!cfg.antiRaid) cfg.antiRaid = {};
      cfg.antiRaid.autoKick = modo === 'kick';
      cfg.antiRaid.autoBan  = modo === 'ban';
      db.set('guilds', gid, cfg);

      const desc = {
        off:  '❌ Acción automática desactivada. El bot solo aplicará lockdown al detectar raid.',
        kick: '👢 **Auto-kick** activado. Los raiders recientes serán expulsados automáticamente en HARD LOCKDOWN.',
        ban:  '🔨 **Auto-ban** activado. Los raiders recientes serán baneados automáticamente en HARD LOCKDOWN.',
      };

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(modo === 'ban' ? 0xFF0000 : modo === 'kick' ? 0xFF6600 : 0x57F287)
          .setTitle('⚡ Acción Anti-Raid Configurada')
          .setDescription(desc[modo])
          .setFooter({ text: 'System 777 · Anti-Raid' })]
      });
    }
  }
};
