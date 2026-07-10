/**
 * antiRaid.js — Sistema anti-raid completo con detección graduada
 * Niveles: WARN → SOFT LOCKDOWN → HARD LOCKDOWN → AUTO-KICK
 */
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db     = require('../utils/db');
const logger = require('../utils/logger');

// Join tracker: guildId → { joins: [{ts, userId, username, accountAge}] }
const joinTracker   = new Map();
// IP raid tracker: guildId → { ip → [userId] }
const ipJoinTracker = new Map();
// Raid state: guildId → { level, ts }
const raidState     = new Map();
// Lockdown state: guildId → true/false
const lockdownState = new Map();

const LEVEL = { NONE: 0, WARN: 1, SOFT: 2, HARD: 3, CRITICAL: 4 };

function getConfig(guildId) {
  const cfg = db.get('guilds', guildId, {});
  return {
    enabled:         cfg.antiRaid?.enabled         ?? true,
    warnThreshold:   cfg.antiRaid?.warnThreshold    ?? 5,   // joins in window → warn
    softThreshold:   cfg.antiRaid?.softThreshold    ?? 8,   // joins → soft lockdown
    hardThreshold:   cfg.antiRaid?.hardThreshold    ?? 12,  // joins → hard lockdown
    windowMs:        cfg.antiRaid?.windowMs         ?? 10000,
    minAccountAge:   cfg.antiRaid?.minAccountAge    ?? 7,   // days
    autoKick:        cfg.antiRaid?.autoKick         ?? false, // kick recent joiners on hard raid
    autoBan:         cfg.antiRaid?.autoBan          ?? false, // ban instead of kick on hard raid
    autoKickWindow:  cfg.antiRaid?.autoKickWindow   ?? 30000, // ms back to kick
    antiNewAccount:  cfg.antiNewAccount             ?? false,
    antiMultiAccount:cfg.antiMultiAccount           ?? false,
    antiUnauthorizedBots: cfg.antiUnauthorizedBots  ?? true,
    honeypotChannel: cfg.antiRaid?.honeypotChannel  ?? null,
    logChannel:      cfg.logChannel                 ?? null,
    patternDetect:   cfg.antiRaid?.patternDetect    ?? true, // username pattern detection
    ipRaidDetect:    cfg.antiRaid?.ipRaidDetect     ?? true, // same IP multiple accounts
  };
}

// ── Detect username pattern (sequential/template usernames) ───────────────
function detectPattern(recentJoins) {
  if (recentJoins.length < 4) return false;
  const names = recentJoins.map(j => j.username.toLowerCase().replace(/\d+/g, '#'));
  const freq  = {};
  names.forEach(n => freq[n] = (freq[n] || 0) + 1);
  return Object.values(freq).some(v => v >= 3);
}

