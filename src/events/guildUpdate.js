const logger = require('../systems/logger');

module.exports = {
  name: 'guildUpdate',
  async execute(oldGuild, newGuild, client) {
    await logger.logGuildUpdate(oldGuild, newGuild);
  }
};
