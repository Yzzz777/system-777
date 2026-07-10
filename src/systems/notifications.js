const db = require('../utils/db');
const https = require('https');
const { EmbedBuilder } = require('discord.js');

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
let intervalId = null;

function getConfig() {
  return db.get('notifications', 'config', { youtube: [], kick: [], tiktok: [] });
}

function saveConfig(cfg) {
  db.set('notifications', 'config', cfg);
}

function getHistory() {
  return db.get('notifications', 'history', []);
}

function addHistory(entry) {
  const hist = getHistory();
  hist.unshift({ ...entry, ts: Date.now() });
  if (hist.length > 100) hist.length = 100;
  db.set('notifications', 'history', hist);
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function checkYouTube(client) {
  const cfg = getConfig();
  const channels = cfg.youtube || [];
  for (const sub of channels) {
    if (!sub.channelId || !sub.discordChannelId) continue;
    try {
      const xml = await fetchUrl(`https://www.youtube.com/feeds/videos.xml?channel_id=${sub.channelId}`);
      const videoMatch = xml.match(/<entry>[\s\S]*?<yt:videoId>(.*?)<\/yt:videoId>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<media:thumbnail url="(.*?)"/);
      if (!videoMatch) continue;
      const [, videoId, title, thumbnail] = videoMatch;
      const lastId = sub.lastVideoId || '';
      if (videoId === lastId) continue;
      sub.lastVideoId = videoId;
      saveConfig(cfg);

      for (const guild of client.guilds.cache.values()) {
        const ch = guild.channels.cache.get(sub.discordChannelId);
        if (!ch) continue;
        const embed = new EmbedBuilder()
          .setTitle(`🎬 ${title}`)
          .setURL(`https://www.youtube.com/watch?v=${videoId}`)
          .setImage(thumbnail)
          .setColor(sub.color || '#FF0000')
          .setFooter({ text: 'System 777 · YouTube Notifications' })
          .setTimestamp();
        if (sub.message) embed.setDescription(sub.message.replace('{video}', title).replace('{url}', `https://www.youtube.com/watch?v=${videoId}`));
        const rolePing = sub.roleId ? `<@&${sub.roleId}>` : '';
        await ch.send({ content: rolePing || null, embeds: [embed] }).catch(() => {});
      }
      addHistory({ type: 'youtube', channel: sub.channelId, title, videoId, guildId: sub.guildId });
    } catch {}
  }
}

async function checkKick(client) {
  const cfg = getConfig();
  const channels = cfg.kick || [];
  for (const sub of channels) {
    if (!sub.username || !sub.discordChannelId) continue;
    try {
      const html = await fetchUrl(`https://kick.com/api/v2/channels/${sub.username}`);
      const data = JSON.parse(html);
      const isLive = data.playing === true || data.livestream?.id;
      const wasLive = sub.isLive || false;
      sub.isLive = isLive;
      saveConfig(cfg);

      if (isLive && !wasLive) {
        for (const guild of client.guilds.cache.values()) {
          const ch = guild.channels.cache.get(sub.discordChannelId);
          if (!ch) continue;
          const stream = data.livestream || {};
          const embed = new EmbedBuilder()
            .setTitle(`🔴 ${sub.username} está en DIRECTO`)
            .setDescription(stream.session_title || '¡Ahora mismo está transmitiendo!')
            .setURL(`https://kick.com/${sub.username}`)
            .setThumbnail(data.profile?.avatar || '')
            .setColor(sub.color || '#53FC18')
            .addFields(
              { name: '👁️ Espectadores', value: `${stream.viewers_count || 0}`, inline: true },
              { name: '🎮 Categoría', value: stream.categories?.[0]?.name || 'General', inline: true },
            )
            .setFooter({ text: 'System 777 · Kick Notifications' })
            .setTimestamp();
          if (sub.message) embed.setDescription(sub.message.replace('{user}', sub.username).replace('{title}', stream.session_title || ''));
          const rolePing = sub.roleId ? `<@&${sub.roleId}>` : '';
          await ch.send({ content: rolePing || null, embeds: [embed] }).catch(() => {});
        }
        addHistory({ type: 'kick', username: sub.username, title: data.livestream?.session_title, guildId: sub.guildId });
      }
    } catch {}
  }
}

async function checkTikTok(client) {
  const cfg = getConfig();
  const channels = cfg.tiktok || [];
  for (const sub of channels) {
    if (!sub.username || !sub.discordChannelId) continue;
    try {
      const html = await fetchUrl(`https://www.tiktok.com/@${sub.username}`);
      const match = html.match(/"id":"(\d+)","desc":"(.*?)".*?"createTime":"(\d+)"/);
      if (!match) continue;
      const [, videoId, desc, createTime] = match;
      const lastId = sub.lastVideoId || '';
      if (videoId === lastId) continue;
      sub.lastVideoId = videoId;
      saveConfig(cfg);

      for (const guild of client.guilds.cache.values()) {
        const ch = guild.channels.cache.get(sub.discordChannelId);
        if (!ch) continue;
        const embed = new EmbedBuilder()
          .setTitle(`🎵 ${sub.username} subió un TikTok`)
          .setDescription(desc || 'Nuevo video en TikTok')
          .setURL(`https://www.tiktok.com/@${sub.username}/video/${videoId}`)
          .setColor(sub.color || '#000000')
          .setFooter({ text: 'System 777 · TikTok Notifications' })
          .setTimestamp();
        if (sub.message) embed.setDescription(sub.message.replace('{user}', sub.username).replace('{video}', desc || ''));
        const rolePing = sub.roleId ? `<@&${sub.roleId}>` : '';
        await ch.send({ content: rolePing || null, embeds: [embed] }).catch(() => {});
      }
      addHistory({ type: 'tiktok', username: sub.username, title: desc, videoId, guildId: sub.guildId });
    } catch {}
  }
}

async function checkAll(client) {
  await checkYouTube(client);
  await checkKick(client);
  await checkTikTok(client);
}

function startChecker(client) {
  if (intervalId) clearInterval(intervalId);
  checkAll(client).catch(() => {});
  intervalId = setInterval(() => checkAll(client).catch(() => {}), CHECK_INTERVAL);
}

function stopChecker() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

module.exports = { getConfig, saveConfig, getHistory, addHistory, checkAll, startChecker, stopChecker };
