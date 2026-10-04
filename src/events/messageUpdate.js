const logger = require('../systems/logger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMsg, newMsg, client) {
    try {
      if (!newMsg.guild || newMsg.author?.bot) return;
      if (oldMsg.content === newMsg.content) return;
      await logger.logEdit(newMsg.guild, oldMsg, newMsg);
    } catch (error) {
      console.error('[EVENT ERROR] messageUpdate:', error);
    }
  }
};
