const {
  SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const db = require('../../utils/db');
const { buildEmbed, buildRow, scheduleGiveaway, pickWinners } = require('../../systems/giveaway');

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  const u = match[2].toLowerCase();
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const ms = n * mult[u];
  if (ms < 10000 || ms > 30 * 86400000) return null; // mín 10s, máx 30d
  return ms;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('🎉 Sistema de sorteos')

    .addSubcommand(s => s
      .setName('start')
      .setDescription('🎉 Inicia un sorteo')
      .addStringOption(o => o.setName('duracion').setDescription('Ej: 10m, 2h, 1d').setRequired(true))
      .addStringOption(o => o.setName('premio').setDescription('¿Qué se sortea?').setRequired(true))
      .addIntegerOption(o => o.setName('ganadores').setDescription('Nº de ganadores').setRequired(true).setMinValue(1).setMaxValue(20))
      .addChannelOption(o => o.setName('canal').setDescription('Canal del sorteo (default: este)'))
      .addRoleOption(o => o.setName('rol_requerido').setDescription('Rol necesario para participar'))
      .addIntegerOption(o => o.setName('nivel_min').setDescription('Nivel mínimo para participar').setMinValue(1))
    )

    .addSubcommand(s => s
      .setName('end')
      .setDescription('⏹️ Termina un sorteo ahora')
      .addStringOption(o => o.setName('mensaje_id').setDescription('ID del mensaje del sorteo').setRequired(true))
    )

    .addSubcommand(s => s
      .setName('reroll')
      .setDescription('🔁 Elige nuevos ganadores')
      .addStringOption(o => o.setName('mensaje_id').setDescription('ID del mensaje del sorteo').setRequired(true))
    )

    .addSubcommand(s => s
      .setName('list')
      .setDescription('📋 Lista los sorteos activos')
    )

    .addSubcommand(s => s
      .setName('cancel')
      .setDescription('❌ Cancela un sorteo sin ganador')
      .addStringOption(o => o.setName('mensaje_id').setDescription('ID del mensaje del sorteo').setRequired(true))
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  userPermissions: [PermissionFlagsBits.ManageGuild],

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // ── START ──────────────────────────────────────────────────────
    if (sub === 'start') {
      const durStr   = interaction.options.getString('duracion');
      const prize    = interaction.options.getString('premio');
      const winners  = interaction.options.getInteger('ganadores');
      const canal    = interaction.options.getChannel('canal') ?? interaction.channel;
      const rolReq   = interaction.options.getRole('rol_requerido');
      const nivelMin = interaction.options.getInteger('nivel_min');

      const ms = parseDuration(durStr);
      if (!ms) {
        return interaction.reply({ content: '❌ Duración inválida. Usa: `10s`, `30m`, `2h`, `1d` (máx 30 días)', flags: MessageFlags.Ephemeral });
      }

      const endTime = Date.now() + ms;

      const gw = {
        guildId:      interaction.guild.id,
        channelId:    canal.id,
        prize,
        winners,
        endTime,
        hostId:       interaction.user.id,
        entries:      [],
        ended:        false,
        requiredRole: rolReq?.id ?? null,
        minLevel:     nivelMin ?? null,
      };

      // Publicar embed en canal
      const embed = buildEmbed(gw, 0);
      const row   = buildRow('pending', false);

      let gwMsg;
      try {
        gwMsg = await canal.send({ embeds: [embed], components: [row] });
      } catch {
        return interaction.reply({ content: `❌ No tengo permisos para enviar en ${canal}.`, flags: MessageFlags.Ephemeral });
      }

      // Guardar con messageId real como clave
      gw.messageId = gwMsg.id;
      db.set('giveaways', gwMsg.id, gw);

      // Actualizar el customId del botón con el ID real
      const rowReal = buildRow(gwMsg.id, false);
      await gwMsg.edit({ components: [rowReal] });

      scheduleGiveaway(client, gwMsg.id, endTime);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('✅ Sorteo Iniciado')
          .addFields(
            { name: '🎁 Premio',   value: prize,                   inline: true },
            { name: '🏆 Gana.',    value: `${winners}`,            inline: true },
            { name: '⏰ Termina',  value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
            { name: '📢 Canal',    value: canal.toString(),         inline: true },
          )
          .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })],
        flags: MessageFlags.Ephemeral
      });
    }

    // ── END ────────────────────────────────────────────────────────
    else if (sub === 'end') {
      const msgId = interaction.options.getString('mensaje_id');
      const gw    = db.get('giveaways', msgId);

      if (!gw || gw.guildId !== interaction.guild.id) {
        return interaction.reply({ content: '❌ Sorteo no encontrado.', flags: MessageFlags.Ephemeral });
      }
      if (gw.ended) {
        return interaction.reply({ content: '❌ El sorteo ya terminó.', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await pickWinners(client, msgId);
      await interaction.editReply({ content: '✅ Sorteo terminado.' });
    }

    // ── REROLL ─────────────────────────────────────────────────────
    else if (sub === 'reroll') {
      const msgId = interaction.options.getString('mensaje_id');
      const gw    = db.get('giveaways', msgId);

      if (!gw || gw.guildId !== interaction.guild.id) {
        return interaction.reply({ content: '❌ Sorteo no encontrado.', flags: MessageFlags.Ephemeral });
      }
      if (!gw.ended) {
        return interaction.reply({ content: '❌ El sorteo aún no ha terminado. Usa `/giveaway end` primero.', flags: MessageFlags.Ephemeral });
      }

      const entries = gw.entries ?? [];
      if (!entries.length) {
        return interaction.reply({ content: '❌ No hay participantes para reroll.', flags: MessageFlags.Ephemeral });
      }

      const count   = Math.min(gw.winners, entries.length);
      const winners = [];
      const pool    = [...entries];
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }

      gw.winnerIds = winners;
      db.set('giveaways', msgId, gw);

      const channel = await client.channels.fetch(gw.channelId).catch(() => null);
      if (channel) {
        await channel.send({
          embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🔁 Reroll — Nuevos Ganadores')
            .setDescription(`**Premio:** ${gw.prize}\n\n${winners.map(id => `🏆 <@${id}>`).join('\n')}`)
            .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
            .setTimestamp()]
        });
      }

      await interaction.reply({ content: `✅ Reroll completado. Nuevos ganadores: ${winners.map(id => `<@${id}>`).join(', ')}`, flags: MessageFlags.Ephemeral });
    }

    // ── LIST ───────────────────────────────────────────────────────
    else if (sub === 'list') {
      const all    = db.all('giveaways');
      const activos = Object.entries(all).filter(([, g]) => !g.ended && g.guildId === interaction.guild.id);

      if (!activos.length) {
        return interaction.reply({ content: '📭 No hay sorteos activos en este servidor.', flags: MessageFlags.Ephemeral });
      }

      const lines = activos.map(([id, g]) =>
        `🎁 **${g.prize}** · ${g.winners} gana. · <t:${Math.floor(g.endTime / 1000)}:R> · [ir](https://discord.com/channels/${g.guildId}/${g.channelId}/${id})`
      );

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xF5C518)
          .setTitle('🎉 Sorteos Activos')
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })],
        flags: MessageFlags.Ephemeral
      });
    }

    // ── CANCEL ─────────────────────────────────────────────────────
    else if (sub === 'cancel') {
      const msgId = interaction.options.getString('mensaje_id');
      const gw    = db.get('giveaways', msgId);

      if (!gw || gw.guildId !== interaction.guild.id) {
        return interaction.reply({ content: '❌ Sorteo no encontrado.', flags: MessageFlags.Ephemeral });
      }

      gw.ended = true;
      db.set('giveaways', msgId, gw);

      const channel = await client.channels.fetch(gw.channelId).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(msgId).catch(() => null);
        if (msg) {
          await msg.edit({
            embeds: [new EmbedBuilder()
              .setColor(0xFF4444)
              .setTitle('❌ SORTEO CANCELADO')
              .setDescription(`~~${gw.prize}~~`)
              .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })],
            components: [buildRow(msgId, true)]
          });
        }
      }

      await interaction.reply({ content: '✅ Sorteo cancelado.', flags: MessageFlags.Ephemeral });
    }
  }
};
