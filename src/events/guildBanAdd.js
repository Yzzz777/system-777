const antiNuke = require('../systems/antiNuke');
const shield   = require('../systems/botShield');
const logger   = require('../systems/logger');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    await shield.onBanAdd(ban.guild, ban.user, client);
    await antiNuke.onBanAdd(ban.guild, ban.user, client);
  }
};