// ── Main join handler ─────────────────────────────────────────────────────
async function handleJoin(member, client) {
  const { guild, user } = member;
  const gid = guild.id;
  const cfg  = getConfig(gid);

  // ── 1. BLACKLIST ─────────────────────────────────────────────────────────
  const bl = db.get('blacklist', 'users', []);
  if (bl.includes(user.id)) {
    await member.ban({ reason: 'System 777 · Blacklist global' }).catch(() => {});
    return notifyLog(guild, cfg.logChannel, 'blacklist', member);
  }

  // ── 2. GLOBAL BAN ────────────────────────────────────────────────────────
  const gbans = db.get('globalbans', 'users', {});
  if (gbans[user.id]) {
    await member.ban({ reason: `System 777 · Ban Global: ${gbans[user.id].reason}` }).catch(() => {});
    return notifyLog(guild, cfg.logChannel, 'globalban', member, gbans[user.id].reason);
  }

  // ── 3. BOT WHITELIST ─────────────────────────────────────────────────────
  if (user.bot && cfg.antiUnauthorizedBots) {
    const wl = db.get('whitelist', 'bots', []);
    if (!wl.includes(user.id)) {
      await member.kick('System 777 · Bot no autorizado').catch(() => {});
      return notifyLog(guild, cfg.logChannel, 'bot_kick', member);
    }
    return;
  }
  if (user.bot) return;

  // ── 4. NEW ACCOUNT ───────────────────────────────────────────────────────
  const ageDays = (Date.now() - user.createdTimestamp) / 86400000;
  if (cfg.antiNewAccount && ageDays < cfg.minAccountAge) {
    await member.kick(`Cuenta muy nueva (${ageDays.toFixed(1)} días)`).catch(() => {});
    return notifyLog(guild, cfg.logChannel, 'new_account', member, `${ageDays.toFixed(1)} días`);
  }

  if (!cfg.enabled) return;

  // ── 5. JOIN TRACKER ──────────────────────────────────────────────────────
  if (!joinTracker.has(gid)) joinTracker.set(gid, []);
  const tracker = joinTracker.get(gid);
  const now     = Date.now();
  tracker.push({ ts: now, userId: user.id, username: user.username, accountAge: ageDays });

  // Remove joins outside window
  while (tracker.length && tracker[0].ts < now - cfg.windowMs) tracker.shift();

  const recentCount = tracker.length;
  const recentJoins = [...tracker];

  // ── 6. PATTERN DETECTION ─────────────────────────────────────────────────
  if (cfg.patternDetect && detectPattern(recentJoins)) {
    await triggerRaid(guild, client, cfg, recentJoins, 'Patrón de usernames: raid coordinado detectado', LEVEL.HARD);
    return;
  }

  // ── 7. IP RAID DETECTION ─────────────────────────────────────────────────
  if (cfg.ipRaidDetect) {
    const uips   = db.get('ip_registry', 'user_ips', {});
    const userIp = (uips[user.id] || [])[0];
    if (userIp) {
      if (!ipJoinTracker.has(gid)) ipJoinTracker.set(gid, {});
      const ipT = ipJoinTracker.get(gid);
      if (!ipT[userIp]) ipT[userIp] = [];
      ipT[userIp].push({ ts: now, userId: user.id });
      // Clean old entries
      ipT[userIp] = ipT[userIp].filter(e => e.ts > now - 60000);
      if (ipT[userIp].length >= 3) {
        await triggerRaid(guild, client, cfg, recentJoins,
          `3+ cuentas con la misma IP (${userIp}) en 60s — raid por IP`, LEVEL.CRITICAL);
        // Ban all accounts from this IP in this guild
        for (const entry of ipT[userIp]) {
          await guild.bans.create(entry.userId, { reason: `System 777 · Raid por IP: ${userIp}` }).catch(() => {});
        }
        ipT[userIp] = [];
        return;
      }
    }
  }

  // ── 8. GRADUATED THRESHOLD ───────────────────────────────────────────────
  const current = raidState.get(gid)?.level || LEVEL.NONE;

  if (recentCount >= cfg.hardThreshold && current < LEVEL.HARD) {
    await triggerRaid(guild, client, cfg, recentJoins, `${recentCount} joins en ${cfg.windowMs/1000}s`, LEVEL.HARD);
  } else if (recentCount >= cfg.softThreshold && current < LEVEL.SOFT) {
    await triggerRaid(guild, client, cfg, recentJoins, `${recentCount} joins en ${cfg.windowMs/1000}s`, LEVEL.SOFT);
  } else if (recentCount >= cfg.warnThreshold && current < LEVEL.WARN) {
    await triggerRaid(guild, client, cfg, recentJoins, `${recentCount} joins en ${cfg.windowMs/1000}s`, LEVEL.WARN);
  }

  // ── 9. MULTI-ACCOUNT ─────────────────────────────────────────────────────
  if (cfg.antiMultiAccount) {
    const name = user.username.toLowerCase().replace(/\d+$/, '');
    const matches = recentJoins.filter(j => j.userId !== user.id &&
      j.username.toLowerCase().replace(/\d+$/, '') === name
    );
    if (matches.length >= 2) {
      await member.kick('Posible multi-cuenta detectada').catch(() => {});
      notifyLog(guild, cfg.logChannel, 'multicuenta', member);
    }
  }
}

