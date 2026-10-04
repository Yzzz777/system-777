const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const db = require('../utils/db');

// Config de canales de log por categoría
function getLogChannel(guild, category) {
  const cfg = db.get('guilds', guild.id, {});
  const chId = cfg[`log_${category}`] ?? cfg.logChannel;
  if (!chId) return null;
  return guild.channels.cache.get(chId) ?? null;
}

const COLORS = {
  ban: 0xFF2222, unban: 0x00FF88, kick: 0xFF6600, warn: 0xFFCC00,
  timeout: 0xFF9900, delete: 0xFF4444, edit: 0xFFAA00,
  join: 0x00CCFF, leave: 0xAAAAAA,
  voice_join: 0x00FF88, voice_leave: 0xFF6666, voice_move: 0xFFAA00,
  role_add: 0xAA00FF, role_remove: 0x7700CC,
  role_create: 0x00FF88, role_update: 0xFFAA00, role_delete: 0xFF4444,
  nick: 0x5865F2,
  channel_create: 0x00FF88, channel_delete: 0xFF4444, channel_update: 0xFFAA00,
  webhook_update: 0x5865F2, guild_update: 0x5865F2,
  invite: 0xFFCC00, flood: 0xFF2222, automod: 0xFF6600,
};

function findFallbackChannel(guild) {
  const names = ['bot-logs', 'audit-logs', 'logs', 'log'];
  for (const name of names) {
    const ch = guild.channels.cache.find(c => c.name === name && c.isTextBased());
    if (ch) return ch;
  }
  return null;
}

async function send(guild, category, embed) {
  let ch = getLogChannel(guild, category);
  if (!ch) {
    ch = findFallbackChannel(guild);
  }
  if (!ch) return;
  const perms = ch.permissionsFor(guild.members.me);
  if (!perms?.has('SendMessages') || !perms?.has('EmbedLinks')) {
    ch = findFallbackChannel(guild);
    if (!ch) return;
  }
  embed
    .setColor(COLORS[category] ?? 0x888888)
    .setTimestamp()
    .setFooter({ text: `System 777 · Logs`, iconURL: guild.client.user.displayAvatarURL({ size: 32 }) });
  await ch.send({ embeds: [embed] }).catch(() => {});
}

async function fetchAuditEntry(guild, auditType) {
  try {
    const logs = await guild.fetchAuditLogs({ type: auditType, limit: 1 });
    const entry = logs.entries.first();
    if (!entry || (Date.now() - entry.createdTimestamp) > 10000) return null;
    return entry;
  } catch { return null; }
}

async function logActivitySafe(guild, entry) {
  try { db.logActivity(guild.id, entry); } catch {}
}

function saveMod(guildId, entry) {
  const key  = `mod_${guildId}`;
  const logs = db.get('modlogs', key, []);
  logs.unshift(entry);
  if (logs.length > 500) logs.length = 500;
  db.set('modlogs', key, logs);
}

// ── MODERACIÓN ─────────────────────────────────────────────────
async function logBan(guild, user, moderator, reason) {
  saveMod(guild.id, { type:'ban', userId:user.id, mod:moderator?.id, reason, ts:Date.now() });
  await send(guild, 'ban', new EmbedBuilder()
    .setTitle('🔨 Usuario Baneado')
    .setThumbnail(user.displayAvatarURL?.() ?? null)
    .addFields(
      { name: '👤 Usuario',   value: `${user.tag}\n\`${user.id}\``,       inline: true },
      { name: '👮 Moderador', value: moderator?.tag ?? 'Sistema',          inline: true },
      { name: '📝 Razón',     value: reason ?? 'Sin razón',                inline: false },
    ));
}

async function logUnban(guild, user, moderator) {
  saveMod(guild.id, { type:'unban', userId:user.id, mod:moderator?.id, ts:Date.now() });
  await send(guild, 'unban', new EmbedBuilder()
    .setTitle('✅ Desban')
    .setThumbnail(user.displayAvatarURL?.() ?? null)
    .addFields(
      { name: '👤 Usuario',   value: `${user.tag}\n\`${user.id}\``, inline: true },
      { name: '👮 Moderador', value: moderator?.tag ?? 'Sistema',   inline: true },
    ));
}

