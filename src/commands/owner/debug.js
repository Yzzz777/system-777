const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

let debugListener = null;

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('debug')
    .setDescription('[OWNER] Activa/desactiva modo debug y muestra info interna')
    .addSubcommand(s => s.setName('toggle').setDescription('Activar/desactivar debug mode'))
    .addSubcommand(s => s.setName('info').setDescription('Ver información interna del proceso'))
    .addSubcommand(s => s.setName('cache').setDescription('Ver estadísticas de caché del cliente')),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();

    if (sub === 'toggle') {
      const current = db.get('bot_config', 'debug') || false;
      const next = !current;
      db.set('bot_config', 'debug', next);

      if (next) {
        if (!debugListener) {
          debugListener = info => {
            if (info.includes('heartbeat') || info.includes('ACK')) return;
            console.log('[DEBUG]', info);
          };
          client.on('debug', debugListener);
        }
      } else {
        if (debugListener) {
          client.removeListener('debug', debugListener);
          debugListener = null;
        }
      }

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(next ? 0xFFFF00 : 0x888888)
        .setTitle(`🐛 Debug Mode — ${next ? 'ACTIVADO' : 'DESACTIVADO'}`)
        .setDescription(next ? 'Los eventos internos de discord.js se loggean en consola.' : 'Debug desactivado.')
        .setTimestamp()] });
    }

    if (sub === 'info') {
      const mem  = process.memoryUsage();
      const env  = process.env.NODE_ENV || 'development';
      const maintenance = db.get('bot_config', 'maintenance') || { active: false };
      const debug = db.get('bot_config', 'debug') || false;
      const bl = db.get('blacklist', 'users') || {};
      const sbl = db.get('blacklist', 'servers') || {};

      const embed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('🐛 Debug Info')
        .addFields(
          { name: '🔧 Proceso', value: `PID: \`${process.pid}\`\nNODE_ENV: \`${env}\`\nNode: \`${process.version}\`\nV8: \`${process.versions.v8}\``, inline: true },
          { name: '💾 Memoria', value: `Heap: \`${(mem.heapUsed/1024/1024).toFixed(1)}/${(mem.heapTotal/1024/1024).toFixed(1)} MB\`\nRSS: \`${(mem.rss/1024/1024).toFixed(1)} MB\`\nExternal: \`${(mem.external/1024/1024).toFixed(1)} MB\``, inline: true },
          { name: '⚙️ Bot Config', value: `Mantenimiento: \`${maintenance.active}\`\nDebug: \`${debug}\`\nBlacklist users: \`${Object.keys(bl).length}\`\nBlacklist servers: \`${Object.keys(sbl).length}\``, inline: false },
          { name: '📦 Módulos cargados', value: `require.cache: \`${Object.keys(require.cache).length} archivos\`\nComandos: \`${client.commands.size}\`\nEventos: \`${client.eventNames().length}\``, inline: false }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'cache') {
      const guilds   = client.guilds.cache.size;
      const users    = client.users.cache.size;
      const channels = client.channels.cache.size;
      const messages = client.channels.cache.reduce((a, c) => a + (c.messages?.cache?.size || 0), 0);
      const roles    = client.guilds.cache.reduce((a, g) => a + g.roles.cache.size, 0);
      const emojis   = client.emojis.cache.size;

      const embed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('📦 Cache Stats')
        .addFields(
          { name: 'Guilds', value: `\`${guilds}\``, inline: true },
          { name: 'Users', value: `\`${users}\``, inline: true },
          { name: 'Channels', value: `\`${channels}\``, inline: true },
          { name: 'Messages', value: `\`${messages}\``, inline: true },
          { name: 'Roles', value: `\`${roles}\``, inline: true },
          { name: 'Emojis', value: `\`${emojis}\``, inline: true }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
