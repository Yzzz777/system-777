/**
 * securityGuard.js — comprehensive defensive security system
 */

const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

// ── In-memory rate limit maps ──────────────────────────────────────────────
const floodMap      = new Map(); // invite spam
const mentionMap    = new Map();
const attachMap     = new Map();
const dupeMap       = new Map();
const alertCooldown = new Map();

// ── Patterns & domain lists ────────────────────────────────────────────────
const PHISHING_PATTERNS = [
  /discord[\-_]?nitro.*free/i, /free.*discord.*nitro/i, /steam.*gift/i,
  /claim.*reward.*discord/i,   /airdrop.*crypto/i,      /\bnitro\b.*\bhttp/i,
  /click.*win.*prize/i,        /verify.*wallet/i,        /connect.*metamask/i,
];

const PHISHING_DOMAINS = [
  'discordapp.gift','discord-nitro.gift','discordnitro.fun','dlscord.com',
  'discrod.com','discordd.com','steamcommunity.gift','steam-trade.com',
  'freenitroo.com','claimnitro.com','nitrogift.net',
];

const NSFW_DOMAINS = [
  'pornhub.com','xvideos.com','xnxx.com','redtube.com','youporn.com',
  'xhamster.com','rule34.xxx','e621.net','nhentai.net','spankbang.com',
];

const DISCORD_INVITE_REGEX = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/[a-zA-Z0-9]+/i;
const URL_REGEX   = /https?:\/\/([^\/\s]+)/gi;
const TOKEN_REGEX = /[MNO][a-zA-Z0-9_-]{23,27}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27,38}/;
const ZALGO_REGEX = /[̀-ͯ҉᷀-᷿⃐-⃿︠-︯]{4,}/;

// ── Whitelist check ────────────────────────────────────────────────────────
function isWhitelisted(message) {
  if (!message.guild) return false;
  const wl = db.get('guilds', message.guild.id, {}).automodWhitelist || {};
  if (wl.users?.includes(message.author.id))   return true;
  if (wl.channels?.includes(message.channel.id)) return true;
  if (wl.roles?.length && message.member) {
    if (message.member.roles.cache.some(r => wl.roles.includes(r.id))) return true;
  }
  return false;
}

// ── Alert system ───────────────────────────────────────────────────────────
async function sendAlert(client, guild, title, desc, color = 0xFF9900, severity = 'MEDIUM') {
  const alerts = db.get('security_alerts', guild?.id || 'global') || [];
  alerts.unshift({ title, desc: desc.slice(0, 200), severity, ts: Date.now() });
  if (alerts.length > 50) alerts.splice(50);
  db.set('security_alerts', guild?.id || 'global', alerts);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🛡️ [${severity}] ${title}`)
    .setDescription(desc.slice(0, 1000))
    .addFields({ name: 'Servidor', value: guild ? `${guild.name} (\`${guild.id}\`)` : 'Global', inline: true })
    .setTimestamp()
    .setFooter({ text: 'System 777 · Security Guard' });

  const ownerId = process.env.OWNER_ID;
  if (ownerId) {
    const key = (guild?.id || 'global') + '_' + title;
    const now = Date.now();
    if (!alertCooldown.has(key) || now - alertCooldown.get(key) > 30000) {
      alertCooldown.set(key, now);
      try { const o = await client.users.fetch(ownerId); await o.send({ embeds: [embed] }); } catch {}
    }
  }

  if (guild) {
    const cfg = db.get('guilds', guild.id, {});
    const ch  = guild.channels.cache.get(cfg.securityLog || cfg.logChannel);
    if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
  }
}

// ── Flag user & persist ────────────────────────────────────────────────────
function flagUser(userId, guildId, reason) {
  const stored = db.get('security_flags', guildId) || {};
  if (!stored[userId]) stored[userId] = { flags: [], score: 0 };
  stored[userId].flags.push({ reason, ts: Date.now() });
  stored[userId].score++;
  if (stored[userId].flags.length > 30) stored[userId].flags.splice(0, stored[userId].flags.length - 30);
  db.set('security_flags', guildId, stored);
  return stored[userId].score;
}

