/**
 * reputation.js — Trust score & risk analysis system
 * Score 0-100: 0-30 HIGH RISK, 31-60 MODERATE, 61-80 TRUSTED, 81-100 HIGHLY TRUSTED
 */

const db = require('../utils/db');

const BADGES = {
  100: { icon: '👑', label: 'Elite' },
  81:  { icon: '✅', label: 'Trusted' },
  61:  { icon: '🔵', label: 'Regular' },
  31:  { icon: '🟡', label: 'Moderate Risk' },
  0:   { icon: '🔴', label: 'High Risk' },
};

function getBadge(score) {
  for (const [min, badge] of Object.entries(BADGES).sort((a, b) => b[0] - a[0])) {
    if (score >= Number(min)) return badge;
  }
  return BADGES[0];
}

/**
 * Calculate trust score for a user in a guild context.
 * Returns { score, badge, breakdown, riskFactors }
 */
function calcTrustScore(userId, guildId, user) {
  let score       = 60; // baseline
  const breakdown = [];
  const risks     = [];

  // ── Account age ─────────────────────────────────────────────────────────
  if (user?.createdTimestamp) {
    const ageDays = (Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24);
    if      (ageDays >= 365 * 2) { score += 15; breakdown.push('+15 cuenta >2 años'); }
    else if (ageDays >= 365)     { score += 10; breakdown.push('+10 cuenta >1 año'); }
    else if (ageDays >= 90)      { score += 5;  breakdown.push('+5 cuenta >90d'); }
    else if (ageDays >= 30)      { score += 0;  breakdown.push('±0 cuenta >30d'); }
    else if (ageDays >= 7)       { score -= 10; breakdown.push('-10 cuenta <30d'); risks.push(`Cuenta nueva (${ageDays.toFixed(0)}d)`); }
    else                         { score -= 25; breakdown.push('-25 cuenta <7d');  risks.push(`Cuenta muy nueva (${ageDays.toFixed(1)}d)`); }
  }

  // ── Warns ────────────────────────────────────────────────────────────────
  const warns = db.get('warns', guildId) || {};
  const warnCount = (warns[userId] || []).length;
  if      (warnCount === 0) { score += 5;  breakdown.push('+5 sin warns'); }
  else if (warnCount <= 2)  { score -= 5;  breakdown.push(`-5 ${warnCount} warns`); risks.push(`${warnCount} avisos`); }
  else if (warnCount <= 5)  { score -= 15; breakdown.push(`-15 ${warnCount} warns`); risks.push(`${warnCount} avisos (alto)`); }
  else                      { score -= 25; breakdown.push(`-25 ${warnCount} warns`); risks.push(`${warnCount} avisos (crítico)`); }

  // ── Security flags ───────────────────────────────────────────────────────
  const secFlags = (db.get('security_flags', guildId) || {})[userId];
  const flagScore = secFlags?.score || 0;
  if      (flagScore === 0) { score += 5;  breakdown.push('+5 sin flags'); }
  else if (flagScore <= 2)  { score -= 10; breakdown.push(`-10 ${flagScore} flags`); risks.push(`${flagScore} alertas de seguridad`); }
  else if (flagScore <= 5)  { score -= 20; breakdown.push(`-20 ${flagScore} flags`); risks.push(`${flagScore} flags de seguridad (alto)`); }
  else                      { score -= 35; breakdown.push(`-35 ${flagScore} flags`); risks.push(`${flagScore} flags críticos`); }

  // ── Blacklist ────────────────────────────────────────────────────────────
  const bl = (db.get('blacklist', 'users') || {})[userId];
  if (bl) { score -= 50; risks.push('En blacklist global'); }

  // ── Premium ──────────────────────────────────────────────────────────────
  const premium = db.get('premium', userId);
  if (premium?.active) { score += 10; breakdown.push('+10 usuario premium'); }

  // ── Activity (economy/levels) ────────────────────────────────────────────
  const eco = db.get('economy', `${guildId}_${userId}`) || db.get('economy', userId) || {};
  if ((eco.coins || 0) + (eco.bank || 0) > 1000) { score += 3; breakdown.push('+3 economía activa'); }

  // ── Clamp 0-100 ─────────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  return { score, badge: getBadge(score), breakdown, riskFactors: risks };
}

/**
 * Get server health score based on member composition.
 */
function calcServerHealth(guild, guildId) {
  const total    = guild.memberCount;
  const bots     = guild.members.cache.filter(m => m.user.bot).size;
  const botRatio = bots / total;
  const flags    = db.get('security_flags', guildId) || {};
  const flagged  = Object.keys(flags).length;
  const alts     = (db.get('security_alts', guildId) || []).length;
  const warns    = db.get('warns', guildId) || {};
  const warnTotal = Object.values(warns).reduce((a, w) => a + w.length, 0);

  let score      = 80;
  const issues   = [];

  if (botRatio > 0.3) { score -= 20; issues.push(`Alta ratio de bots (${(botRatio * 100).toFixed(0)}%)`); }
  if (flagged > 10)   { score -= 15; issues.push(`${flagged} usuarios flaggeados`); }
  if (alts > 5)       { score -= 10; issues.push(`${alts} posibles alts detectadas`); }
  if (warnTotal > 20) { score -= 10; issues.push(`${warnTotal} warns totales`); }

  score = Math.max(0, Math.min(100, score));

  const bl = db.get('blacklist', 'servers') || {};
  const blacklisted = !!bl[guild.id];
  if (blacklisted) { score = 0; issues.push('Servidor en blacklist global'); }

  return { score, badge: getBadge(score), issues, stats: { total, bots, botRatio: (botRatio * 100).toFixed(1), flagged, alts, warnTotal } };
}

/**
 * Generate a full security report text for a user.
 */
function generateReport(userId, guildId, user) {
  const trust = calcTrustScore(userId, guildId, user);
  const warns = (db.get('warns', guildId) || {})[userId] || [];
  const flags = (db.get('security_flags', guildId) || {})[userId] || { flags: [], score: 0 };
  const modlogs = (db.get('modlogs', guildId) || {})[userId] || [];
  const ageDays = user ? ((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24)).toFixed(1) : 'N/A';

  return {
    trust,
    summary: {
      ageDays,
      warns:    warns.length,
      modActions: modlogs.length,
      secFlags: flags.score,
      recentFlags: flags.flags.slice(0, 5),
      recentWarns: warns.slice(-3)
    }
  };
}

module.exports = { calcTrustScore, calcServerHealth, generateReport, getBadge };
