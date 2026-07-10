const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getModLogs } = require('../../systems/logger');

const ICONS = { ban:'🔨', unban:'✅', kick:'👢', warn:'⚠️', timeout:'⏱️' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('📋 Historial de moderación')
    .addUserOption(o => o.setName('usuario').setDescription('Ver logs de un usuario específico'))
    .addIntegerOption(o => o.setName('limite').setDescription('Cantidad (default: 10, máx: 25)').setMinValue(1).setMaxValue(25))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  userPermissions: [PermissionFlagsBits.ModerateMembers],

  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const limite = interaction.options.getInteger('limite') ?? 10;

    const logs = getModLogs(interaction.guild.id, target?.id).slice(0, limite);

    if (!logs.length) {
      return interaction.reply({
        content: target ? `✅ **${target.username}** no tiene historial de moderación.` : '✅ Sin registros de moderación.',
        flags: MessageFlags.Ephemeral
      });
    }

    const lines = logs.map(l => {
      const ico  = ICONS[l.type] ?? '📋';
      const time = `<t:${Math.floor(l.ts/1000)}:R>`;
      const mod  = l.mod ? `<@${l.mod}>` : 'Sistema';
      const raz  = l.reason ? ` — ${l.reason.slice(0,50)}` : '';
      return `${ico} **${l.type.toUpperCase()}** · <@${l.userId}> · ${mod} · ${time}${raz}`;
    });

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(target ? `📋 Modlogs — ${target.username}` : '📋 Historial de Moderación')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `System 777 · ${logs.length} registros · Dev: 777` })
        .setTimestamp()],
      flags: MessageFlags.Ephemeral
    });
  }
};
