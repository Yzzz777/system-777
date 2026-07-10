const logger = require('../systems/logger');

module.exports = {
  name: 'channelCreate',
  async execute(channel, client) {
    if (!channel.guild) return;
    await logger.logChannelCreate(channel.guild, channel);
  }
};
