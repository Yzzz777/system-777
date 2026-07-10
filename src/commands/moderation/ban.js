const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const sysLogger = require('../../systems/logger');
const db        = require('../../utils/db');
const logger    = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un usuario del servidor (por mención o ID)')
    .addUserOption(o => o.setName('usuario').setDescription('Menciona al usuario (si está en el servidor)'))
    .addStringOption(o => o.setName('id').setDescription('ID del usuario (para banear sin que esté en el servidor)'))
    .addStringOption(o => o.setName('razon').setDescription('Razón del ban'))
    .addIntegerOption(o => o.setName('dias').setDescription('Días de mensajes a eliminar (0-7)').setMinValue(0).setMaxValue(7))
    .addBooleanOption(o => o.setName('global').setDescription('[OWNER] Propagar el ban a todos los servidores permanentemente'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  userPermissions: [PermissionFlagsBits.BanMembers],

  async execute(interaction) {
    const targetUser = interaction.options.getUser('usuario');
    const targetId   = interaction.options.getString('id');
    const reason     = interaction.options.getString('razon') || 'Sin razón especificada';
    const dias       = interaction.options.getInteger('dias') ?? 0;
    const makeGlobal = interaction.options.getBoolean('global') ?? false;

    if (!targetUser && !targetId) {
      return interaction.reply({ content: '❌ Debes mencionar un usuario o proporcionar su ID.', flags: MessageFlags.Ephemeral });
    }

    // Only owner can use global option
    if (makeGlobal && interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '⛔ Solo el owner puede hacer bans globales. Usa `/globalban add` para eso.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    let user;
    try {
      user = targetUser ?? await interaction.client.users.fetch(targetId);
    } catch {
      return interaction.editReply({ content: '❌ No encontré ese usuario. Verifica la ID.' });
    }

    if (user.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ No puedes banearte a ti mismo.' });
    }

    // Ban in current server
    try {
      await interaction.guild.bans.create(user.id, {
        reason: `${reason} | Moderador: ${interaction.user.tag}${makeGlobal ? ' | GLOBAL' : ''}`,
        deleteMessageSeconds: dias * 86400,
      });
    } catch (e) {
      return interaction.editReply({ content: `❌ No pude banear: ${e.message}` });
    }

    let globalCount = 0;

    // If global: propagate to all servers + store in globalbans
    if (makeGlobal) {
      const gbans = db.get('globalbans', 'users', {});
      gbans[user.id] = { reason, bannedBy: interaction.user.id, ts: Date.now(), permanent: true };
      db.set('globalbans', 'users', gbans);

      const bl = db.get('blacklist', 'users', {});
      if (!bl[user.id]) { bl[user.id] = { reason: 'Global Ban', ts: Date.now() }; db.set('blacklist', 'users', bl); }

      for (const guild of interaction.client.guilds.cache.values()) {
        if (guild.id === interaction.guild.id) continue;
        try {
          await guild.bans.create(user.id, { reason: `System 777 Global Ban (permanente): ${reason} | ${interaction.user.tag}` });
          globalCount++;
        } catch {}
      }
      logger.warn(`GlobalBan via /ban aplicado a ${user.id} en ${globalCount} servidores extra. Razón: ${reason}`);
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle(makeGlobal ? '⛔ Usuario Baneado Globalmente' : '🔨 Usuario Baneado')
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: 'Usuario',           value: `${user.tag} \`(${user.id})\``,                  inline: true },
        { name: 'Moderador',         value: `${interaction.user.tag}`,                         inline: true },
        { name: 'Razón',             value: reason },
        { name: 'Mensajes borrados', value: `${dias} días`,                                    inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'System 777 · Developer 777' });

    if (makeGlobal) {
      embed.addFields({ name: '🌐 Ban Global', value: `Propagado a **${globalCount + 1}** servidores.\nBan permanente — solo owner puede revertirlo.` });
    }

    await interaction.editReply({ embeds: [embed] });
    await sysLogger.logBan(interaction.guild, user, interaction.user, reason);
  }
};