// ── Auto-punishment cascade ────────────────────────────────────────────────
async function applyPunishment(member, guild, reason, client) {
  const cfg   = db.get('guilds', guild.id, {});
  if (!cfg.security?.autoPunish) return 'none';
  const score = (db.get('security_flags', guild.id) || {})[member.id]?.score || 0;

  if      (score <= 1) return 'warn';
  else if (score <= 3) { await member.timeout(600000,   `Auto-Punish·${reason}`).catch(() => {}); return 'timeout_10m'; }
  else if (score <= 5) { await member.timeout(3600000,  `Auto-Punish·${reason}`).catch(() => {}); await sendAlert(client, guild, 'Auto-Punish: Timeout 1h', `${member.user.tag} score:${score}`); return 'timeout_1h'; }
  else if (score <= 7) { await member.kick(`Auto-Punish·${reason}`).catch(() => {});               await sendAlert(client, guild, 'Auto-Punish: Kick', `${member.user.tag} score:${score}`, 0xFF4444, 'HIGH'); return 'kick'; }
  else                 { await member.ban({ reason: `Auto-Punish·${reason}` }).catch(() => {});    await sendAlert(client, guild, 'Auto-Punish: Ban', `${member.user.tag} score:${score}`, 0xFF0000, 'CRITICAL'); return 'ban'; }
}

// ── Anti-phishing ─────────────────────────────────────────────────────────
async function checkPhishing(message, client) {
  const cfg = db.get('guilds', message.guild.id, {});
  if (!cfg.security?.antiPhishing) return false;
  if (isWhitelisted(message)) return false;

  const matchedPattern = PHISHING_PATTERNS.some(p => p.test(message.content));
  let domain = '';
  let matchedDomain = false;
  for (const m of [...(message.content || '').matchAll(URL_REGEX)]) {
    const d = m[1].toLowerCase().split(':')[0];
    if (PHISHING_DOMAINS.some(x => d === x || d.endsWith('.' + x))) { domain = d; matchedDomain = true; break; }
  }

  if (!matchedPattern && !matchedDomain) return false;

  await message.delete().catch(() => {});
  const score  = flagUser(message.author.id, message.guild.id, 'phishing_link');
  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (member) { await member.timeout(600000, 'Anti-Phishing').catch(() => {}); await applyPunishment(member, message.guild, 'phishing', client); }

  await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`🚨 ${message.author} — **Link peligroso eliminado.** Timeout 10 min.`).setFooter({ text: 'System 777 · Anti-Phishing' })] })
    .then(m => setTimeout(() => m.delete().catch(() => {}), 8000)).catch(() => {});
  await sendAlert(client, message.guild, 'Phishing/Scam', `${message.author.tag} · canal <#${message.channel.id}> · dominio: \`${domain || 'patrón'}\``, 0xFF0000, 'HIGH');
  return true;
}

// ── Anti-invite spam ──────────────────────────────────────────────────────
async function checkInviteSpam(message, client) {
  const cfg = db.get('guilds', message.guild.id, {});
  if (!cfg.security?.antiInviteSpam) return false;
  if (isWhitelisted(message)) return false;
  if (!DISCORD_INVITE_REGEX.test(message.content)) return false;
  if (message.member?.permissions.has('ManageGuild')) return false;

  const key  = `${message.guild.id}_${message.author.id}_inv`;
  const now  = Date.now();
  const data = floodMap.get(key) || { count: 0, firstAt: now };
  if (now - data.firstAt > 60000) { data.count = 0; data.firstAt = now; }
  data.count++;
  floodMap.set(key, data);

  await message.delete().catch(() => {});
  if (data.count >= 3) {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (member) { await member.timeout(300000, 'Anti-Invite-Spam').catch(() => {}); await applyPunishment(member, message.guild, 'invite_spam', client); }
    flagUser(message.author.id, message.guild.id, 'invite_spam');
    await sendAlert(client, message.guild, 'Invite Spam', `${message.author.tag} — ${data.count} invites en 60s`, 0xFF9900, 'MEDIUM');
  }

  await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xFF6600).setDescription(`🔗 ${message.author} — No se permiten invitaciones.`).setFooter({ text: 'System 777 · Anti-Invite' })] })
    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
  return true;
}

