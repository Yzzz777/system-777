const antiNuke = require('../systems/antiNuke');
const logger   = require('../systems/logger');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    try {
      if (!role.guild) return;
      await logger.logRoleDelete(role.guild, role);
      await antiNuke.onRoleDelete(role.guild, role, client);
    } catch (error) {
      console.error('[EVENT ERROR] roleDelete:', error);
    }
  }
};
