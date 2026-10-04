const logger = require('../systems/logger');

module.exports = {
  name: 'channelUpdate',
  async execute(oldChannel, newChannel, client) {
    if (!oldChannel.guild) return;
    await logger.logChannelUpdate(oldChannel.guild, oldChannel, newChannel);
  }
};