// ── Anti-mass-mention ─────────────────────────────────────────────────────
async function checkMassMention(message, client) {
  const cfg   = db.get('guilds', message.guild.id, {});
  const limit = cfg.security?.massMentionLimit ?? 6;
  if (!cfg.security?.antiMassMention) return false;
  if (isWhitelisted(message)) return false;
  const count = message.mentions.users.size + message.mentions.roles.size;
  if (count < limit) return false;
  if (message.member?.permissions.has('ManageMessages')) return false;

  await message.delete().catch(() => {});
  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (member) { await member.timeout(300000, 'Anti-Mass-Mention').catch(() => {}); await applyPunishment(member, message.guild, 'mass_mention', client); }
  flagUser(message.author.id, message.guild.id, 'mass_mention');

  await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription(`🔔 ${message.author} — Demasiadas menciones (${count}). Timeout 5 min.`).setFooter({ text: 'System 777 · Anti-Mention' })] })
    .then(m => setTimeout(() => m.delete().catch(() => {}), 6000)).catch(() => {});
  await sendAlert(client, message.guild, 'Mass Mention', `${message.author.tag} mencionó ${count} usuarios/roles`, 0xFF4444, 'HIGH');
  return true;
}

// ── Anti-zalgo ────────────────────────────────────────────────────────────
async function checkZalgo(message, client) {
  if (!message.content) return false;
  const cfg = db.get('guilds', message.guild.id, {});
  if (!cfg.security?.antiZalgo) return false;
  if (isWhitelisted(message)) return false;
  if (!ZALGO_REGEX.test(message.content)) return false;

  await message.delete().catch(() => {});
  flagUser(message.author.id, message.guild.id, 'zalgo_text');

  await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xAA00FF).setDescription(`🔤 ${message.author} — Texto zalgo/abusivo eliminado.`).setFooter({ text: 'System 777 · Anti-Zalgo' })] })
    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
  return true;
}

// ── Anti-duplicate messages ────────────────────────────────────────────────
async function checkDuplicate(message, client) {
  if (!message.content || message.content.length < 10) return false;
  const cfg = db.get('guilds', message.guild.id, {});
  if (!cfg.security?.antiDuplicate) return false;
  if (isWhitelisted(message)) return false;

  const key  = `${message.guild.id}_${message.author.id}_dup`;
  const now  = Date.now();
  const data = dupeMap.get(key) || { content: '', count: 0, firstAt: now };

  if (data.content === message.content && now - data.firstAt < 15000) {
    data.count++;
    dupeMap.set(key, data);
    if (data.count >= 3) {
      const msgs = await message.channel.messages.fetch({ limit: 15 }).catch(() => null);
      if (msgs) {
        const dupes = msgs.filter(m => m.author.id === message.author.id && m.content === message.content);
        await message.channel.bulkDelete(dupes).catch(() => {});
      }
      const member = await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member) { await member.timeout(120000, 'Anti-Duplicate').catch(() => {}); await applyPunishment(member, message.guild, 'duplicate_spam', client); }
      flagUser(message.author.id, message.guild.id, 'duplicate_spam');
      dupeMap.set(key, { content: '', count: 0, firstAt: now });

      await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xFF9900).setDescription(`🔁 ${message.author} — Spam de mensajes duplicados. Timeout 2 min.`).setFooter({ text: 'System 777 · Anti-Duplicate' })] })
        .then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
      return true;
    }
  } else {
    dupeMap.set(key, { content: message.content, count: 1, firstAt: now });
  }
  return false;
}

// ── Anti-token leak ────────────────────────────────────────────────────────
async function checkTokenLeak(message, client) {
  if (!message.content) return false;
  if (!TOKEN_REGEX.test(message.content)) return false;

  await message.delete().catch(() => {});
  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (member) await member.timeout(600000, 'Token Leak Detected').catch(() => {});
  flagUser(message.author.id, message.guild.id, 'token_leak');

  await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`🔑 ${message.author} — **Token detectado y eliminado.**`).setFooter({ text: 'System 777 · Security' })] })
    .then(m => setTimeout(() => m.delete().catch(() => {}), 8000)).catch(() => {});
  await sendAlert(client, message.guild, 'TOKEN LEAK', `${message.author.tag} (\`${message.author.id}\`) publicó lo que parece un token de bot/Discord en <#${message.channel.id}>. Mensaje eliminado.`, 0xFF0000, 'CRITICAL');
  return true;
}

