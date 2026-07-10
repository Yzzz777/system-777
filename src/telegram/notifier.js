'use strict';

let _bot = null;
const _alertChats = new Set();

module.exports = {
  init(bot) { _bot = bot; },

  addAlertChat(chatId) { _alertChats.add(Number(chatId)); },
  removeAlertChat(chatId) { _alertChats.delete(Number(chatId)); },
  getAlertChats() { return [..._alertChats]; },
  hasAlertChat(chatId) { return _alertChats.has(Number(chatId)); },

  async send(chatId, text, opts = {}) {
    if (!_bot) return false;
    try {
      await _bot.sendMessage(Number(chatId), text, { parse_mode: 'HTML', ...opts });
      return true;
    } catch { return false; }
  },

  async alert(text, opts = {}) {
    if (!_bot || !_alertChats.size) return 0;
    let sent = 0;
    for (const id of _alertChats) {
      try { await _bot.sendMessage(id, text, { parse_mode: 'HTML', ...opts }); sent++; } catch {}
    }
    return sent;
  },
};