async function logKick(guild, user, moderator, reason) {
  saveMod(guild.id, { type:'kick', userId:user.id, mod:moderator?.id, reason, ts:Date.now() });
  await send(guild, 'kick', new EmbedBuilder()
    .setTitle('👢 Usuario Expulsado')
    .setThumbnail(user.displayAvatarURL?.() ?? null)
    .addFields(
      { name: '👤 Usuario',   value: `${user.tag}\n\`${user.id}\``, inline: true },
      { name: '👮 Moderador', value: moderator?.tag ?? 'Sistema',   inline: true },
      { name: '📝 Razón',     value: reason ?? 'Sin razón',          inline: false },
    ));
}

async function logWarn(guild, user, moderator, reason) {
  saveMod(guild.id, { type:'warn', userId:user.id, mod:moderator?.id, reason, ts:Date.now() });
  const total = db.get('warns', `warn_${guild.id}_${user.id}`, []).length;
  await send(guild, 'warn', new EmbedBuilder()
    .setTitle('⚠️ Advertencia Emitida')
    .setThumbnail(user.displayAvatarURL?.() ?? null)
    .addFields(
      { name: '👤 Usuario',       value: `${user.tag}\n\`${user.id}\``, inline: true },
      { name: '👮 Moderador',     value: moderator?.tag ?? 'Sistema',   inline: true },
      { name: '⚠️ Total warns',   value: `${total}`,                    inline: true },
      { name: '📝 Razón',         value: reason ?? 'Sin razón',          inline: false },
    ));
}

async function logTimeout(guild, user, moderator, duration, reason) {
  saveMod(guild.id, { type:'timeout', userId:user.id, mod:moderator?.id, reason, duration, ts:Date.now() });
  await send(guild, 'timeout', new EmbedBuilder()
    .setTitle('⏱️ Timeout Aplicado')
    .setThumbnail(user.displayAvatarURL?.() ?? null)
    .addFields(
      { name: '👤 Usuario',   value: `${user.tag}\n\`${user.id}\``, inline: true },
      { name: '👮 Moderador', value: moderator?.tag ?? 'Sistema',   inline: true },
      { name: '⏱️ Duración',  value: duration ?? '?',              inline: true },
      { name: '📝 Razón',     value: reason ?? 'Sin razón',          inline: false },
    ));
}

// ── MENSAJES ───────────────────────────────────────────────────
async function logDelete(guild, message) {
  if (!message.content && !message.attachments?.size) return;
  const embed = new EmbedBuilder()
    .setTitle('🗑️ Mensaje Eliminado')
    .addFields(
      { name: '👤 Autor',   value: `${message.author?.tag ?? '?'}\n\`${message.author?.id ?? '?'}\``, inline: true },
      { name: '📢 Canal',   value: `<#${message.channelId}>`,                                         inline: true },
    );
  if (message.content)
    embed.addFields({ name: '📝 Contenido', value: message.content.slice(0, 1000) });
  if (message.attachments?.size)
    embed.addFields({ name: '📎 Adjuntos', value: [...message.attachments.values()].map(a => a.name).join(', ').slice(0, 500) });
  await send(guild, 'delete', embed);
}

async function logEdit(guild, oldMsg, newMsg) {
  if (!oldMsg.content || oldMsg.content === newMsg.content) return;
  await send(guild, 'edit', new EmbedBuilder()
    .setTitle('✏️ Mensaje Editado')
    .setURL(newMsg.url)
    .addFields(
      { name: '👤 Autor',     value: `${newMsg.author.tag}\n\`${newMsg.author.id}\``, inline: true },
      { name: '📢 Canal',     value: `<#${newMsg.channelId}>`,                        inline: true },
      { name: '📝 Antes',     value: oldMsg.content.slice(0, 500) || '*vacío*' },
      { name: '✅ Después',   value: newMsg.content.slice(0, 500) || '*vacío*' },
    ));
}

