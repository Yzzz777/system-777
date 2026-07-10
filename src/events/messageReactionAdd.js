const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user, client) {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    if (reaction.message.partial) { try { await reaction.message.fetch(); } catch { return; } }
    if (reaction.emoji.name !== '⭐') return;

    const { guild, message } = reaction.message;
    if (!guild) return;

    const cfg = db.get('guilds', guild.id, {});
    if (!cfg.starboardChannel) return;

    const threshold = cfg.starboardThreshold ?? 3;
    const count     = reaction.count;

    if (count < threshold) return;
    if (message.channelId === cfg.starboardChannel) return;

    // Check if already posted
    const posted = db.get('starboard', message.id);
    if (posted) {
      // Update count on existing message
      try {
        const sbChannel = guild.channels.cache.get(cfg.starboardChannel);
        const sbMsg = await sbChannel.messages.fetch(posted.sbMsgId).catch(() => null);
        if (sbMsg) {
          const embed = EmbedBuilder.from(sbMsg.embeds[0]);
          embed.setFooter({ text: `⭐ ${count} estrellas · System 777` });
          await sbMsg.edit({ embeds: [embed] });
        }
      } catch {}
      return;
    }

    const sbChannel = guild.channels.cache.get(cfg.starboardChannel);
    if (!sbChannel) return;

    const author = message.author;
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL({ size: 64 }) })
      .setDescription(message.content || '*[Sin texto]*')
      .addFields(
        { name: '📌 Canal original', value: `${message.channel} · [Ir al mensaje](${message.url})`, inline: false },
      )
      .setFooter({ text: `⭐ ${count} estrellas · System 777` })
      .setTimestamp(message.createdAt);

    if (message.attachments.size > 0) {
      const img = message.attachments.find(a => a.contentType?.startsWith('image/'));
      if (img) embed.setImage(img.url);
    }

    const sbMsg = await sbChannel.send({ content: `⭐ **${count}** · ${message.channel}`, embeds: [embed] }).catch(() => null);
    if (sbMsg) db.set('starboard', message.id, { sbMsgId: sbMsg.id, count });
  }
};
