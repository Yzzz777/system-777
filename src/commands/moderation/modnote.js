const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db      = require('../../utils/db');
const ausencia = require('../../systems/ausencia');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modnote')
    .setDescription('🗒️ Notas de moderación y sistema de ausencias del staff')

    // ── Notas de moderación ───────────────────────────────────
    .addSubcommand(s => s
      .setName('add').setDescription('Añadir nota privada sobre un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addStringOption(o => o.setName('nota').setDescription('Nota privada').setRequired(true)))
    .addSubcommand(s => s
      .setName('list').setDescription('Ver notas de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))
    .addSubcommand(s => s
      .setName('clear').setDescription('Borrar notas de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))

    // ── Sistema de ausencias ──────────────────────────────────
    .addSubcommandGroup(g => g
      .setName('ausencia').setDescription('Sistema de ausencias del staff')
      .addSubcommand(s => s
        .setName('set').setDescription('Registrar ausencia (se publica en el canal configurado)')
        .addStringOption(o => o.setName('razon').setDescription('Motivo de la ausencia').setRequired(true))
        .addStringOption(o => o.setName('tiempo').setDescription('Duración: 2h, 3d, 1w, indefinido').setRequired(false))
        .addUserOption(o => o.setName('usuario').setDescription('Miembro ausente (default: tú)').setRequired(false)))
      .addSubcommand(s => s
        .setName('cancelar').setDescription('Cancelar tu ausencia activa')
        .addUserOption(o => o.setName('usuario').setDescription('Miembro (default: tú, o mod puede cancelar de otro)').setRequired(false)))
      .addSubcommand(s => s
        .setName('lista').setDescription('Ver todas las ausencias activas del servidor'))
      .addSubcommand(s => s
        .setName('setup').setDescription('Configurar canal donde se publican las ausencias')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de ausencias').setRequired(true))))

    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  userPermissions: [PermissionFlagsBits.ModerateMembers],

  async execute(interaction) {
    const sub   = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    // ── NOTAS ────────────────────────────────────────────────
    if (!group) {
      const target = interaction.options.getUser('usuario');
      const key    = `note_${interaction.guild.id}_${target.id}`;

      if (sub === 'add') {
        const nota  = interaction.options.getString('nota');
        const notas = db.get('notes', key, []);
        notas.push({ text: nota, mod: interaction.user.id, ts: Date.now() });
        db.set('notes', key, notas);
        return interaction.reply({ content: `✅ Nota añadida a **${target.username}**. Total: ${notas.length}`, flags: MessageFlags.Ephemeral });
      }

      if (sub === 'list') {
        const notas = db.get('notes', key, []);
        if (!notas.length) return interaction.reply({ content: `✅ Sin notas para **${target.username}**.`, flags: MessageFlags.Ephemeral });
        const desc = notas.map((n, i) => `**${i + 1}.** <@${n.mod}> <t:${Math.floor(n.ts / 1000)}:R>\n> ${n.text}`).join('\n\n');
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🗒️ Notas — ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ size: 64 }))
            .setDescription(desc)
            .setFooter({ text: 'System 777 · Solo visible para mods' })],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (sub === 'clear') {
        db.set('notes', key, []);
        return interaction.reply({ content: `✅ Notas de **${target.username}** borradas.`, flags: MessageFlags.Ephemeral });
      }
    }

    // ── AUSENCIAS ────────────────────────────────────────────
    if (group === 'ausencia') {

      if (sub === 'setup') {
        const canal = interaction.options.getChannel('canal');
        ausencia.setChannel(interaction.guild.id, canal.id);
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`✅ Canal de ausencias configurado: ${canal}\nAhora las ausencias del staff se publicarán ahí automáticamente.`)
            .setFooter({ text: 'System 777 · Ausencias' })],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (sub === 'set') {
        const razon    = interaction.options.getString('razon');
        const tiempoStr = interaction.options.getString('tiempo');
        const targetUser = interaction.options.getUser('usuario') ?? interaction.user;
        const endTime  = ausencia.parseTime(tiempoStr);

        // Check if already has active absence
        const existing = ausencia.get(interaction.guild.id, targetUser.id);
        if (existing) {
          return interaction.reply({
            content: `❌ **${targetUser.username}** ya tiene una ausencia activa. Cancélala primero con \`/modnote ausencia cancelar\`.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const ausenciaChannel = ausencia.getChannel(interaction.guild.id);
        let messageId = null;

        const embed = new EmbedBuilder()
          .setColor(0xFF9900)
          .setTitle('🟡 Staff Ausente')
          .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
          .addFields(
            { name: '👤 Miembro',    value: `<@${targetUser.id}>`,                              inline: true },
            { name: '📋 Motivo',     value: razon,                                              inline: true },
            { name: '⏱️ Duración',  value: ausencia.formatRemaining(endTime),                  inline: true },
            { name: '📅 Desde',      value: `<t:${Math.floor(Date.now() / 1000)}:R>`,          inline: true },
            { name: '🔖 Registrada por', value: `<@${interaction.user.id}>`,                   inline: true },
            { name: '🔚 Regresa',    value: endTime ? `<t:${Math.floor(endTime / 1000)}:R>` : '♾️ Indefinido', inline: true },
          )
          .setFooter({ text: 'System 777 · Ausencias Staff' })
          .setTimestamp();

        // Post in ausencia channel if configured
        if (ausenciaChannel) {
          const ch = interaction.guild.channels.cache.get(ausenciaChannel);
          if (ch) {
            const msg = await ch.send({ embeds: [embed] }).catch(() => null);
            if (msg) messageId = msg.id;
          }
        }

        ausencia.set(interaction.guild.id, targetUser.id, razon, endTime, interaction.user.id, ausenciaChannel, messageId);

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF9900)
            .setTitle('✅ Ausencia Registrada')
            .setDescription(
              ausenciaChannel
                ? `La ausencia de **${targetUser.username}** fue publicada en <#${ausenciaChannel}>.`
                : `⚠️ Ausencia registrada, pero no hay canal configurado. Usa \`/modnote ausencia setup\` para configurarlo.`
            )
            .addFields(
              { name: 'Motivo',    value: razon,                                inline: true },
              { name: 'Duración',  value: ausencia.formatRemaining(endTime),    inline: true },
            )
            .setFooter({ text: 'System 777 · Ausencias' })],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (sub === 'cancelar') {
        const targetUser = interaction.options.getUser('usuario') ?? interaction.user;
        const data = ausencia.cancel(interaction.guild.id, targetUser.id);

        if (!data) {
          return interaction.reply({ content: `❌ **${targetUser.username}** no tiene ausencia activa.`, flags: MessageFlags.Ephemeral });
        }

        // Update the channel post if it exists
        if (data.channelId && data.messageId) {
          const ch = interaction.guild.channels.cache.get(data.channelId);
          if (ch) {
            ch.messages.fetch(data.messageId).then(msg => {
              const updated = EmbedBuilder.from(msg.embeds[0])
                .setColor(0x57F287)
                .setTitle('🟢 Staff de Regreso')
                .addFields({ name: '✅ Regresó', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true });
              msg.edit({ embeds: [updated] }).catch(() => {});
            }).catch(() => {});
          }
        }

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`✅ Ausencia de **${targetUser.username}** cancelada. ¡Bienvenido de vuelta!`)
            .setFooter({ text: 'System 777 · Ausencias' })],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (sub === 'lista') {
        const activas = ausencia.listGuild(interaction.guild.id);
        if (!activas.length) {
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor(0x57F287)
              .setDescription('✅ No hay ausencias activas en el servidor actualmente.')
              .setFooter({ text: 'System 777 · Ausencias' })],
            flags: MessageFlags.Ephemeral,
          });
        }

        const lines = activas.map(a =>
          `• <@${a.userId}> — **${a.reason}** · ${ausencia.formatRemaining(a.endTime)} · <t:${Math.floor(a.startTime / 1000)}:R>`
        );

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF9900)
            .setTitle(`🟡 Ausencias Activas (${activas.length})`)
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'System 777 · Ausencias Staff' })
            .setTimestamp()],
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
};
