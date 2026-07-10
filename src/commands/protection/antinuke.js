const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('💣 Sistema Anti-Nuke — protege el servidor de ataques internos')
    .addSubcommand(s => s
      .setName('enable')
      .setDescription('✅ Activar Anti-Nuke')
      .addIntegerOption(o => o.setName('bans').setDescription('Bans seguidos antes de actuar (default: 3)').setMinValue(2).setMaxValue(10))
      .addIntegerOption(o => o.setName('canales').setDescription('Canales borrados antes de actuar (default: 2)').setMinValue(1).setMaxValue(5))
      .addIntegerOption(o => o.setName('roles').setDescription('Roles borrados antes de actuar (default: 2)').setMinValue(1).setMaxValue(5)))
    .addSubcommand(s => s.setName('disable').setDescription('❌ Desactivar Anti-Nuke'))
    .addSubcommand(s => s.setName('status').setDescription('📊 Estado del Anti-Nuke'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  userPermissions: [PermissionFlagsBits.Administrator],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const cfg = db.get('guilds', interaction.guild.id, {});

    if (sub === 'enable') {
      cfg.antinuke        = true;
      cfg.nukebanLimit    = interaction.options.getInteger('bans')    ?? 3;
      cfg.nukechannelLimit = interaction.options.getInteger('canales') ?? 2;
      cfg.nukeroleLimit   = interaction.options.getInteger('roles')   ?? 2;
      db.set('guilds', interaction.guild.id, cfg);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('🛡️ Anti-Nuke ACTIVADO')
          .setDescription('El servidor está protegido. Si alguien intenta hacer nuke, System 777 revocará sus permisos y los pondrá en timeout.')
          .addFields(
            { name: '🔨 Límite bans',    value: `${cfg.nukebanLimit} seguidos`,    inline: true },
            { name: '📢 Límite canales', value: `${cfg.nukechannelLimit} borrados`, inline: true },
            { name: '🎭 Límite roles',   value: `${cfg.nukeroleLimit} borrados`,   inline: true },
            { name: '⏱️ Ventana',        value: '15 segundos',                     inline: true },
            { name: '⚡ Respuesta',      value: 'Roles peligrosos removidos + Timeout 24h + Alerta al dueño', inline: false },
          )
          .setFooter({ text: 'System 777 · Anti-Nuke · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });

    } else if (sub === 'disable') {
      cfg.antinuke = false;
      db.set('guilds', interaction.guild.id, cfg);
      await interaction.reply({ content: '⚠️ Anti-Nuke **desactivado**. El servidor ya no tiene protección automática.', flags: MessageFlags.Ephemeral });

    } else if (sub === 'status') {
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(cfg.antinuke ? 0x00FF88 : 0xFF4444)
          .setTitle('💣 Estado Anti-Nuke')
          .addFields(
            { name: '🛡️ Estado',         value: cfg.antinuke ? '✅ Activo' : '❌ Inactivo',           inline: true },
            { name: '🔨 Límite bans',    value: `${cfg.nukebanLimit ?? 3}`,                           inline: true },
            { name: '📢 Límite canales', value: `${cfg.nukechannelLimit ?? 2}`,                       inline: true },
            { name: '🎭 Límite roles',   value: `${cfg.nukeroleLimit ?? 2}`,                          inline: true },
          )
          .setFooter({ text: 'System 777 · Dev: 777' })],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