// ── Anti-NSFW links ────────────────────────────────────────────────────────
async function checkNSFW(message, client) {
  if (!message.content) return false;
  const cfg = db.get('guilds', message.guild.id, {});
  if (!cfg.security?.antiNSFW) return false;
  if (isWhitelisted(message)) return false;
  if (message.channel.nsfw) return false;

  for (const m of [...(message.content).matchAll(URL_REGEX)]) {
    const domain = m[1].toLowerCase().split(':')[0].replace(/^www\./, '');
    if (NSFW_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
      await message.delete().catch(() => {});
      await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`🔞 ${message.author} — Links NSFW no permitidos aquí.`).setFooter({ text: 'System 777 · Anti-NSFW' })] })
        .then(m2 => setTimeout(() => m2.delete().catch(() => {}), 5000)).catch(() => {});
      flagUser(message.author.id, message.guild.id, 'nsfw_link');
      return true;
    }
  }
  return false;
}

// ── Anti-attachment/sticker spam ──────────────────────────────────────────
async function checkAttachmentSpam(message, client) {
  const cfg = db.get('guilds', message.guild.id, {});
  if (!cfg.security?.antiAttachmentSpam) return false;
  if (isWhitelisted(message)) return false;
  if (message.attachments.size === 0 && message.stickers.size === 0) return false;

  const key  = `${message.guild.id}_${message.author.id}_att`;
  const now  = Date.now();
  const data = attachMap.get(key) || { count: 0, firstAt: now };
  if (now - data.firstAt > 10000) { data.count = 0; data.firstAt = now; }
  data.count++;
  attachMap.set(key, data);

  const limit = cfg.security?.attachmentLimit ?? 5;
  if (data.count > limit) {
    await message.delete().catch(() => {});
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (member) await member.timeout(120000, 'Attachment/Sticker Spam').catch(() => {});
    flagUser(message.author.id, message.guild.id, 'attachment_spam');
    data.count = 0;

    await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xFF9900).setDescription(`📎 ${message.author} — Spam de archivos/stickers. Timeout 2 min.`).setFooter({ text: 'System 777 · Anti-Spam' })] })
      .then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
    return true;
  }
  return false;
}

// ── Alt account detection ─────────────────────────────────────────────────
async function checkAltAccount(member, client) {
  const cfg = db.get('guilds', member.guild.id, {});
  if (!cfg.security?.antiAlt) return;

  const minDays    = cfg.security?.minAccountAge ?? 7;
  const ageDays    = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  if (ageDays >= minDays) return;

  const altData = db.get('security_alts', member.guild.id) || [];
  altData.unshift({ userId: member.id, tag: member.user.tag, ageDays: ageDays.toFixed(1), ts: Date.now() });
  if (altData.length > 100) altData.splice(100);
  db.set('security_alts', member.guild.id, altData);

  const action = cfg.security?.altAction || 'warn';
  if      (action === 'kick') { await member.kick('Alt account').catch(() => {}); await sendAlert(client, member.guild, 'Alt Kicked', `${member.user.tag} — ${ageDays.toFixed(1)}d`, 0xFF9900, 'MEDIUM'); }
  else if (action === 'ban')  { await member.ban({ reason: 'Alt account' }).catch(() => {}); await sendAlert(client, member.guild, 'Alt Banned', `${member.user.tag} — ${ageDays.toFixed(1)}d`, 0xFF4444, 'HIGH'); }
  else {
    await sendAlert(client, member.guild, 'Alt Account Detected', `${member.user.tag} (\`${member.id}\`) — cuenta de **${ageDays.toFixed(1)} días** (mínimo: ${minDays}d)`, 0xFFFF00, 'LOW');
    const ch = member.guild.channels.cache.get(cfg.securityLog || cfg.logChannel);
    if (ch) await ch.send({ embeds: [new EmbedBuilder().setColor(0xFFFF00).setTitle('⚠️ Posible Alt').setDescription(`${member.user.tag} — cuenta de **${ageDays.toFixed(1)} días**.`).setTimestamp()] }).catch(() => {});
  }
}