// ── MIEMBROS ───────────────────────────────────────────────────
async function logJoin(guild, member) {
  const ageDays = ((Date.now() - member.user.createdTimestamp) / 86400000).toFixed(1);
  const warn    = parseFloat(ageDays) < 7 ? '⚠️ **Cuenta nueva**' : '';
  await send(guild, 'join', new EmbedBuilder()
    .setTitle('📥 Miembro Unido')
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .setDescription(warn)
    .addFields(
      { name: '👤 Usuario',      value: `${member.user.tag}\n\`${member.user.id}\``,             inline: true },
      { name: '📅 Cuenta creada', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:R>`, inline: true },
      { name: '🗓️ Edad',         value: `${ageDays} días`,                                        inline: true },
      { name: '👥 Miembros ahora', value: `${guild.memberCount}`,                                 inline: true },
    ));
}

async function logLeave(guild, member) {
  await send(guild, 'leave', new EmbedBuilder()
    .setTitle('📤 Miembro Salió')
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: '👤 Usuario',     value: `${member.user.tag}\n\`${member.user.id}\``,       inline: true },
      { name: '⏱️ Estuvo',     value: `<t:${Math.floor(member.joinedTimestamp/1000)}:R>`, inline: true },
      { name: '🎭 Roles',       value: member.roles.cache.filter(r=>r.id!==guild.id).map(r=>r.name).slice(0,8).join(', ') || 'Ninguno', inline: false },
    ));
}

async function logNick(guild, oldMember, newMember) {
  if (oldMember.nickname === newMember.nickname) return;
  await send(guild, 'nick', new EmbedBuilder()
    .setTitle('📝 Nickname Cambiado')
    .addFields(
      { name: '👤 Usuario',  value: `${newMember.user.tag}\n\`${newMember.user.id}\``, inline: true },
      { name: '⬅️ Antes',   value: oldMember.nickname ?? '*ninguno*',                 inline: true },
      { name: '➡️ Después', value: newMember.nickname ?? '*ninguno*',                 inline: true },
    ));
}

async function logRoleChange(guild, oldMember, newMember) {
  const added   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id) && r.id !== guild.id);
  const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id) && r.id !== guild.id);
  if (!added.size && !removed.size) return;

  const embed = new EmbedBuilder()
    .setTitle('🎭 Roles Modificados')
    .setThumbnail(newMember.user.displayAvatarURL({ size: 64 }))
    .addFields({ name: '👤 Usuario', value: `${newMember.user.tag}\n\`${newMember.user.id}\``, inline: false });

  if (added.size)   embed.addFields({ name: '➕ Roles añadidos',  value: added.map(r=>r.toString()).join(', '),   inline: true });
  if (removed.size) embed.addFields({ name: '➖ Roles quitados', value: removed.map(r=>r.toString()).join(', '), inline: true });

  await send(guild, added.size ? 'role_add' : 'role_remove', embed);
}

// ── VOZ ────────────────────────────────────────────────────────
async function logVoice(guild, oldState, newState) {
  const user = newState.member?.user ?? oldState.member?.user;
  if (!user) return;

  if (!oldState.channelId && newState.channelId) {
    await send(guild, 'voice_join', new EmbedBuilder()
      .setTitle('🔊 Entró a voz')
      .addFields(
        { name: '👤 Usuario', value: `${user.tag}`,            inline: true },
        { name: '📢 Canal',   value: `<#${newState.channelId}>`, inline: true },
      ));
  } else if (oldState.channelId && !newState.channelId) {
    await send(guild, 'voice_leave', new EmbedBuilder()
      .setTitle('🔇 Salió de voz')
      .addFields(
        { name: '👤 Usuario', value: `${user.tag}`,            inline: true },
        { name: '📢 Canal',   value: `<#${oldState.channelId}>`, inline: true },
      ));
  } else if (oldState.channelId !== newState.channelId) {
    await send(guild, 'voice_move', new EmbedBuilder()
      .setTitle('🔀 Movido en voz')
      .addFields(
        { name: '👤 Usuario', value: `${user.tag}`,              inline: true },
        { name: '⬅️ Antes',   value: `<#${oldState.channelId}>`, inline: true },
        { name: '➡️ Ahora',   value: `<#${newState.channelId}>`, inline: true },
      ));
  }
}

