const { EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const db     = require('../utils/db');
const logger = require('./logger');

// Tracker: Map<guildId_executorId, { bans:[], delChannels:[], delRoles:[], ts:number }>
const tracker = new Map();
const WINDOW  = 15000; // 15 segundos

function getTrack(guildId, execId) {
  const key = `${guildId}_${execId}`;
  if (!tracker.has(key)) tracker.set(key, { bans:[], delChannels:[], delRoles:[], webhooks:[] });
  return tracker.get(key);
}

function clean(arr) {
  const now = Date.now();
  return arr.filter(t => now - t < WINDOW);
}

async function punishNuker(guild, executor, reason, client) {
  const cfg = db.get('guilds', guild.id, {});
  if (!cfg.antinuke) return;

  // No castigar al owner del servidor ni al owner del bot
  const ownerId = process.env.OWNER_ID;
  if (executor.id === guild.ownerId || executor.id === ownerId) return;

  const member = await guild.members.fetch(executor.id).catch(() => null);
  if (!member) return;

  // 1. Remover TODOS los roles peligrosos
  const dangerRoles = member.roles.cache.filter(r =>
    r.permissions.has(PermissionFlagsBits.Administrator) ||
    r.permissions.has(PermissionFlagsBits.ManageGuild) ||
    r.permissions.has(PermissionFlagsBits.BanMembers) ||
    r.permissions.has(PermissionFlagsBits.ManageChannels) ||
    r.permissions.has(PermissionFlagsBits.ManageRoles)
  );
  for (const [, role] of dangerRoles) {
    await member.roles.remove(role, `System 777 · Anti-Nuke: ${reason}`).catch(() => {});
  }

  // 2. Timeout 24h
  await member.timeout(86400000, `System 777 · Anti-Nuke: ${reason}`).catch(() => {});

  // 3. Notificar al owner del bot y al canal de logs
  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('🚨 ANTI-NUKE ACTIVADO')
    .setDescription(`**Posible ataque de nuke detectado en ${guild.name}**`)
    .addFields(
      { name: '⚠️ Ejecutor',   value: `${executor.tag}\n\`${executor.id}\``, inline: true },
      { name: '🔍 Acción',     value: reason,                                 inline: true },
      { name: '⚡ Respuesta',  value: 'Roles peligrosos removidos + Timeout 24h', inline: false },
    )
    .setThumbnail(executor.displayAvatarURL({ size: 128 }))
    .setFooter({ text: 'System 777 · Anti-Nuke System' })
    .setTimestamp();

  await logger.dmOwner(client, null, embed);

  if (cfg.logChannel) {
    const ch = guild.channels.cache.get(cfg.logChannel);
    if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
  }
}

// ── TRIGGERS ───────────────────────────────────────────────────
async function onBanAdd(guild, user, client) {
  const cfg = db.get('guilds', guild.id, {});
  if (!cfg.antinuke) return;

  const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBan, limit: 1 }).catch(() => null);
  const exec = logs?.entries.first()?.executor;
  if (!exec) return;

  const track = getTrack(guild.id, exec.id);
  track.bans = clean(track.bans);
  track.bans.push(Date.now());

  const limit = cfg.nukebanLimit ?? 3;
  if (track.bans.length >= limit) {
    track.bans = [];
    await punishNuker(guild, exec, `${limit}+ bans en ${WINDOW/1000}s`, client);
  }
}

async function onChannelDelete(guild, channel, client) {
  const cfg = db.get('guilds', guild.id, {});
  if (!cfg.antinuke) return;

  const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }).catch(() => null);
  const exec = logs?.entries.first()?.executor;
  if (!exec) return;

  const track = getTrack(guild.id, exec.id);
  track.delChannels = clean(track.delChannels);
  track.delChannels.push(Date.now());

  const limit = cfg.nukechannelLimit ?? 2;
  if (track.delChannels.length >= limit) {
    track.delChannels = [];
    await punishNuker(guild, exec, `${limit}+ canales borrados en ${WINDOW/1000}s`, client);
  }
}

async function onRoleDelete(guild, role, client) {
  const cfg = db.get('guilds', guild.id, {});
  if (!cfg.antinuke) return;

  const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 }).catch(() => null);
  const exec = logs?.entries.first()?.executor;
  if (!exec) return;

  const track = getTrack(guild.id, exec.id);
  track.delRoles = clean(track.delRoles);
  track.delRoles.push(Date.now());

  const limit = cfg.nukeroleLimit ?? 2;
  if (track.delRoles.length >= limit) {
    track.delRoles = [];
    await punishNuker(guild, exec, `${limit}+ roles borrados en ${WINDOW/1000}s`, client);
  }
}

async function onWebhookCreate(guild, webhook, client) {
  const cfg = db.get('guilds', guild.id, {});
  if (!cfg.antinuke) return;

  const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.WebhookCreate, limit: 1 }).catch(() => null);
  const exec = logs?.entries.first()?.executor;
  if (!exec) return;

  const ownerId = process.env.OWNER_ID;
  if (exec.id === guild.ownerId || exec.id === ownerId) return;

  const track = getTrack(guild.id, exec.id);
  track.webhooks = clean(track.webhooks);
  track.webhooks.push(Date.now());

  if (track.webhooks.length >= 2) {
    track.webhooks = [];
    await webhook.delete('System 777 · Anti-Nuke: webhook sospechoso').catch(() => {});
    await punishNuker(guild, exec, '2+ webhooks creados en 15s', client);
  }
}

module.exports = { onBanAdd, onChannelDelete, onRoleDelete, onWebhookCreate };
