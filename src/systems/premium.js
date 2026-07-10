const db     = require('../utils/db');
const crypto = require('crypto');

// ── Plans ────────────────────────────────────────────────────────────────────
const PLANS = {
  // Primary plans (ooo.txt)
  normal: {
    name: 'Normal', emoji: '⭐', price: '$4.99/mes', duration: 30, color: 0x57F287, tier: 1,
    perks: [
      'Custom welcome embeds con imagen y banner',
      'Perfil avanzado con campos extra y custom badges',
      'Estadísticas premium (online, boosts en tiempo real)',
      'Reaction roles ilimitados',
      'Giveaways premium con rol requerido',
      'Autoresponder premium personalizado',
      'Temas de perfil exclusivos',
      'Multiplicador de economía +50%',
      'Soporte prioritario',
    ],
  },
  pro: {
    name: 'Pro', emoji: '💠', price: '$9.99/mes', duration: 30, color: 0x5865F2, tier: 2,
    perks: [
      'Todo de Normal',
      'Automod avanzado con reglas AI-powered',
      'Anti-raid con puntuación dinámica',
      'Tickets premium con branding y analytics',
      'Logs avanzados con filtros y exportación',
      'Dashboard premium ampliado',
      'Verificación avanzada de usuarios',
      'Backups automáticos del servidor (diarios)',
      'Analytics premium detalladas',
      'XP x2 en sistema de niveles',
      '10 auto-roles configurables',
    ],
  },
  max: {
    name: 'Max', emoji: '💎', price: '$19.99/mes', duration: 30, color: 0xF5C518, tier: 3,
    perks: [
      'Todo de Pro',
      'AI moderation tools',
      'AI analytics y predicciones',
      'Live monitoring en tiempo real',
      'Investigation tools avanzadas (deep scan)',
      'Custom branding completo del servidor',
      'Security features enterprise',
      'Enterprise analytics con gráficos',
      'API exclusiva de acceso',
      'Live dashboards premium',
      'Automations avanzadas ilimitadas',
      'Soporte VIP 24/7',
    ],
  },
  // Legacy plan aliases (kept for backward compat)
  basic:   { name: 'Basic',   emoji: '⭐', price: '$5.99/mes',  duration: 30, color: 0x57F287, tier: 1, perks: ['Economía mejorada', 'Perfil personalizado', 'Soporte prioritario'] },
  gold:    { name: 'Gold',    emoji: '🌟', price: '$9.99/mes',  duration: 30, color: 0xF5C518, tier: 2, perks: ['Todo de Basic', 'XP x2', 'Comandos exclusivos'] },
  diamond: { name: 'Diamond', emoji: '💠', price: '$14.99/mes', duration: 30, color: 0x00BFFF, tier: 2, perks: ['Todo de Gold', 'Analytics avanzado'] },
  eternal: { name: 'Eternal', emoji: '💎', price: '$49.99/año', duration: 0,  color: 0x5865F2, tier: 3, perks: ['Acceso vitalicio', 'Todos los comandos premium'] },
};

const PLAN_ORDER  = ['normal', 'pro', 'max'];
const LEGACY_TIER = { basic: 1, gold: 2, diamond: 2, eternal: 3 };

// ── Store URL ────────────────────────────────────────────────────────────────
function getStoreUrl()    { return db.get('bot_config', 'store_url') || 'https://store.system777.com'; }
function setStoreUrl(url) { db.set('bot_config', 'store_url', url); }

// ── User premium ─────────────────────────────────────────────────────────────
function get(userId) { return db.get('premium', userId, null); }

function isActive(userId) {
  const p = get(userId);
  if (!p || !p.active) return false;
  if (p.expiresAt && Date.now() > p.expiresAt) {
    db.set('premium', userId, { ...p, active: false, expiredAt: Date.now() });
    _addHistory(userId, 'expired', p.plan, 'system');
    return false;
  }
  return true;
}

function _getPlanTier(planKey) {
  return PLANS[planKey]?.tier ?? LEGACY_TIER[planKey] ?? 0;
}

function hasPlan(userId, minPlan) {
  if (!isActive(userId)) return false;
  const p        = get(userId);
  const userTier = _getPlanTier(p.plan);
  const minTier  = _getPlanTier(minPlan);
  return userTier >= minTier;
}

function isActiveFull(userId, guildId) {
  if (isActive(userId)) return true;
  if (guildId) {
    const sp = getServerPremium(guildId);
    if (sp) return true;
  }
  return false;
}

function getEffectiveTier(userId, guildId) {
  if (isActive(userId)) return _getPlanTier(get(userId).plan);
  if (guildId) {
    const sp = getServerPremium(guildId);
    if (sp) return _getPlanTier(sp.plan);
  }
  return 0;
}