// ── CANALES ────────────────────────────────────────────────────
async function logChannelCreate(guild, channel) {
  await send(guild, 'channel_create', new EmbedBuilder()
    .setTitle('➕ Canal Creado')
    .addFields(
      { name: '📢 Canal',   value: channel.toString(), inline: true },
      { name: '📁 Tipo',    value: channel.type.toString(), inline: true },
      { name: '🆔 ID',      value: channel.id,          inline: true },
    ));
}

async function logChannelDelete(guild, channel) {
  await send(guild, 'channel_delete', new EmbedBuilder()
    .setTitle('➖ Canal Eliminado')
    .addFields(
      { name: '📢 Nombre', value: `#${channel.name}`, inline: true },
      { name: '🆔 ID',     value: channel.id,          inline: true },
    ));
}

// ── ROLES (create/update) ──────────────────────────────────────
async function logRoleCreate(guild, role) {
  const entry = await fetchAuditEntry(guild, AuditLogEvent.RoleCreate);
  const executor = entry?.executor;
  await logActivitySafe(guild, {
    type: 'role_create', executor: executor ? { id: executor.id, tag: executor.tag, avatar: executor.displayAvatarURL?.() } : null,
    target: { id: role.id, name: role.name, type: 'role' }, timestamp: Date.now(),
  });
  const embed = new EmbedBuilder()
    .setTitle('🎭 Rol Creado')
    .addFields(
      { name: '📛 Nombre',  value: role.toString(), inline: true },
      { name: '🎨 Color',   value: `#${role.color?.toString(16)?.padStart(6, '0') || '000000'}`, inline: true },
      { name: '🆔 ID',      value: role.id, inline: true },
      { name: '👤 Creado por', value: executor ? `${executor.tag}\n\`${executor.id}\`` : 'Desconocido', inline: true },
    );
  if (role.mentionable) embed.addFields({ name: '📣 Mencionable', value: 'Sí', inline: true });
  if (role.hoist) embed.addFields({ name: '📌 Separado', value: 'Sí', inline: true });
  await send(guild, 'role_create', embed);
}

async function logRoleUpdate(guild, oldRole, newRole) {
  const changes = [];
  if (oldRole.name !== newRole.name) changes.push({ before: oldRole.name, after: newRole.name, label: 'Nombre' });
  if (oldRole.color !== newRole.color) changes.push({ before: `#${oldRole.color?.toString(16)?.padStart(6, '0')}`, after: `#${newRole.color?.toString(16)?.padStart(6, '0')}`, label: 'Color' });
  if (oldRole.hoist !== newRole.hoist) changes.push({ before: oldRole.hoist ? 'Sí' : 'No', after: newRole.hoist ? 'Sí' : 'No', label: 'Separado' });
  if (oldRole.mentionable !== newRole.mentionable) changes.push({ before: oldRole.mentionable ? 'Sí' : 'No', after: newRole.mentionable ? 'Sí' : 'No', label: 'Mencionable' });
  if (oldRole.rawPosition !== newRole.rawPosition) changes.push({ before: oldRole.rawPosition, after: newRole.rawPosition, label: 'Posición' });
  if (!changes.length) return;

  const entry = await fetchAuditEntry(guild, AuditLogEvent.RoleUpdate);
  const executor = entry?.executor;
  await logActivitySafe(guild, {
    type: 'role_update', executor: executor ? { id: executor.id, tag: executor.tag, avatar: executor.displayAvatarURL?.() } : null,
    target: { id: newRole.id, name: newRole.name, type: 'role' },
    details: changes.map(c => ({ field: c.label, before: c.before, after: c.after })),
    timestamp: Date.now(),
  });
  const embed = new EmbedBuilder()
    .setTitle('🎭 Rol Editado')
    .addFields(
      { name: '📛 Rol',     value: newRole.toString(), inline: true },
      { name: '👤 Editado por', value: executor ? `${executor.tag}\n\`${executor.id}\`` : 'Desconocido', inline: true },
    );
  for (const c of changes) {
    embed.addFields({ name: c.label, value: `**Antes:** ${c.before}\n**Ahora:** ${c.after}`, inline: true });
  }
  await send(guild, 'role_update', embed);
}

