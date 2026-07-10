const db = require('../utils/db');

function addResponse(guildId, keyword, response, exactMatch = false) {
  db.set('auto_responses', `${guildId}_${keyword.toLowerCase()}`, {
    keyword: keyword.toLowerCase(), response, exactMatch, enabled: true, ts: Date.now(),
  });
}

function removeResponse(guildId, keyword) {
  db.del('auto_responses', `${guildId}_${keyword.toLowerCase()}`);
}

function listResponses(guildId) {
  const all = db.all('auto_responses');
  const prefix = `${guildId}_`;
  return Object.values(all).filter((_, i) => Object.keys(all)[i].startsWith(prefix));
}

function checkMessage(guildId, content) {
  if (!guildId || !content) return null;
  const all = db.all('auto_responses');
  const prefix = `${guildId}_`;
  const lower = content.toLowerCase();
  for (const [key, resp] of Object.entries(all)) {
    if (!key.startsWith(prefix)) continue;
    if (!resp.enabled) continue;
    if (resp.exactMatch ? lower === resp.keyword : lower.includes(resp.keyword)) {
      return resp;
    }
  }
  return null;
}

module.exports = { addResponse, removeResponse, listResponses, checkMessage };
