const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db     = require('../utils/db');
const logger = require('../utils/logger');

// Timers activos en memoria (por messageId)
const timers = new Map();

function buildEmbed(gw, participantes) {
  const ahora    = Date.now();
  const restante = gw.endTime - ahora;
  const terminado = gw.ended || restante <= 0;

  const color = terminado ? 0x808080 : 0xF5C518;
  const titulo = terminado ? '🎉 SORTEO TERMINADO' : '🎉 SORTEO ACTIVO';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(titulo)
    .setDescription(`## 🎁 ${gw.prize}`)
    .addFields(
      { name: '🏆 Ganadores',    value: `${gw.winners}`,                                           inline: true },
      { name: '👥 Participantes', value: `${participantes}`,                                       inline: true },
      { name: '🎟️ Tu ticket',    value: 'Presiona el botón',                                      inline: true },
      { name: terminado ? '⏱️ Terminó' : '⏰ Termina',
        value: `<t:${Math.floor(gw.endTime / 1000)}:${terminado ? 'f' : 'R'}>`,                   inline: true },
      { name: '👑 Organiza',     value: `<@${gw.hostId}>`,                                        inline: true },
    );

  if (gw.requiredRole) embed.addFields({ name: '🎭 Rol requerido', value: `<@&${gw.requiredRole}>`, inline: true });
  if (gw.minLevel)     embed.addFields({ name: '📊 Nivel mínimo',  value: `${gw.minLevel}`,         inline: true });

  if (terminado && gw.winnerIds?.length) {
    embed.addFields({ name: '🏆 Ganadores', value: gw.winnerIds.map(id => `<@${id}>`).join(', ') });
  }

  embed.setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' }).setTimestamp();
  return embed;
}

function buildRow(gwId, ended = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw_enter_${gwId}`)
      .setLabel(ended ? 'Sorteo terminado' : '🎉 Participar')
      .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(ended)
  );
}

async function pickWinners(client, gwId) {
  const all = db.all('giveaways');
  const gw  = all[gwId];
  if (!gw || gw.ended) return;

  gw.ended = true;

  const entries = gw.entries ?? [];
  const count   = Math.min(gw.winners, entries.length);
  const winners = [];

  const pool = [...entries];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }

  gw.winnerIds = winners;
  db.set('giveaways', gwId, gw);

  try {
    const channel = await client.channels.fetch(gw.channelId).catch(() => null);
    if (!channel) return;

    const msg = await channel.messages.fetch(gwId).catch(() => null);
    if (msg) {
      await msg.edit({
        embeds: [buildEmbed(gw, entries.length)],
        components: [buildRow(gwId, true)],
      });
    }

    if (winners.length) {
      await channel.send({
        embeds: [new EmbedBuilder()
          .setColor(0xF5C518)
          .setTitle('🎉 ¡Tenemos Ganadores!')
          .setDescription(
            `**Premio:** ${gw.prize}\n\n` +
            winners.map(id => `🏆 <@${id}>`).join('\n')
          )
          .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
          .setTimestamp()]
      });

      // DM a ganadores
      for (const wId of winners) {
        try {
          const user = await client.users.fetch(wId);
          await user.send({
            embeds: [new EmbedBuilder()
              .setColor(0xF5C518)
              .setTitle('🎉 ¡Ganaste un Sorteo!')
              .addFields(
                { name: '🎁 Premio',   value: gw.prize },
                { name: '🏠 Servidor', value: `ID: ${gw.guildId}` },
              )
              .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })]
          });
        } catch {}
      }
    } else {
      await channel.send({ content: '😔 No hubo suficientes participantes para el sorteo.' });
    }
  } catch (e) {
    logger.warn(`Error al terminar sorteo ${gwId}: ${e.message}`);
  }
}

function scheduleGiveaway(client, gwId, endTime) {
  const ms = endTime - Date.now();
  if (ms <= 0) {
    pickWinners(client, gwId);
    return;
  }
  if (timers.has(gwId)) clearTimeout(timers.get(gwId));
  const t = setTimeout(() => pickWinners(client, gwId), ms);
  timers.set(gwId, t);
}

function resumeAll(client) {
  const all = db.all('giveaways');
  for (const [gwId, gw] of Object.entries(all)) {
    if (!gw.ended) {
      scheduleGiveaway(client, gwId, gw.endTime);
      logger.info(`Sorteo retomado: ${gw.prize} (termina <t:${Math.floor(gw.endTime / 1000)}:R>)`);
    }
  }
}

module.exports = { buildEmbed, buildRow, scheduleGiveaway, resumeAll, pickWinners };
