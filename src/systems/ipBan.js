/**
 * ipBan.js — Sistema de IP Ban con lookup real, persistencia y auditoría
 *
 * Flujo:
 *   1. El bot envía DM con link de tracking al unirse
 *   2. Al hacer clic, el sitio web captura la IP y llama a POST /api/ip-track
 *   3. ipBan.registerIp() guarda la IP y verifica si está baneada
 *   4. Si está baneada → auto-ban en todos los servidores
 *   5. /globalban ipban ahora soporta lookup por User ID con IP real
 */

const https = require('https');
const http  = require('http');
const dns   = require('dns');
const db    = require('../utils/db');

// ── Límites de la DB ──────────────────────────────────────────────────────────
const MAX_AUDIT_ENTRIES = 500;
const MAX_IPS_PER_USER = 20;

// ── HTTP GET helper ───────────────────────────────────────────────────────────
function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      timeout: timeoutMs,
      lookup: (hostname, opts, cb) => {
        const timer = setTimeout(() => cb(new Error('DNS lookup timeout')), timeoutMs);
        dns.lookup(hostname, opts, (err, addr, fam) => {
          clearTimeout(timer);
          cb(err, addr, fam);
        });
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('Respuesta no-JSON de IP API')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout consultando IP API')); });
  });
}

