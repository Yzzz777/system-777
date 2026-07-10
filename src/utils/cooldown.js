const cooldowns = new Map();

function check(userId, command, ms) {
  const key = `${userId}:${command}`;
  const now = Date.now();
  const exp = cooldowns.get(key);
  if (exp && now < exp) return { ok: false, remaining: Math.ceil((exp - now) / 1000) };
  cooldowns.set(key, now + ms);
  setTimeout(() => cooldowns.delete(key), ms + 500);
  return { ok: true };
}

function reset(userId, command) {
  cooldowns.delete(`${userId}:${command}`);
}

function resetUser(userId) {
  for (const k of cooldowns.keys()) if (k.startsWith(`${userId}:`)) cooldowns.delete(k);
}

module.exports = { check, reset, resetUser };
