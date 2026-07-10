const logger = require('../systems/logger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMsg, newMsg, client) {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    await logger.logEdit(newMsg.guild, oldMsg, newMsg);
  }
};
