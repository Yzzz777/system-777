const db = require('../utils/db');

const DAILY_MIN = 200, DAILY_MAX = 500;
const WORK_MIN  = 50,  WORK_MAX  = 150;
const WORK_CD   = 3600000;  // 1h
const DAILY_CD  = 86400000; // 24h

function getBalance(userId) {
  return db.get('economy', userId, { coins: 0, bank: 0, lastDaily: 0, lastWork: 0 });
}

function addCoins(userId, amount) {
  const data  = getBalance(userId);
  data.coins += amount;
  db.set('economy', userId, data);
  return data;
}

function removeCoins(userId, amount) {
  const data = getBalance(userId);
  if (data.coins < amount) return null;
  data.coins -= amount;
  db.set('economy', userId, data);
  return data;
}

function transfer(fromId, toId, amount) {
  const from = getBalance(fromId);
  if (from.coins < amount) return { ok: false, reason: 'Saldo insuficiente.' };
  from.coins -= amount;
  db.set('economy', fromId, from);
  addCoins(toId, amount);
  return { ok: true };
}

function claimDaily(userId) {
  const data = getBalance(userId);
  const now  = Date.now();
  if (now - data.lastDaily < DAILY_CD) {
    const remaining = DAILY_CD - (now - data.lastDaily);
    return { ok: false, remaining };
  }
  const amount   = Math.floor(Math.random() * (DAILY_MAX - DAILY_MIN + 1)) + DAILY_MIN;
  data.coins    += amount;
  data.lastDaily = now;
  db.set('economy', userId, data);
  return { ok: true, amount, total: data.coins };
}

function claimWork(userId) {
  const data = getBalance(userId);
  const now  = Date.now();
  if (now - data.lastWork < WORK_CD) {
    const remaining = WORK_CD - (now - data.lastWork);
    return { ok: false, remaining };
  }
  const amount  = Math.floor(Math.random() * (WORK_MAX - WORK_MIN + 1)) + WORK_MIN;
  data.coins   += amount;
  data.lastWork = now;
  db.set('economy', userId, data);
  return { ok: true, amount, total: data.coins };
}

function deposit(userId, amount) {
  const data = getBalance(userId);
  if (amount > data.coins) return { ok: false, reason: 'No tienes suficientes monedas.' };
  data.coins -= amount;
  data.bank  += amount;
  db.set('economy', userId, data);
  return { ok: true, data };
}

function withdraw(userId, amount) {
  const data = getBalance(userId);
  if (amount > data.bank) return { ok: false, reason: 'No tienes suficiente en el banco.' };
  data.bank  -= amount;
  data.coins += amount;
  db.set('economy', userId, data);
  return { ok: true, data };
}

function getRichList(limit = 10) {
  const all = db.all('economy');
  return Object.entries(all)
    .map(([id, d]) => ({ userId: id, total: (d.coins || 0) + (d.bank || 0), ...d }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

module.exports = { getBalance, addCoins, removeCoins, transfer, claimDaily, claimWork, deposit, withdraw, getRichList };
