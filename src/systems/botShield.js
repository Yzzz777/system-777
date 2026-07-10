// Bot Shield — protección contra bots anti-seguridad y acciones masivas
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const logger = require('../utils/logger');

// Bots anti-nuke/seguridad conocidos (IDs)
const KNOWN_SECURITY_BOTS = new Map([
  ['536991182035746816', 'Wick'],
  ['515627362088271872', 'Beemo'],
  ['155149108183695360', 'Dyno'],
  ['235148962103951360', 'Carl-bot'],
  ['159985870458322944', 'MEE6'],
  ['569566608817192960', 'Arcane'],
  ['567705093213184000', 'Xenon'],
  ['282859044593598464', 'Gaius'],
  ['996460932564684830', 'Safebot'],
  ['743009554614468608', 'Atlas'],
  ['437808476106784770', 'Combot'],
  ['678344927997853742', 'ServerStats'],
  ['270904126974590976', 'Vortex'],
  ['432610292342702080', 'Zira'],
]);

// Rate limit tracker: { userId: [timestamps] }
const modActionLog = new Map();
const RATE_LIMIT_WINDOW  = 10_000; // 10 segundos
const RATE_LIMIT_MAX     = 5;      // máx 5 acciones en 10s antes de alertar

// Guilds donde hay bots de seguridad detectados: { guildId: [botNames] }
const securityBotsInGuild = new Map();

let _client = null;
let _ownerId = null;

function init(client) {
  _client  = client;
  _ownerId = process.env.OWNER_ID;
}

// Llamar desde interactionCreate/comandos cada vez que el bot hace una acción de mod
function trackAction(guildId, action = 'mod') {
  const key = guildId;
  const now  = Date.now();
  const list = (modActionLog.get(key) || []).filter(ts => now - ts < RATE_LIMIT_WINDOW);
  list.push(now);
  modActionLog.set(key, list);

  if (list.length >= RATE_LIMIT_MAX) {
    _alertOwner(
      `⚠️ Rate limit propio en **${guildId}**: ${list.length} acciones en ${RATE_LIMIT_WINDOW / 1000}s — posible detección por anti-nuke`,
      0xFF9900
    ).catch(() => {});
    return false; // caller puede decidir pausar
  }
  return true;
}

// Llamar en guildMemberAdd para detectar bots de seguridad que entran al servidor
async function onMemberAdd(member) {
  if (!member.user.bot) return;
  const botName = KNOWN_SECURITY_BOTS.get(member.user.id);
  if (!botName) return;

  const list = securityBotsInGuild.get(member.guild.id) || [];
  if (!list.includes(botName)) list.push(botName);
  securityBotsInGuild.set(member.guild.id, list);

  logger.warn(`[SHIELD] Bot de seguridad detectado en ${member.guild.name}: ${botName} (${member.user.id})`);

  await _alertOwner(
    `🔍 Bot de seguridad **${botName}** (`+ '`' + member.user.id + '`' + `) detectado en **${member.guild.name}** (\`${member.guild.id}\`).\n` +
    `> Sistema 777 está operando con precaución en este servidor.`,
    0xFEE75C,
    member.guild
  ).catch(() => {});
}

// Llamar en guildMemberRemove — detectar si el bot fue kickeado
async function onMemberRemove(member, client) {
  if (member.user.id !== (client || _client)?.user?.id) return;

  // El bot fue kickeado de este guild
  logger.warn(`[SHIELD] Bot kickeado de: ${member.guild.name} (${member.guild.id})`);

  let kickedBy = 'Desconocido';
  try {
    const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 3 }).catch(() => null);
    if (logs) {
      const entry = logs.entries.find(e => e.target?.id === member.user.id && Date.now() - e.createdTimestamp < 15000);
      if (entry) kickedBy = `${entry.executor?.tag ?? '?'} (\`${entry.executor?.id ?? '?'}\`)`;
    }
  } catch {}

  const secBots = securityBotsInGuild.get(member.guild.id);
  const secNote = secBots?.length ? `\n> ⚠️ Bots de seguridad activos en ese servidor: **${secBots.join(', ')}**` : '';

  const reinvite = `https://discord.com/oauth2/authorize?client_id=${member.user.id}&permissions=8&scope=bot+applications.commands`;
  await _alertOwner(
    `🚨 **Bot kickeado** de **${member.guild.name}** (\`${member.guild.id}\`)\n` +
    `> Ejecutado por: ${kickedBy}${secNote}\n` +
    `> [Re-agregar bot](${reinvite})`,
    0xFF2222,
    member.guild
  ).catch(() => {});
}

// Llamar en guildBanAdd — detectar si el bot fue baneado
async function onBanAdd(guild, user, client) {
  const cl = client || _client;
  if (user.id !== cl?.user?.id) return;

  logger.warn(`[SHIELD] Bot baneado de: ${guild.name} (${guild.id})`);

  let bannedBy = 'Desconocido';
  try {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 3 }).catch(() => null);
    if (logs) {
      const entry = logs.entries.find(e => e.target?.id === user.id && Date.now() - e.createdTimestamp < 15000);
      if (entry) bannedBy = `${entry.executor?.tag ?? '?'} (\`${entry.executor?.id ?? '?'}\`)`;
    }
  } catch {}

  const secBots = securityBotsInGuild.get(guild.id);
  const secNote = secBots?.length ? `\n> ⚠️ Bots de seguridad en ese servidor: **${secBots.join(', ')}**` : '';

  await _alertOwner(
    `🔨 **Bot BANEADO** de **${guild.name}** (\`${guild.id}\`)\n` +
    `> Ejecutado por: ${bannedBy}${secNote}`,
    0xFF0000,
    guild
  ).catch(() => {});
}

// Escanear guild al entrar: detectar bots de seguridad presentes
async function scanGuildOnJoin(guild) {
  try {
    await guild.members.fetch();
    const found = [];
    for (const [memberId, member] of guild.members.cache) {
      if (!member.user.bot) continue;
      const name = KNOWN_SECURITY_BOTS.get(memberId);
      if (name) found.push(name);
    }
    if (found.length) {
      securityBotsInGuild.set(guild.id, found);
      logger.warn(`[SHIELD] ${found.length} bot(s) de seguridad en ${guild.name}: ${found.join(', ')}`);
      await _alertOwner(
        `🔍 Unido a **${guild.name}** — detectados **${found.length}** bot(s) de seguridad: **${found.join(', ')}**\n` +
        `> Sistema 777 operará con cuidado en este servidor.`,
        0xFEE75C,
        guild
      ).catch(() => {});
    }
  } catch {}
}

// Devuelve true si el guild tiene bots de seguridad conocidos
function hasSecurityBot(guildId) {
  return (securityBotsInGuild.get(guildId) || []).length > 0;
}

async function _alertOwner(description, color = 0xFF9900, guild = null) {
  if (!_client || !_ownerId) return;
  try {
    const owner = await _client.users.fetch(_ownerId);
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🛡️ System 777 — Alerta de Escudo')
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: 'System 777 · Bot Shield · Protección activa' });
    if (guild?.iconURL) embed.setThumbnail(guild.iconURL({ size: 128 }) ?? null);
    await owner.send({ embeds: [embed] });
  } catch {}
}

module.exports = {
  init,
  trackAction,
  onMemberAdd,
  onMemberRemove,
  onBanAdd,
  scanGuildOnJoin,
  hasSecurityBot,
};