// ── CANALES (update) ──────────────────────────────────────────
async function logChannelUpdate(guild, oldChannel, newChannel) {
  const changes = [];
  if (oldChannel.name !== newChannel.name) changes.push({ before: oldChannel.name, after: newChannel.name, label: 'Nombre' });
  if ((oldChannel.topic || '') !== (newChannel.topic || '')) changes.push({ before: oldChannel.topic || '*vacío*', after: newChannel.topic || '*vacío*', label: 'Tópico' });
  if ((oldChannel.rateLimitPerUser || 0) !== (newChannel.rateLimitPerUser || 0)) changes.push({ before: `${oldChannel.rateLimitPerUser || 0}s`, after: `${newChannel.rateLimitPerUser || 0}s`, label: 'Slowmode' });
  if (oldChannel.nsfw !== newChannel.nsfw) changes.push({ before: oldChannel.nsfw ? 'Sí' : 'No', after: newChannel.nsfw ? 'Sí' : 'No', label: 'NSFW' });
  if (oldChannel.parentId !== newChannel.parentId) changes.push({ before: oldChannel.parentId || 'Ninguna', after: newChannel.parentId || 'Ninguna', label: 'Categoría' });
  if (!changes.length) return;

  const entry = await fetchAuditEntry(guild, AuditLogEvent.ChannelUpdate);
  const executor = entry?.executor;
  await logActivitySafe(guild, {
    type: 'channel_update', executor: executor ? { id: executor.id, tag: executor.tag, avatar: executor.displayAvatarURL?.() } : null,
    target: { id: newChannel.id, name: newChannel.name, type: 'channel' },
    details: changes.map(c => ({ field: c.label, before: c.before, after: c.after })),
    timestamp: Date.now(),
  });
  const embed = new EmbedBuilder()
    .setTitle('📢 Canal Editado')
    .addFields(
      { name: '📢 Canal',     value: newChannel.toString(), inline: true },
      { name: '📁 Tipo',      value: ChannelType[newChannel.type] || newChannel.type.toString(), inline: true },
      { name: '👤 Editado por', value: executor ? `${executor.tag}\n\`${executor.id}\`` : 'Desconocido', inline: true },
    );
  for (const c of changes) {
    const val = c.label === 'Tópico'
      ? `**Antes:** ${c.before.slice(0, 200)}\n**Ahora:** ${c.after.slice(0, 200)}`
      : `**Antes:** ${c.before}\n**Ahora:** ${c.after}`;
    embed.addFields({ name: c.label, value: val, inline: true });
  }
  await send(guild, 'channel_update', embed);
}

// ── WEBHOOKS ──────────────────────────────────────────────────
async function logWebhookUpdate(guild, channel) {
  const entry = await fetchAuditEntry(guild, AuditLogEvent.WebhookCreate);
  const executor = entry?.executor;
  const webhookName = entry?.target?.name || 'Desconocido';
  await logActivitySafe(guild, {
    type: 'webhook_update', executor: executor ? { id: executor.id, tag: executor.tag, avatar: executor.displayAvatarURL?.() } : null,
    target: { id: channel.id, name: channel.name, type: 'channel' },
    details: { webhookName },
    timestamp: Date.now(),
  });
  const embed = new EmbedBuilder()
    .setTitle('🪝 Actividad de Webhook')
    .addFields(
      { name: '📢 Canal',      value: `<#${channel.id}>`, inline: true },
      { name: '📛 Webhook',    value: webhookName, inline: true },
      { name: '👤 Ejecutado por', value: executor ? `${executor.tag}\n\`${executor.id}\`` : 'Desconocido', inline: true },
    );
  await send(guild, 'webhook_update', embed);
}

