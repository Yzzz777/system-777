const db     = require('../utils/db');
const crypto = require('crypto');

const RANKS = {
  owner:           { level: 0, label: 'Owner',           icon: '👑', color: 0xFFD700 },
  co_owner:        { level: 1, label: 'Co-Owner',        icon: '💠', color: 0xFF8C00 },
  developer:       { level: 2, label: 'Developer',       icon: '⚙️', color: 0x9B59B6 },
  admin:           { level: 3, label: 'Admin',           icon: '🛡️', color: 0xE74C3C },
  moderator:       { level: 4, label: 'Moderator',       icon: '🔨', color: 0x3498DB },
  support:         { level: 5, label: 'Support',         icon: '💬', color: 0x2ECC71 },
  premium_manager: { level: 6, label: 'Premium Manager', icon: '💎', color: 0xF1C40F },
  ticket_staff:    { level: 7, label: 'Ticket Staff',    icon: '🎫', color: 0x1ABC9C },
  trial_staff:     { level: 8, label: 'Trial Staff',     icon: '🔰', color: 0x95A5A6 },
};

// minLevel required to perform action (lower level = more access)
const PERMISSIONS = {
  manage_bot:       0,
  manage_staff:     1,
  manage_premium:   1,   // also premium_manager (special case)
  view_analytics:   3,
  manage_guilds:    3,
  manage_automod:   4,
  manage_tickets:   7,   // also ticket_staff / support (special case)
  view_dashboard:   8,
  manage_blacklist: 1,
  manage_security:  3,
};

function getStaff()      { return db.get('bot_staff', 'members') || {}; }
function saveStaff(d)    { db.set('bot_staff', 'members', d); }
function getMember(uid)  { return getStaff()[uid] || null; }

function addMember(userId, rank, addedBy, note = '') {
  if (!RANKS[rank]) throw new Error(`Rango '${rank}' inválido`);
  const staff = getStaff();
  staff[userId] = { userId, rank, addedBy, addedAt: Date.now(), note, active: true, actions: 0, lastSeen: null };
  saveStaff(staff);
  _log('add_staff', addedBy, { target: userId, rank });
  return staff[userId];
}

function removeMember(userId, removedBy, reason = '') {
  const staff = getStaff();
  if (!staff[userId]) return false;
  const prev = { ...staff[userId] };
  delete staff[userId];
  saveStaff(staff);
  _log('remove_staff', removedBy, { target: userId, prevRank: prev.rank, reason });
  return true;
}

function setRank(userId, newRank, changedBy) {
  if (!RANKS[newRank]) throw new Error(`Rango '${newRank}' inválido`);
  const staff = getStaff();
  if (!staff[userId]) return false;
  const oldRank = staff[userId].rank;
  staff[userId].rank      = newRank;
  staff[userId].updatedAt = Date.now();
  saveStaff(staff);
  _log('change_rank', changedBy, { target: userId, oldRank, newRank });
  return true;
}

function listStaff() {
  return Object.values(getStaff())
    .sort((a, b) => (RANKS[a.rank]?.level ?? 99) - (RANKS[b.rank]?.level ?? 99));
}

function hasPermission(userId, ownerId, permission) {
  if (userId === ownerId) return true;
  const member = getMember(userId);
  if (!member) return false;
  const rank   = member.rank;
  const level  = RANKS[rank]?.level ?? 99;
  const minLvl = PERMISSIONS[permission] ?? 0;
  if (permission === 'manage_premium'  && rank === 'premium_manager') return true;
  if (permission === 'manage_tickets'  && ['ticket_staff', 'support'].includes(rank)) return true;
  return level <= minLvl;
}

function getRankInfo(userId, ownerId) {
  if (userId === ownerId) return RANKS.owner;
  const m = getMember(userId);
  return m ? (RANKS[m.rank] || null) : null;
}

function recordActivity(userId) {
  const staff = getStaff();
  if (!staff[userId]) return;
  staff[userId].actions  = (staff[userId].actions || 0) + 1;
  staff[userId].lastSeen = Date.now();
  saveStaff(staff);
}

// ── Audit log ────────────────────────────────────────────────────────────────
function _log(action, byUserId, details = {}) {
  const logs = db.get('bot_staff', 'audit_log') || [];
  logs.push({ action, byUserId, details, ts: Date.now() });
  if (logs.length > 1000) logs.splice(0, logs.length - 1000);
  db.set('bot_staff', 'audit_log', logs);
}

function getAuditLog(limit = 50) {
  const logs = db.get('bot_staff', 'audit_log') || [];
  return logs.slice(-Math.min(limit, 100)).reverse();
}

// ── Task system ──────────────────────────────────────────────────────────────
function addTask(assignedTo, taskText, assignedBy) {
  const tasks = db.get('bot_staff', 'tasks') || [];
  const task  = { id: Date.now(), assignedTo, task: taskText, assignedBy, status: 'pending', createdAt: Date.now() };
  tasks.push(task);
  db.set('bot_staff', 'tasks', tasks);
  return task;
}

function getTasksFor(userId) {
  const tasks = db.get('bot_staff', 'tasks') || [];
  return userId ? tasks.filter(t => t.assignedTo === userId) : tasks;
}

function completeTask(taskId, userId) {
  const tasks = db.get('bot_staff', 'tasks') || [];
  const t     = tasks.find(t => t.id === taskId);
  if (!t) return false;
  t.status      = 'completed';
  t.completedAt = Date.now();
  t.completedBy = userId;
  db.set('bot_staff', 'tasks', tasks);
  return true;
}

module.exports = {
  RANKS, PERMISSIONS,
  getMember, addMember, removeMember, setRank, listStaff,
  hasPermission, getRankInfo, recordActivity,
  getAuditLog, addTask, getTasksFor, completeTask,
};