function grant(userId, plan, days, grantedBy) {
  if (isBlacklisted(userId)) throw new Error(`User ${userId} is premium-blacklisted`);
  const now = Date.now();
  const exp = (plan === 'eternal' || days === 0) ? null : now + days * 86400000;
  const data = { plan, active: true, grantedBy, grantedAt: now, expiresAt: exp, days };
  db.set('premium', userId, data);
  _addHistory(userId, 'granted', plan, grantedBy, { days });
  return data;
}

function extend(userId, extraDays, grantedBy) {
  const p = get(userId);
  if (!p) return null;
  const base   = (p.expiresAt && p.expiresAt > Date.now()) ? p.expiresAt : Date.now();
  const newExp = base + extraDays * 86400000;
  const updated = { ...p, expiresAt: newExp, active: true };
  db.set('premium', userId, updated);
  _addHistory(userId, 'extended', p.plan, grantedBy, { extraDays });
  return updated;
}

function revoke(userId, revokedBy = 'system') {
  const p = get(userId);
  if (!p) return false;
  db.set('premium', userId, { ...p, active: false, revokedAt: Date.now(), revokedBy });
  _addHistory(userId, 'revoked', p.plan, revokedBy);
  return true;
}

function forceExpire(userId, expiredBy) {
  const p = get(userId);
  if (!p || !p.active) return false;
  db.set('premium', userId, { ...p, active: false, expiredAt: Date.now(), expiredBy, forceExpired: true });
  _addHistory(userId, 'force_expired', p.plan, expiredBy);
  return true;
}

function giveAll(userIds, plan, days, grantedBy) {
  const results = [];
  for (const userId of userIds) {
    try {
      grant(userId, plan, days, grantedBy);
      results.push({ userId, ok: true });
    } catch (e) {
      results.push({ userId, ok: false, error: e.message });
    }
  }
  return results;
}

function list() {
  return Object.entries(db.all('premium'))
    .filter(([, v]) => v?.active)
    .map(([id, v]) => ({ userId: id, ...v }));
}

function planInfo(planKey) { return PLANS[planKey] || null; }
function allPlans()        { return PLANS; }
function mainPlans()       { return { normal: PLANS.normal, pro: PLANS.pro, max: PLANS.max }; }

// ── Server premium ────────────────────────────────────────────────────────────
function grantServer(guildId, plan, days, grantedBy) {
  const now = Date.now();
  const exp = days === 0 ? null : now + days * 86400000;
  const data = { plan, active: true, grantedBy, grantedAt: now, expiresAt: exp, guildId };
  db.set('premium_servers', guildId, data);
  return data;
}

function getServerPremium(guildId) {
  const p = db.get('premium_servers', guildId);
  if (!p || !p.active) return null;
  if (p.expiresAt && Date.now() > p.expiresAt) {
    db.set('premium_servers', guildId, { ...p, active: false });
    return null;
  }
  return p;
}

function revokeServer(guildId) {
  const p = db.get('premium_servers', guildId);
  if (!p) return false;
  db.set('premium_servers', guildId, { ...p, active: false, revokedAt: Date.now() });
  return true;
}

function listServers() {
  return Object.entries(db.all('premium_servers') || {})
    .filter(([, v]) => v?.active && (!v.expiresAt || Date.now() < v.expiresAt))
    .map(([id, v]) => ({ guildId: id, ...v }));
}

// ── Premium blacklist ────────────────────────────────────────────────────────
function blacklistAdd(userId, reason, addedBy) {
  const bl = db.get('premium_blacklist', 'users') || {};
  bl[userId] = { userId, reason, addedBy, ts: Date.now() };
  db.set('premium_blacklist', 'users', bl);
}

function blacklistRemove(userId) {
  const bl = db.get('premium_blacklist', 'users') || {};
  if (!bl[userId]) return false;
  delete bl[userId];
  db.set('premium_blacklist', 'users', bl);
  return true;
}

function isBlacklisted(userId) {
  const bl = db.get('premium_blacklist', 'users') || {};
  return !!bl[userId];
}

function listBlacklist() {
  return Object.values(db.get('premium_blacklist', 'users') || {});
}

