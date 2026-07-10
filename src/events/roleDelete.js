const antiNuke = require('../systems/antiNuke');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    if (!role.guild) return;
    await antiNuke.onRoleDelete(role.guild, role, client);
  }
};
