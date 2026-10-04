const antiNuke = require('../systems/antiNuke');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    try {
      if (!role.guild) return;
      await antiNuke.onRoleDelete(role.guild, role, client);
    } catch (error) {
      console.error('[EVENT ERROR] roleDelete:', error);
    }
  }
};