// ── Redeemable codes ─────────────────────────────────────────────────────────
function generateCode(plan, days, createdBy, uses = 1) {
  const code  = `${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const codes = db.get('premium_codes', 'all') || {};
  codes[code]  = { code, plan, days, createdBy, createdAt: Date.now(), uses, usedCount: 0, usedBy: [] };
  db.set('premium_codes', 'all', codes);
  return code;
}

function redeemCode(code, userId) {
  if (isBlacklisted(userId)) return { ok: false, reason: 'No tienes acceso al sistema premium.' };
  const codes = db.get('premium_codes', 'all') || {};
  const c     = codes[code?.toUpperCase?.()];
  if (!c)                        return { ok: false, reason: 'Código no encontrado.' };
  if (c.usedCount >= c.uses)     return { ok: false, reason: 'Código ya fue usado al máximo.' };
  if (c.usedBy.includes(userId)) return { ok: false, reason: 'Ya usaste este código.' };
  c.usedCount++;
  c.usedBy.push(userId);
  codes[code.toUpperCase()] = c;
  db.set('premium_codes', 'all', codes);
  grant(userId, c.plan, c.days, 'code_redeem');
  _addHistory(userId, 'redeemed_code', c.plan, userId, { code, days: c.days });
  return { ok: true, plan: c.plan, days: c.days };
}

function listCodes() { return Object.values(db.get('premium_codes', 'all') || {}); }

function deleteCode(code) {
  const codes = db.get('premium_codes', 'all') || {};
  if (!codes[code?.toUpperCase?.()]) return false;
  delete codes[code.toUpperCase()];
  db.set('premium_codes', 'all', codes);
  return true;
}

// ── Coupon (discount) system ─────────────────────────────────────────────────
function createCoupon(code, discount, type, createdBy, maxUses = 0, expiresDays = 0) {
  const coupons  = db.get('premium_coupons', 'all') || {};
  const expires  = expiresDays > 0 ? Date.now() + expiresDays * 86400000 : null;
  coupons[code.toUpperCase()] = {
    code: code.toUpperCase(), discount, type, createdBy,
    createdAt: Date.now(), expires, maxUses, uses: 0, active: true,
  };
  db.set('premium_coupons', 'all', coupons);
  return code.toUpperCase();
}

function getCoupon(code) {
  const coupons = db.get('premium_coupons', 'all') || {};
  const c       = coupons[code?.toUpperCase?.()];
  if (!c || !c.active) return null;
  if (c.expires && Date.now() > c.expires) return null;
  if (c.maxUses > 0 && c.uses >= c.maxUses) return null;
  return c;
}

function useCoupon(code, userId) {
  const coupons = db.get('premium_coupons', 'all') || {};
  const c       = coupons[code?.toUpperCase?.()];
  if (!c) return false;
  c.uses++;
  c.lastUsedBy = userId;
  c.lastUsedAt = Date.now();
  coupons[code.toUpperCase()] = c;
  db.set('premium_coupons', 'all', coupons);
  return true;
}

function deleteCoupon(code) {
  const coupons = db.get('premium_coupons', 'all') || {};
  if (!coupons[code?.toUpperCase?.()]) return false;
  delete coupons[code.toUpperCase()];
  db.set('premium_coupons', 'all', coupons);
  return true;
}

function listCoupons() { return Object.values(db.get('premium_coupons', 'all') || {}); }

// ── Purchase requests ────────────────────────────────────────────────────────
function createRequest(userId, userTag, plan, note = '') {
  const requests = db.get('premium_requests', 'all') || {};
  const id       = `req_${Date.now()}_${userId.slice(-4)}`;
  requests[id]   = { id, userId, userTag, plan, note, status: 'pending', createdAt: Date.now() };
  db.set('premium_requests', 'all', requests);
  return id;
}

function listRequests(status = null) {
  const all = Object.values(db.get('premium_requests', 'all') || {})
    .sort((a, b) => b.createdAt - a.createdAt);
  return status ? all.filter(r => r.status === status) : all;
}

function resolveRequest(id, status, resolvedBy, note = '') {
  const requests = db.get('premium_requests', 'all') || {};
  if (!requests[id]) return false;
  requests[id] = { ...requests[id], status, resolvedBy, resolvedAt: Date.now(), resolveNote: note };
  db.set('premium_requests', 'all', requests);
  return requests[id];
}

// ── History / logs ────────────────────────────────────────────────────────────
function _addHistory(userId, action, plan, byUserId, extra = {}) {
  const history = db.get('premium_history', 'log') || [];
  history.push({ userId, action, plan, byUserId, ...extra, ts: Date.now() });
  if (history.length > 3000) history.splice(0, history.length - 3000);
  db.set('premium_history', 'log', history);
}

function getHistory(userId = null, limit = 50) {
  const all      = db.get('premium_history', 'log') || [];
  const filtered = userId ? all.filter(h => h.userId === userId || h.byUserId === userId) : all;
  return filtered.slice(-Math.min(limit, 100)).reverse();
}

// ── Reload (flush cached store URL) ──────────────────────────────────────────
function reload() {
  // No in-memory state to flush — db reads are always fresh
  return { ok: true, plans: Object.keys(PLANS), storeUrl: getStoreUrl() };
}

module.exports = {
  PLANS, PLAN_ORDER, LEGACY_TIER,
  get, isActive, isActiveFull, hasPlan, getEffectiveTier,
  grant, extend, revoke, forceExpire, giveAll, list,
  grantServer, getServerPremium, revokeServer, listServers,
  planInfo, allPlans, mainPlans,
  blacklistAdd, blacklistRemove, isBlacklisted, listBlacklist,
  generateCode, redeemCode, listCodes, deleteCode,
  createCoupon, getCoupon, useCoupon, deleteCoupon, listCoupons,
  createRequest, listRequests, resolveRequest,
  getHistory, getStoreUrl, setStoreUrl, reload,
};