// ── Lookup de IP con ip-api.com (gratis, 45 req/min) ─────────────────────────
async function lookupIp(ip) {
  try {
    const data = await httpGet(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,org,as,query`);
    if (data.status === 'success') {
      return {
        ip:       data.query,
        country:  data.country,
        region:   data.regionName,
        city:     data.city,
        isp:      data.isp,
        org:      data.org,
        as:       data.as,
        ts:       Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Verificar si una IP está baneada ─────────────────────────────────────────
function isBanned(ip) {
  const bannedIps = db.get('ip_registry', 'banned_ips', {});
  return bannedIps[ip] || null;
}

// ── Banear una IP ────────────────────────────────────────────────────────────
function banIp(ip, reason, bannedBy) {
  const bannedIps = db.get('ip_registry', 'banned_ips', {});
  bannedIps[ip] = {
    reason,
    bannedBy,
    ts: Date.now(),
    lookup: null, // se llena después si hay lookup
  };
  db.set('ip_registry', 'banned_ips', bannedIps);

  addAuditEntry({
    action:    'ip_ban',
    ip,
    reason,
    bannedBy,
    ts: Date.now(),
  });

  return bannedIps[ip];
}

// ── Desbanear una IP ─────────────────────────────────────────────────────────
function unbanIp(ip, unbannedBy) {
  const bannedIps = db.get('ip_registry', 'banned_ips', {});
  if (!bannedIps[ip]) return false;

  const entry = bannedIps[ip];
  delete bannedIps[ip];
  db.set('ip_registry', 'banned_ips', bannedIps);

  // Desbanear todas las cuentas asociadas a esta IP
  const reg = db.get('ip_registry', 'data', {});
  const usersOnIp = reg[ip] || [];
  const gbans = db.get('globalbans', 'users', {});
  let unbannedCount = 0;

  for (const userId of usersOnIp) {
    if (gbans[userId] && gbans[userId].reason?.includes(`IP Ban (${ip})`)) {
      delete gbans[userId];
      unbannedCount++;
    }
  }
  if (unbannedCount > 0) db.set('globalbans', 'users', gbans);

  addAuditEntry({
    action:    'ip_unban',
    ip,
    reason:    entry.reason,
    unbannedBy,
    ts: Date.now(),
    usersUnbanned: unbannedCount,
  });

  return { unbannedCount, originalBan: entry };
}

// ── Registrar IP de un usuario ───────────────────────────────────────────────
async function registerIp(userId, ip, source = 'tracking') {
  const uips = db.get('ip_registry', 'user_ips', {});
  const reg  = db.get('ip_registry', 'data', {});
  const bannedIps = db.get('ip_registry', 'banned_ips', {});

  // Agregar IP al usuario
  if (!uips[userId]) uips[userId] = [];
  if (!uips[userId].includes(ip)) {
    uips[userId].push(ip);
    if (uips[userId].length > MAX_IPS_PER_USER) uips[userId].shift();
  }
  db.set('ip_registry', 'user_ips', uips);

  // Agregar usuario al registro de la IP
  if (!reg[ip]) reg[ip] = [];
  if (!reg[ip].includes(userId)) reg[ip].push(userId);
  db.set('ip_registry', 'data', reg);

  // Lookup de la IP
  const lookup = await lookupIp(ip).catch(() => null);

  // Verificar si la IP está baneada
  if (bannedIps[ip]) {
    return { banned: true, ban: bannedIps[ip], lookup };
  }

  return { banned: false, lookup };
}

// ── Auto-ban de una IP (con todas las cuentas asociadas) ─────────────────────
async function autoBanIp(ip, reason, bannedBy = 'system', client = null) {
  const banned = banIp(ip, reason, bannedBy);
  const lookup = await lookupIp(ip).catch(() => null);
  if (lookup) {
    banned.lookup = lookup;
    const bannedIps = db.get('ip_registry', 'banned_ips', {});
    bannedIps[ip] = banned;
    db.set('ip_registry', 'banned_ips', bannedIps);
  }

  // Banear todas las cuentas en esta IP
  const reg = db.get('ip_registry', 'data', {});
  const usersOnIp = reg[ip] || [];
  const gbans = db.get('globalbans', 'users', {});
  let totalGuildBans = 0;

  for (const userId of usersOnIp) {
    gbans[userId] = {
      reason:    `IP Ban (${ip}): ${reason}`,
      bannedBy,
      ts:        Date.now(),
      permanent: true,
    };
    if (client) {
      for (const guild of client.guilds.cache.values()) {
        try {
          await guild.bans.create(userId, { reason: `System 777 · IP Ban automático: ${reason}` });
          totalGuildBans++;
        } catch {}
      }
    }
  }
  if (usersOnIp.length > 0) db.set('globalbans', 'users', gbans);

  return { banned, usersAffected: usersOnIp.length, totalGuildBans };
}

// ── Verificar IP al entrar al servidor ───────────────────────────────────────
async function checkOnJoin(member, client) {
  // Solo aplica si el bot tiene la tracking IP del usuario
  const uips = db.get('ip_registry', 'user_ips', {});
  const ips = uips[member.id] || [];
  if (!ips.length) return null;

  const bannedIps = db.get('ip_registry', 'banned_ips', {});
  for (const ip of ips) {
    if (bannedIps[ip]) {
      // Auto-ban
      try {
        await member.ban({
          reason: `System 777 · IP Ban automático (${ip}): ${bannedIps[ip].reason}`,
        });
        addAuditEntry({
          action:  'auto_ban_on_join',
          ip,
          userId:  member.id,
          userTag: member.user.tag,
          reason:  bannedIps[ip].reason,
          ts:      Date.now(),
        });
      } catch {}
      return { ip, ban: bannedIps[ip] };
    }
  }
  return null;
}

// ── Log de auditoría ─────────────────────────────────────────────────────────
function addAuditEntry(entry) {
  const audit = db.get('ip_registry', 'audit', []);
  audit.unshift({ ...entry, id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
  if (audit.length > MAX_AUDIT_ENTRIES) audit.splice(MAX_AUDIT_ENTRIES);
  db.set('ip_registry', 'audit', audit);
}

function getAuditLog(limit = 50) {
  const audit = db.get('ip_registry', 'audit', []);
  return audit.slice(0, limit);
}

// ── Stats ────────────────────────────────────────────────────────────────────
function getStats() {
  const bannedIps = db.get('ip_registry', 'banned_ips', {});
  const uips      = db.get('ip_registry', 'user_ips', {});
  const reg       = db.get('ip_registry', 'data', {});
  const audit     = db.get('ip_registry', 'audit', []);

  return {
    totalBannedIps:  Object.keys(bannedIps).length,
    totalTrackedUsers: Object.keys(uips).length,
    totalTrackedIps: Object.keys(reg).length,
    totalAuditEntries: audit.length,
    recentBans: Object.entries(bannedIps)
      .sort((a, b) => b[1].ts - a[1].ts)
      .slice(0, 10)
      .map(([ip, d]) => ({ ip, ...d })),
  };
}

// ── Obtener IPs de un usuario (con info de ban) ──────────────────────────────
function getUserIps(userId) {
  const uips      = db.get('ip_registry', 'user_ips', {});
  const reg       = db.get('ip_registry', 'data', {});
  const bannedIps = db.get('ip_registry', 'banned_ips', {});

  const ips = uips[userId] || [];
  return ips.map(ip => ({
    ip,
    isBanned:  !!bannedIps[ip],
    banReason: bannedIps[ip]?.reason || null,
    otherUsers: (reg[ip] || []).filter(id => id !== userId),
  }));
}

// ── Obtener todas las IPs baneadas ───────────────────────────────────────────
function getBannedIps() {
  const bannedIps = db.get('ip_registry', 'banned_ips', {});
  return Object.entries(bannedIps).map(([ip, d]) => ({
    ip,
    ...d,
  }));
}

module.exports = {
  lookupIp,
  isBanned,
  banIp,
  unbanIp,
  registerIp,
  autoBanIp,
  checkOnJoin,
  addAuditEntry,
  getAuditLog,
  getStats,
  getUserIps,
  getBannedIps,
};