// ── Trigger raid response by level ────────────────────────────────────────
async function triggerRaid(guild, client, cfg, recentJoins, reason, level) {
  const prev = raidState.get(guild.id)?.level || LEVEL.NONE;
  raidState.set(guild.id, { level, ts: Date.now() });

  const levelNames = { 1: 'ALERTA', 2: 'SOFT LOCKDOWN', 3: 'HARD LOCKDOWN', 4: 'CRITICAL' };
  const colors     = { 1: 0xFF9900,  2: 0xFF6600,        3: 0xFF0000,        4: 0xCC0000 };
  logger.raid(`[${levelNames[level]}] ${guild.name}: ${reason}`);

  // Notify owner
  const embed = new EmbedBuilder()
    .setColor(colors[level] || 0xFF0000)
    .setTitle(`🚨 RAID ${levelNames[level]} — ${guild.name}`)
    .setDescription(`**Razón:** ${reason}\n**Nivel:** ${levelNames[level]}\n**Hora:** <t:${Math.floor(Date.now()/1000)}:F>`)
    .addFields(
      { name: 'Joins recientes', value: `${recentJoins.length}`, inline: true },
      { name: 'Acciones tomadas', value: getActionDesc(level, cfg), inline: true },
    )
    .setFooter({ text: 'System 777 · Anti-Raid' });

  await logger.dmOwner(client, null, embed).catch(() => {});
  if (cfg.logChannel) {
    const lc = guild.channels.cache.get(cfg.logChannel);
    if (lc) await lc.send({ embeds: [embed] }).catch(() => {});
  }
  db.push('logs', 'raids', { guildId: guild.id, guildName: guild.name, reason, level, ts: Date.now() });

  // WARN: just notify
  if (level === LEVEL.WARN) return;

  // SOFT: lockdown channels
  if (level >= LEVEL.SOFT) {
    await activateLockdown(guild, cfg, `Raid detectado: ${reason}`);
  }

  // HARD: kick/ban recent joiners
  if (level >= LEVEL.HARD && (cfg.autoKick || cfg.autoBan)) {
    const cutoff = Date.now() - (cfg.autoKickWindow || 30000);
    const victims = recentJoins.filter(j => j.ts > cutoff);
    let acted = 0;
    for (const j of victims) {
      const m = guild.members.cache.get(j.userId);
      if (!m) continue;
      if (cfg.autoBan) {
        await m.ban({ reason: `System 777 · Auto-ban raid: ${reason}` }).catch(() => {});
      } else {
        await m.kick(`System 777 · Auto-kick raid: ${reason}`).catch(() => {});
      }
      acted++;
    }
    if (acted > 0 && cfg.logChannel) {
      const lc = guild.channels.cache.get(cfg.logChannel);
      if (lc) await lc.send({
        embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(`⚡ Auto-${cfg.autoBan ? 'Ban' : 'Kick'} Raid`)
          .setDescription(`${acted} usuario(s) expulsados automáticamente por raid.\nRazón: ${reason}`)
          .setTimestamp()]
      }).catch(() => {});
    }
  }
}

function getActionDesc(level, cfg) {
  if (level === LEVEL.WARN) return 'Notificación enviada';
  if (level === LEVEL.SOFT) return 'Canales bloqueados';
  if (level >= LEVEL.HARD) return cfg.autoBan ? 'Lockdown + Auto-ban' : cfg.autoKick ? 'Lockdown + Auto-kick' : 'Lockdown total';
  return 'Ninguna';
}

// ── Lockdown ──────────────────────────────────────────────────────────────
async function activateLockdown(guild, cfg, reason) {
  if (lockdownState.get(guild.id)) return;
  lockdownState.set(guild.id, true);
  try {
    const everyone = guild.roles.everyone;
    const channels = guild.channels.cache.filter(c => [0, 2, 5].includes(c.type));
    for (const [, ch] of channels) {
      await ch.permissionOverwrites.edit(everyone, {
        SendMessages: false,
        AddReactions: false,
        Speak:        false,
      }).catch(() => {});
    }
    logger.raid(`Lockdown TOTAL activado en ${guild.name}`);
  } catch (e) { logger.warn(`Lockdown error: ${e.message}`); }
}