// ── GUILD (server settings) ───────────────────────────────────
async function logGuildUpdate(oldGuild, newGuild) {
  const changes = [];
  if (oldGuild.name !== newGuild.name) changes.push({ before: oldGuild.name, after: newGuild.name, label: 'Nombre' });
  if (oldGuild.iconURL() !== newGuild.iconURL()) changes.push({ before: oldGuild.iconURL() || '*ninguno*', after: newGuild.iconURL() || '*ninguno*', label: 'Icono' });
  if (oldGuild.splashURL() !== newGuild.splashURL()) changes.push({ before: oldGuild.splashURL() || '*ninguno*', after: newGuild.splashURL() || '*ninguno*', label: 'Splash' });
  if (oldGuild.bannerURL() !== newGuild.bannerURL()) changes.push({ before: oldGuild.bannerURL() || '*ninguno*', after: newGuild.bannerURL() || '*ninguno*', label: 'Banner' });
  if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push({ before: oldGuild.verificationLevel, after: newGuild.verificationLevel, label: 'Nivel de verificación' });
  if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) changes.push({ before: oldGuild.explicitContentFilter, after: newGuild.explicitContentFilter, label: 'Filtro de contenido' });
  if (oldGuild.systemChannelFlags?.bitfield !== newGuild.systemChannelFlags?.bitfield) changes.push({ before: oldGuild.systemChannelFlags?.bitfield, after: newGuild.systemChannelFlags?.bitfield, label: 'System channel flags' });
  if (!changes.length) return;

  const entry = await fetchAuditEntry(newGuild, AuditLogEvent.GuildUpdate);
  const executor = entry?.executor;
  await logActivitySafe(newGuild, {
    type: 'guild_update', executor: executor ? { id: executor.id, tag: executor.tag, avatar: executor.displayAvatarURL?.() } : null,
    target: { id: newGuild.id, name: newGuild.name, type: 'guild' },
    details: changes.map(c => ({ field: c.label, before: c.before, after: c.after })),
    timestamp: Date.now(),
  });
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Configuración del Servidor Cambiada')
    .setThumbnail(newGuild.iconURL({ size: 128 }))
    .addFields(
      { name: '🏠 Servidor', value: newGuild.name, inline: true },
      { name: '👤 Cambiado por', value: executor ? `${executor.tag}\n\`${executor.id}\`` : 'Desconocido', inline: true },
    );
  for (const c of changes) {
    const before = typeof c.before === 'string' && c.before.length > 100 ? c.before.slice(0, 100) + '...' : String(c.before);
    const after = typeof c.after === 'string' && c.after.length > 100 ? c.after.slice(0, 100) + '...' : String(c.after);
    embed.addFields({ name: c.label, value: `**Antes:** ${before}\n**Ahora:** ${after}`, inline: true });
  }
  await send(newGuild, 'guild_update', embed);
}

// ── FLOOD (alerta interna) ─────────────────────────────────────
async function logFlood(guild, user, channel, count) {
  await send(guild, 'flood', new EmbedBuilder()
    .setTitle('🚨 Flood Detectado')
    .addFields(
      { name: '👤 Usuario',   value: `${user.tag}\n\`${user.id}\``, inline: true },
      { name: '📢 Canal',     value: channel.toString(),              inline: true },
      { name: '📨 Mensajes',  value: `${count} en 5s`,               inline: true },
    ));
}

// ── DM AL OWNER ────────────────────────────────────────────────
async function dmOwner(client, content, embed) {
  const ownerId = process.env.OWNER_ID;
  if (!ownerId) return;
  try {
    const owner = await client.users.fetch(ownerId);
    const payload = {};
    if (content) payload.content = content;
    if (embed)   payload.embeds  = [embed];
    await owner.send(payload);
  } catch {}
}

function getModLogs(guildId, userId = null) {
  const logs = db.get('modlogs', `mod_${guildId}`, []);
  return userId ? logs.filter(l => l.userId === userId) : logs;
}

module.exports = {
  logBan, logUnban, logKick, logWarn, logTimeout,
  logDelete, logEdit, logJoin, logLeave,
  logNick, logRoleChange, logVoice,
  logChannelCreate, logChannelDelete, logChannelUpdate,
  logRoleCreate, logRoleUpdate,
  logWebhookUpdate, logGuildUpdate,
  logFlood, dmOwner, getModLogs,
};
