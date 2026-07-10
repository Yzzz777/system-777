const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const logger = require('../../systems/logger');

function parseDur(str) {
  const m = str.match(/^(\d+)(m|h|d)$/i);
  if (!m) return null;
  const mult = { m: 60000, h: 3600000, d: 86400000 };
  return parseInt(m[1]) * mult[m[2].toLowerCase()];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('⏱️ Ban temporal (auto-unban)')
    .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(o => o.setName('duracion').setDescription('Ej: 10m, 2h, 7d').setRequired(true))
    .addStringOption(o => o.setName('razon').setDescription('Razón'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  userPermissions: [PermissionFlagsBits.BanMembers],

  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const durStr = interaction.options.getString('duracion');
    const razon  = interaction.options.getString('razon') ?? 'Sin razón';
    const ms     = parseDur(durStr);

    if (!ms) return interaction.reply({ content: '❌ Duración inválida. Usa: `10m`, `2h`, `7d`', flags: MessageFlags.Ephemeral });
    if (ms > 30 * 86400000) return interaction.reply({ content: '❌ Máximo 30 días.', flags: MessageFlags.Ephemeral });

    const when = Math.floor((Date.now() + ms) / 1000);

    try {
      await interaction.guild.bans.create(target.id, { reason: `Tempban (${durStr}): ${razon}` });
    } catch (e) {
      return interaction.reply({ content: `❌ No pude banear: ${e.message}`, flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xFF6600)
        .setTitle('⏱️ Tempban Aplicado')
        .setThumbnail(target.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '👤 Usuario',   value: `${target.tag}\n\`${target.id}\``, inline: true },
          { name: '⏱️ Duración', value: durStr,                             inline: true },
          { name: '🔓 Unban en', value: `<t:${when}:R>`,                   inline: true },
          { name: '📝 Razón',    value: razon,                              inline: false },
        )
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
        .setTimestamp()]
    });

    await logger.logBan(interaction.guild, target, interaction.user, `Tempban (${durStr}): ${razon}`);

    // Auto-unban
    setTimeout(async () => {
      await interaction.guild.bans.remove(target.id, `Tempban expirado (${durStr})`).catch(() => {});
    }, ms);
  }
};