async function deactivateLockdown(guild) {
  lockdownState.set(guild.id, false);
  raidState.delete(guild.id);
  try {
    const everyone = guild.roles.everyone;
    const channels = guild.channels.cache.filter(c => [0, 2, 5].includes(c.type));
    for (const [, ch] of channels) {
      await ch.permissionOverwrites.edit(everyone, {
        SendMessages: null,
        AddReactions: null,
        Speak:        null,
      }).catch(() => {});
    }
  } catch {}
}

// ── Honeypot check (called from messageCreate) ────────────────────────────
async function checkHoneypot(message, client) {
  if (!message.guild || message.author.bot) return false;
  const cfg = getConfig(message.guild.id);
  if (!cfg.honeypotChannel || message.channel.id !== cfg.honeypotChannel) return false;

  // Anyone who sends in the honeypot channel gets banned
  const ageDays = (Date.now() - message.author.createdTimestamp) / 86400000;
  await message.delete().catch(() => {});
  const member = message.guild.members.cache.get(message.author.id);
  if (member) {
    await member.ban({ reason: `System 777 · Honeypot activado — canal trampa` }).catch(() => {});
    const cfg2 = getConfig(message.guild.id);
    if (cfg2.logChannel) {
      const lc = message.guild.channels.cache.get(cfg2.logChannel);
      if (lc) await lc.send({
        embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🍯 Honeypot Activado')
          .setDescription(`${message.author.tag} (\`${message.author.id}\`) escribió en el canal trampa y fue **baneado**.\nCuenta de: **${ageDays.toFixed(1)} días**`)
          .setTimestamp()
          .setFooter({ text: 'System 777 · Honeypot' })]
      }).catch(() => {});
    }
    const { sendAlert } = require('./securityGuard');
    await sendAlert(client, message.guild, 'Honeypot Activado',
      `${message.author.tag} cayó en el canal trampa y fue baneado.`, 0xFF0000, 'HIGH');
  }
  return true;
}

// ── Log helper ────────────────────────────────────────────────────────────
async function notifyLog(guild, logChannelId, type, member, extra = '') {
  if (!logChannelId) return;
  const lc = guild.channels.cache.get(logChannelId);
  if (!lc) return;

  const labels = {
    blacklist:   { color: 0xFF0000, title: '🚫 Blacklist',        desc: `${member.user.tag} en blacklist global.` },
    globalban:   { color: 0xFF0000, title: '⛔ Ban Global',       desc: `${member.user.tag} ban global.\nRazón: ${extra}` },
    bot_kick:    { color: 0xFF6600, title: '🤖 Bot No Autorizado', desc: `${member.user.tag} expulsado (bot sin whitelist).` },
    new_account: { color: 0xFF9900, title: '🆕 Cuenta Nueva',     desc: `${member.user.tag} expulsado. Edad: ${extra}` },
    multicuenta: { color: 0xFF6600, title: '👥 Multi-cuenta',     desc: `${member.user.tag} detectado como multi-cuenta.` },
  };
  const info = labels[type]; if (!info) return;
  await lc.send({ embeds: [
    new EmbedBuilder()
      .setColor(info.color).setTitle(info.title).setDescription(info.desc)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'ID',            value: member.user.id,                                           inline: true },
        { name: 'Cuenta creada', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:R>`, inline: true }
      )
      .setFooter({ text: 'System 777 · Developer 777' }).setTimestamp()
  ]}).catch(() => {});
}

// ── Getters ───────────────────────────────────────────────────────────────
function getRaidState(guildId) {
  return {
    level:     raidState.get(guildId)?.level || LEVEL.NONE,
    lockdown:  lockdownState.get(guildId)    || false,
    recentJoins: (joinTracker.get(guildId)   || []).length,
  };
}

module.exports = { handleJoin, activateLockdown, deactivateLockdown, checkHoneypot, getRaidState, LEVEL };
