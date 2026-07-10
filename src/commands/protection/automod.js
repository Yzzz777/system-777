const {
  SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags,
  AutoModerationRuleKeywordPresetType, AutoModerationActionType, AutoModerationRuleTriggerType
} = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('🤖 Sistema de auto-moderación')

    .addSubcommand(s => s
      .setName('setup')
      .setDescription('⚙️ Configura AutoMod nativo de Discord')
      .addChannelOption(o => o.setName('log').setDescription('Canal de alertas').setRequired(true))
      .addBooleanOption(o => o.setName('profanidad').setDescription('Bloquear palabrotas').setRequired(true))
      .addBooleanOption(o => o.setName('menciones').setDescription('Anti-menciones masivas').setRequired(true))
      .addIntegerOption(o => o.setName('max_menciones').setDescription('Máx menciones (default: 5)').setMinValue(2).setMaxValue(30)))

    .addSubcommand(s => s
      .setName('flood')
      .setDescription('🚨 Anti-flood (mensajes rápidos)')
      .addBooleanOption(o => o.setName('activo').setDescription('Activar/desactivar').setRequired(true))
      .addIntegerOption(o => o.setName('limite').setDescription('Msgs en 5s antes de actuar (default: 5)').setMinValue(3).setMaxValue(15)))

    .addSubcommand(s => s
      .setName('antilink')
      .setDescription('🔗 Bloquear links externos')
      .addBooleanOption(o => o.setName('activo').setDescription('Activar/desactivar').setRequired(true)))

    .addSubcommand(s => s
      .setName('anticaps')
      .setDescription('🔡 Bloquear mensajes con >70% mayúsculas')
      .addBooleanOption(o => o.setName('activo').setDescription('Activar/desactivar').setRequired(true)))

    .addSubcommand(s => s
      .setName('antiemoji')
      .setDescription('😵 Limitar emojis por mensaje')
      .addBooleanOption(o => o.setName('activo').setDescription('Activar/desactivar').setRequired(true))
      .addIntegerOption(o => o.setName('limite').setDescription('Máx emojis (default: 8)').setMinValue(1).setMaxValue(50)))

    .addSubcommand(s => s
      .setName('wordfilter')
      .setDescription('🚫 Filtro de palabras personalizado')
      .addStringOption(o => o.setName('accion').setDescription('add / remove / list').setRequired(true))
      .addStringOption(o => o.setName('palabra').setDescription('Palabra a añadir/quitar')))

    .addSubcommand(s => s
      .setName('status')
      .setDescription('📊 Ver estado actual del AutoMod'))

    .addSubcommand(s => s
      .setName('preset')
      .setDescription('⚡ Aplicar nivel de seguridad predefinido')
      .addStringOption(o => o.setName('nivel').setDescription('Nivel de seguridad').setRequired(true)
        .addChoices(
          { name: '🟢 LOW — Básico', value: 'low' },
          { name: '🟡 MEDIUM — Estándar', value: 'medium' },
          { name: '🔴 HIGH — Estricto', value: 'high' },
          { name: '🆘 PARANOID — Máxima seguridad', value: 'paranoid' }
        )))

    .addSubcommand(s => s
      .setName('whitelist')
      .setDescription('⚪ Gestionar whitelist del AutoMod')
      .addStringOption(o => o.setName('accion').setDescription('add / remove / list').setRequired(true))
      .addStringOption(o => o.setName('tipo').setDescription('role / channel / user'))
      .addStringOption(o => o.setName('id').setDescription('ID del rol, canal o usuario')))

    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  userPermissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const cfg = db.get('guilds', interaction.guild.id, {});
    if (!cfg.automodCustom) cfg.automodCustom = {};

    // ── SETUP NATIVO ───────────────────────────────────────────
    if (sub === 'setup') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const logCh   = interaction.options.getChannel('log');
      const prof    = interaction.options.getBoolean('profanidad');
      const menc    = interaction.options.getBoolean('menciones');
      const maxMenc = interaction.options.getInteger('max_menciones') ?? 5;
      const results = [];

      if (prof) {
        try {
          await interaction.guild.autoModerationRules.create({
            name: 'System 777 · Anti-Profanidad',
            eventType: 1,
            triggerType: AutoModerationRuleTriggerType.KeywordPreset,
            triggerMetadata: { presets: [AutoModerationRuleKeywordPresetType.Profanity, AutoModerationRuleKeywordPresetType.SexualContent] },
            actions: [
              { type: AutoModerationActionType.BlockMessage, metadata: { customMessage: '🚫 System 777: Mensaje bloqueado.' } },
              { type: AutoModerationActionType.SendAlertMessage, metadata: { channel: logCh.id } }
            ],
            enabled: true,
          });
          results.push('✅ Anti-profanidad/contenido sexual activado');
        } catch (e) { results.push(`⚠️ Anti-profanidad: ${e.message.slice(0,60)}`); }
      }

      if (menc) {
        try {
          await interaction.guild.autoModerationRules.create({
            name: 'System 777 · Anti-Menciones',
            eventType: 1,
            triggerType: AutoModerationRuleTriggerType.MentionSpam,
            triggerMetadata: { mentionTotalLimit: maxMenc },
            actions: [
              { type: AutoModerationActionType.BlockMessage, metadata: { customMessage: '🚫 System 777: Demasiadas menciones.' } },
              { type: AutoModerationActionType.Timeout, metadata: { durationSeconds: 300 } },
              { type: AutoModerationActionType.SendAlertMessage, metadata: { channel: logCh.id } }
            ],
            enabled: true,
          });
          results.push(`✅ Anti-menciones (máx ${maxMenc}) + timeout 5min`);
        } catch (e) { results.push(`⚠️ Anti-menciones: ${e.message.slice(0,60)}`); }
      }

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88).setTitle('🤖 AutoMod Nativo Configurado')
          .setDescription(results.join('\n'))
          .addFields({ name: '📋 Canal de alertas', value: `<#${logCh.id}>` })
          .setFooter({ text: 'System 777 · Dev: 777' })]
      });

    // ── FLOOD ──────────────────────────────────────────────────
    } else if (sub === 'flood') {
      const activo = interaction.options.getBoolean('activo');
      const limite = interaction.options.getInteger('limite') ?? 5;
      cfg.antiflood  = activo;
      cfg.floodLimit = limite;
      db.set('guilds', interaction.guild.id, cfg);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(activo ? 0x00FF88 : 0xFF4444)
          .setTitle(`🚨 Anti-Flood ${activo ? 'Activado' : 'Desactivado'}`)
          .setDescription(activo ? `Timeout automático si alguien envía **${limite}+ msgs en 5s**.` : 'Protección desactivada.')
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });

    // ── ANTILINK ───────────────────────────────────────────────
    } else if (sub === 'antilink') {
      const activo = interaction.options.getBoolean('activo');
      cfg.automodCustom.antilink = activo;
      db.set('guilds', interaction.guild.id, cfg);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(activo ? 0x00FF88 : 0xFF4444)
          .setTitle(`🔗 Anti-Link ${activo ? 'Activado' : 'Desactivado'}`)
          .setDescription(activo ? 'Links y discord.gg serán eliminados automáticamente.' : 'Links permitidos.')
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });

    // ── ANTICAPS ───────────────────────────────────────────────
    } else if (sub === 'anticaps') {
      const activo = interaction.options.getBoolean('activo');
      cfg.automodCustom.anticaps = activo;
      db.set('guilds', interaction.guild.id, cfg);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(activo ? 0x00FF88 : 0xFF4444)
          .setTitle(`🔡 Anti-Caps ${activo ? 'Activado' : 'Desactivado'}`)
          .setDescription(activo ? 'Mensajes con >70% mayúsculas serán eliminados.' : 'Caps permitidas.')
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });

    // ── ANTIEMOJI ──────────────────────────────────────────────
    } else if (sub === 'antiemoji') {
      const activo = interaction.options.getBoolean('activo');
      const limite = interaction.options.getInteger('limite') ?? 8;
      cfg.automodCustom.antiemoji  = activo;
      cfg.automodCustom.emojiLimit = limite;
      db.set('guilds', interaction.guild.id, cfg);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(activo ? 0x00FF88 : 0xFF4444)
          .setTitle(`😵 Anti-Emoji ${activo ? 'Activado' : 'Desactivado'}`)
          .setDescription(activo ? `Mensajes con más de **${limite} emojis** serán eliminados.` : 'Sin límite de emojis.')
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });

    // ── WORDFILTER ─────────────────────────────────────────────
    } else if (sub === 'wordfilter') {
      const accion  = interaction.options.getString('accion').toLowerCase();
      const palabra = interaction.options.getString('palabra')?.toLowerCase();
      if (!cfg.automodCustom.wordFilter) cfg.automodCustom.wordFilter = [];
      const wf = cfg.automodCustom.wordFilter;

      if (accion === 'add') {
        if (!palabra) return interaction.reply({ content: '❌ Especifica la palabra.', flags: MessageFlags.Ephemeral });
        if (!wf.includes(palabra)) { wf.push(palabra); db.set('guilds', interaction.guild.id, cfg); }
        return interaction.reply({ content: `✅ Palabra \`${palabra}\` añadida al filtro. Total: ${wf.length}`, flags: MessageFlags.Ephemeral });
      }
      if (accion === 'remove') {
        if (!palabra) return interaction.reply({ content: '❌ Especifica la palabra.', flags: MessageFlags.Ephemeral });
        cfg.automodCustom.wordFilter = wf.filter(w => w !== palabra);
        db.set('guilds', interaction.guild.id, cfg);
        return interaction.reply({ content: `✅ Palabra \`${palabra}\` eliminada del filtro.`, flags: MessageFlags.Ephemeral });
      }
      if (accion === 'list') {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x5865F2)
            .setTitle('🚫 Palabras Bloqueadas')
            .setDescription(wf.length ? wf.map(w => `\`${w}\``).join(', ') : 'Sin palabras filtradas.')
            .setFooter({ text: 'System 777 · Dev: 777' })],
          flags: MessageFlags.Ephemeral
        });
      }

    // ── STATUS ─────────────────────────────────────────────────
    } else if (sub === 'status') {
      const am = cfg.automodCustom ?? {};
      const sc = cfg.security ?? {};
      const wl = cfg.automodWhitelist ?? {};
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865F2)
          .setTitle('📊 Estado AutoMod — System 777')
          .addFields(
            { name: '🚨 Anti-Flood',     value: cfg.antiflood      ? `✅ (${cfg.floodLimit ?? 5}/5s)`     : '❌', inline: true },
            { name: '🔗 Anti-Link',      value: am.antilink        ? '✅'                                  : '❌', inline: true },
            { name: '🔡 Anti-Caps',      value: am.anticaps        ? '✅'                                  : '❌', inline: true },
            { name: '😵 Anti-Emoji',     value: am.antiemoji       ? `✅ (máx ${am.emojiLimit ?? 8})`     : '❌', inline: true },
            { name: '🔑 Anti-Token',     value: '✅ Siempre activo',                                              inline: true },
            { name: '🎣 Anti-Phishing',  value: sc.antiPhishing    ? '✅'                                  : '❌', inline: true },
            { name: '📨 Anti-Invite',    value: sc.antiInviteSpam  ? '✅'                                  : '❌', inline: true },
            { name: '🔔 Anti-Mention',   value: sc.antiMassMention ? `✅ (${sc.massMentionLimit || 6})`   : '❌', inline: true },
            { name: '🔞 Anti-NSFW',      value: sc.antiNSFW        ? '✅'                                  : '❌', inline: true },
            { name: '🔤 Anti-Zalgo',     value: sc.antiZalgo       ? '✅'                                  : '❌', inline: true },
            { name: '🔁 Anti-Duplicate', value: sc.antiDuplicate   ? '✅'                                  : '❌', inline: true },
            { name: '📎 Anti-Attach',    value: sc.antiAttachmentSpam ? `✅ (${sc.attachmentLimit || 5})` : '❌', inline: true },
            { name: '👶 Anti-Alt',       value: sc.antiAlt         ? `✅ (${sc.minAccountAge || 7}d)`     : '❌', inline: true },
            { name: '👻 Ghost Ping',     value: sc.antiGhostPing   ? '✅'                                  : '❌', inline: true },
            { name: '⚡ Auto-Punish',    value: sc.autoPunish      ? '✅'                                  : '❌', inline: true },
            { name: '🚫 Word Filter',    value: am.wordFilter?.length ? `✅ ${am.wordFilter.length} palabras` : '❌', inline: true },
            { name: '⚪ Whitelist',       value: `Roles: ${wl.roles?.length || 0} · Canales: ${wl.channels?.length || 0} · Usuarios: ${wl.users?.length || 0}`, inline: false },
          )
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });

    // ── PRESET ─────────────────────────────────────────────────
    } else if (sub === 'preset') {
      const nivel = interaction.options.getString('nivel');
      const presets = {
        low: {
          antiflood: true, floodLimit: 8,
          automodCustom: { antilink: false, anticaps: false, antiemoji: false, wordFilter: cfg.automodCustom?.wordFilter || [] },
          security: { antiPhishing: false, antiInviteSpam: false, antiMassMention: false, antiAlt: false, antiGhostPing: false, antiZalgo: false, antiDuplicate: false, antiNSFW: false, antiAttachmentSpam: false, autoPunish: false }
        },
        medium: {
          antiflood: true, floodLimit: 6,
          automodCustom: { antilink: true, anticaps: true, antiemoji: true, emojiLimit: 10, wordFilter: cfg.automodCustom?.wordFilter || [] },
          security: { antiPhishing: true, antiInviteSpam: true, antiMassMention: true, massMentionLimit: 8, antiAlt: false, antiGhostPing: false, antiZalgo: true, antiDuplicate: true, antiNSFW: true, antiAttachmentSpam: false, autoPunish: false }
        },
        high: {
          antiflood: true, floodLimit: 5,
          automodCustom: { antilink: true, anticaps: true, antiemoji: true, emojiLimit: 8, wordFilter: cfg.automodCustom?.wordFilter || [] },
          security: { antiPhishing: true, antiInviteSpam: true, antiMassMention: true, massMentionLimit: 6, antiAlt: true, minAccountAge: 7, altAction: 'warn', antiGhostPing: true, antiZalgo: true, antiDuplicate: true, antiNSFW: true, antiAttachmentSpam: true, attachmentLimit: 5, autoPunish: true, autoProtect: false }
        },
        paranoid: {
          antiflood: true, floodLimit: 4,
          automodCustom: { antilink: true, anticaps: true, antiemoji: true, emojiLimit: 5, wordFilter: cfg.automodCustom?.wordFilter || [] },
          security: { antiPhishing: true, antiInviteSpam: true, antiMassMention: true, massMentionLimit: 4, antiAlt: true, minAccountAge: 30, altAction: 'kick', antiGhostPing: true, antiZalgo: true, antiDuplicate: true, antiNSFW: true, antiAttachmentSpam: true, attachmentLimit: 3, autoPunish: true, autoProtect: true }
        }
      };

      const preset = presets[nivel];
      const newCfg = { ...cfg, ...preset };
      db.set('guilds', interaction.guild.id, newCfg);

      const icons = { low: '🟢', medium: '🟡', high: '🔴', paranoid: '🆘' };
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(nivel === 'paranoid' ? 0xFF0000 : nivel === 'high' ? 0xFF9900 : nivel === 'medium' ? 0xFFFF00 : 0x00FF88)
          .setTitle(`${icons[nivel]} Preset AutoMod — ${nivel.toUpperCase()}`)
          .setDescription('Configuración de seguridad aplicada.')
          .addFields(
            { name: '🚨 Anti-Flood',    value: `Límite: ${preset.floodLimit} msgs/5s`, inline: true },
            { name: '🔗 Anti-Link',     value: preset.automodCustom.antilink ? '✅' : '❌', inline: true },
            { name: '🎣 Anti-Phishing', value: preset.security.antiPhishing ? '✅' : '❌', inline: true },
            { name: '📨 Anti-Invite',   value: preset.security.antiInviteSpam ? '✅' : '❌', inline: true },
            { name: '🔤 Anti-Zalgo',    value: preset.security.antiZalgo ? '✅' : '❌', inline: true },
            { name: '👶 Anti-Alt',      value: preset.security.antiAlt ? `✅ (${preset.security.minAccountAge}d, ${preset.security.altAction})` : '❌', inline: true },
            { name: '⚡ Auto-Punish',   value: preset.security.autoPunish ? '✅' : '❌', inline: true },
          )
          .setFooter({ text: 'System 777 · AutoMod Preset · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });

    // ── WHITELIST ───────────────────────────────────────────────
    } else if (sub === 'whitelist') {
      const accion = interaction.options.getString('accion').toLowerCase();
      const tipo   = interaction.options.getString('tipo')?.toLowerCase();
      const id     = interaction.options.getString('id');
      if (!cfg.automodWhitelist) cfg.automodWhitelist = { roles: [], channels: [], users: [] };
      const wl = cfg.automodWhitelist;

      if (accion === 'list') {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x5865F2)
            .setTitle('⚪ Whitelist AutoMod')
            .addFields(
              { name: '🎭 Roles',    value: wl.roles?.map(r => `<@&${r}>`).join(', ')    || 'Ninguno', inline: false },
              { name: '📢 Canales', value: wl.channels?.map(c => `<#${c}>`).join(', ')   || 'Ninguno', inline: false },
              { name: '👤 Usuarios', value: wl.users?.map(u => `<@${u}>`).join(', ')     || 'Ninguno', inline: false },
            )],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!tipo || !id) return interaction.reply({ content: '❌ Especifica `tipo` e `id`.', flags: MessageFlags.Ephemeral });
      const key = tipo === 'role' ? 'roles' : tipo === 'channel' ? 'channels' : tipo === 'user' ? 'users' : null;
      if (!key) return interaction.reply({ content: '❌ Tipo inválido (role/channel/user).', flags: MessageFlags.Ephemeral });

      if (accion === 'add') {
        if (!wl[key].includes(id)) { wl[key].push(id); db.set('guilds', interaction.guild.id, cfg); }
        return interaction.reply({ content: `✅ \`${id}\` añadido a whitelist (${tipo}).`, flags: MessageFlags.Ephemeral });
      }
      if (accion === 'remove') {
        wl[key] = wl[key].filter(x => x !== id);
        db.set('guilds', interaction.guild.id, cfg);
        return interaction.reply({ content: `✅ \`${id}\` removido de whitelist (${tipo}).`, flags: MessageFlags.Ephemeral });
      }
    }
  }
};