// ── Ghost ping tracking ────────────────────────────────────────────────────
const recentMentions = new Map();

function trackMessage(message) {
  if (!message.guild || message.mentions.users.size === 0) return;
  recentMentions.set(message.id, {
    authorId: message.author?.id, authorTag: message.author?.tag,
    guildId: message.guild.id, channelId: message.channel.id,
    mentions: [...message.mentions.users.keys()],
    content: message.content?.slice(0, 200), ts: Date.now()
  });
  if (recentMentions.size > 500) {
    const cut = Date.now() - 30000;
    for (const [k, v] of recentMentions) if (v.ts < cut) recentMentions.delete(k);
  }
}

async function checkGhostPing(messageId, client) {
  const data = recentMentions.get(messageId);
  if (!data) return;
  recentMentions.delete(messageId);
  if (Date.now() - data.ts > 10000) return;

  const guild = client.guilds.cache.get(data.guildId);
  if (!guild) return;
  const cfg = db.get('guilds', data.guildId, {});
  if (!cfg.security?.antiGhostPing) return;

  const ch = guild.channels.cache.get(cfg.securityLog || cfg.logChannel);
  if (ch) await ch.send({ embeds: [new EmbedBuilder().setColor(0xFF9900).setTitle('👻 Ghost Ping')
    .addFields(
      { name: 'Autor',      value: `<@${data.authorId}>`, inline: true },
      { name: 'Canal',      value: `<#${data.channelId}>`, inline: true },
      { name: 'Mencionados', value: data.mentions.map(id => `<@${id}>`).join(', ').slice(0, 300) }
    ).setTimestamp().setFooter({ text: 'System 777 · Anti-Ghost-Ping' })] }).catch(() => {});
  flagUser(data.authorId, data.guildId, 'ghost_ping');
}

// ── VPS Monitor ────────────────────────────────────────────────────────────
let monitorInterval = null;

function startVPSMonitor(client) {
  if (monitorInterval) return;
  const cfg = db.get('bot_config', 'vps_monitor') || {};
  monitorInterval = setInterval(async () => {
    try {
      const mem = process.memoryUsage();
      const ramMB = mem.heapUsed / 1024 / 1024;
      const rssMB = mem.rss / 1024 / 1024;
      const c = db.get('bot_config', 'vps_monitor') || {};
      if (ramMB > (c.maxRamMB || 400)) await sendAlert(client, null, 'High RAM', `Heap: **${ramMB.toFixed(1)} MB** (límite ${c.maxRamMB || 400} MB)`, 0xFF9900, 'HIGH');
      db.set('bot_config', 'last_monitor_check', { ts: Date.now(), ramMB: ramMB.toFixed(1), rssMB: rssMB.toFixed(1), uptime: process.uptime() });
    } catch {}
  }, (cfg.intervalMinutes || 5) * 60 * 1000);
}

function stopVPSMonitor() {
  if (monitorInterval) { clearInterval(monitorInterval); monitorInterval = null; }
}

// ── Bigram similarity (0-1) ───────────────────────────────────────────────
function _similarity(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const s1 = new Set();
  for (let i = 0; i < a.length - 1; i++) s1.add(a[i] + a[i + 1]);
  let inter = 0, total2 = 0;
  for (let i = 0; i < b.length - 1; i++) { if (s1.has(b[i] + b[i + 1])) inter++; total2++; }
  return (2.0 * inter) / (s1.size + total2);
}

// ── Global ban enforcement on join ────────────────────────────────────────
// Checks: 1) direct global ban  2) known linked alt
async function checkGlobalBan(member, client) {
  const gbans = db.get('globalbans', 'users', {});

  // Direct hit
  if (gbans[member.id]) {
    await member.ban({ reason: `System 777 · Ban Global: ${gbans[member.id].reason}` }).catch(() => {});
    await sendAlert(client, member.guild, 'Ban Global Aplicado',
      `${member.user.tag} (\`${member.id}\`) intentó entrar — está en ban global\nRazón: ${gbans[member.id].reason}`,
      0xFF0000, 'CRITICAL');
    return true;
  }

  // Linked alt check
  const altLinks = db.get('globalbans', 'alt_links', {});
  for (const [bannedId, alts] of Object.entries(altLinks)) {
    if (!Array.isArray(alts) || !alts.includes(member.id)) continue;
    const parentReason = gbans[bannedId]?.reason || 'Ban global';
    await member.ban({ reason: `System 777 · Alt de usuario baneado globalmente (${bannedId}): ${parentReason}` }).catch(() => {});
    await sendAlert(client, member.guild, '🔗 Alt Baneada — Ban Global',
      `${member.user.tag} (\`${member.id}\`) es alt vinculada de \`${bannedId}\`\nRazón original: ${parentReason}`,
      0xFF0000, 'CRITICAL');
    // Propagate ban globally for this alt
    if (!gbans[member.id]) {
      gbans[member.id] = { reason: `Alt de ${bannedId}: ${parentReason}`, bannedBy: 'system', ts: Date.now() };
      db.set('globalbans', 'users', gbans);
      for (const guild of client.guilds.cache.values()) {
        if (guild.id === member.guild.id) continue;
        await guild.bans.create(member.id, { reason: `System 777 · Alt detectada de ${bannedId}` }).catch(() => {});
      }
    }
    return true;
  }

  return false;
}

// ── Ban evasion detection (username similarity) ───────────────────────────
// Compares joining member's username against server ban list
async function checkBanEvasion(member, client) {
  const cfg = db.get('guilds', member.guild.id, {});
  if (!cfg.security?.antiBanEvasion) return false;

  let bans;
  try { bans = await member.guild.bans.fetch({ limit: 200 }); } catch { return false; }
  if (!bans || !bans.size) return false;

  const newName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (newName.length < 3) return false;

  const threshold = cfg.security?.banEvasionThreshold ?? 0.80;
  const action    = cfg.security?.banEvasionAction    ?? 'alert';

  for (const ban of bans.values()) {
    const banName = ban.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (banName.length < 3) continue;
    const sim = _similarity(newName, banName);
    if (sim < threshold) continue;

    flagUser(member.id, member.guild.id, `ban_evasion:${ban.user.id}`);
    const desc = `${member.user.tag} (\`${member.id}\`) — similar a baneado **${ban.user.tag}** (\`${ban.user.id}\`)\nSimilitud: ${Math.round(sim * 100)}%`;

    if (action === 'ban') {
      await member.ban({ reason: `System 777 · Posible ban evasion (similar a ${ban.user.tag})` }).catch(() => {});
      await sendAlert(client, member.guild, 'Ban Evasion · Auto-Ban', desc, 0xFF0000, 'CRITICAL');
      return true;
    } else if (action === 'kick') {
      await member.kick('System 777 · Posible ban evasion').catch(() => {});
      await sendAlert(client, member.guild, 'Ban Evasion · Kick', desc, 0xFF4444, 'HIGH');
      return true;
    } else {
      await sendAlert(client, member.guild, 'Posible Ban Evasion Detectada', desc, 0xFF9900, 'HIGH');
      return false;
    }
  }
  return false;
}

// ── Getters ────────────────────────────────────────────────────────────────
function getUserFlags(userId, guildId) { return (db.get('security_flags', guildId) || {})[userId] || { flags: [], score: 0 }; }
function getAlerts(guildId, limit = 20) { return (db.get('security_alerts', guildId) || []).slice(0, limit); }
function getAltsList(guildId, limit = 30) { return (db.get('security_alts', guildId) || []).slice(0, limit); }

module.exports = {
  checkPhishing, checkInviteSpam, checkMassMention,
  checkZalgo, checkDuplicate, checkTokenLeak, checkNSFW, checkAttachmentSpam,
  checkAltAccount, checkGlobalBan, checkBanEvasion,
  trackMessage, checkGhostPing,
  startVPSMonitor, stopVPSMonitor,
  flagUser, applyPunishment, isWhitelisted, sendAlert,
  getUserFlags, getAlerts, getAltsList,
};
