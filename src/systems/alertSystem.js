const https = require('https');
const db = require('../utils/db');
const { EmbedBuilder } = require('discord.js');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'System777Bot/1.0' } }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(raw));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parseYoutubeRSS(xml) {
  const entries = xml.split('<entry>').slice(1);
  return entries.map(entry => {
    const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title   = (entry.match(/<title>([^<]+)<\/title>/) || [])[1];
    const link    = (entry.match(/<link rel="alternate" href="([^"]+)"/) || [])[1];
    const author  = (entry.match(/<name>([^<]+)<\/name>/) || [])[1];
    return { videoId, title, link, author };
  }).filter(e => e.videoId);
}

async function checkYoutubeAlerts(client) {
  const all = db.all('alerts');
  for (const [key, cfg] of Object.entries(all)) {
    if (!key.startsWith('yt_')) continue;
    try {
      const xml = await httpsGet(`https://www.youtube.com/feeds/videos.xml?channel_id=${cfg.youtubeChannelId}`);
      const videos = parseYoutubeRSS(xml);
      if (!videos.length) continue;
      const latest = videos[0];
      if (cfg.lastVideoId === latest.videoId) continue;

      // New video!
      db.set('alerts', key, { ...cfg, lastVideoId: latest.videoId });

      const guild = client.guilds.cache.get(cfg.guildId);
      const channel = guild?.channels.cache.get(cfg.discordChannelId);
      if (!channel) continue;

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`📺 ${latest.title}`)
        .setDescription(`**${latest.author}** subió un nuevo video!`)
        .setURL(latest.link || `https://youtube.com/watch?v=${latest.videoId}`)
        .setThumbnail(`https://i.ytimg.com/vi/${latest.videoId}/hqdefault.jpg`)
        .setFooter({ text: 'System 777 · YouTube Alerts' })
        .setTimestamp();

      await channel.send({ content: '🔔 **¡Nuevo video!**', embeds: [embed] }).catch(() => {});
    } catch {}
  }
}

async function checkTwitchAlerts(client) {
  const all = db.all('alerts');
  for (const [key, cfg] of Object.entries(all)) {
    if (!key.startsWith('twitch_')) continue;
    try {
      const html = await httpsGet(`https://www.twitch.tv/${cfg.twitchUsername}`);
      const isLive = html.includes('"isLiveBroadcast"') || html.includes('"stream":{"id"');
      if (isLive === cfg.isLive) continue;

      db.set('alerts', key, { ...cfg, isLive });
      if (!isLive) continue; // went offline, don't notify

      const guild = client.guilds.cache.get(cfg.guildId);
      const channel = guild?.channels.cache.get(cfg.discordChannelId);
      if (!channel) continue;

      const embed = new EmbedBuilder()
        .setColor(0x9146FF)
        .setTitle(`🟣 ${cfg.twitchUsername} está en vivo!`)
        .setDescription(`¡**${cfg.twitchUsername}** acaba de empezar stream en Twitch!`)
        .setURL(`https://www.twitch.tv/${cfg.twitchUsername}`)
        .setFooter({ text: 'System 777 · Twitch Alerts' })
        .setTimestamp();

      await channel.send({ content: `🔴 **¡${cfg.twitchUsername} está en vivo!**`, embeds: [embed] }).catch(() => {});
    } catch {}
  }
}

function addYoutubeAlert(guildId, discordChannelId, youtubeChannelId) {
  db.set('alerts', `yt_${guildId}_${youtubeChannelId}`, { guildId, discordChannelId, youtubeChannelId, lastVideoId: null, ts: Date.now() });
}
function removeYoutubeAlert(guildId, youtubeChannelId) {
  db.del('alerts', `yt_${guildId}_${youtubeChannelId}`);
}
function addTwitchAlert(guildId, discordChannelId, twitchUsername) {
  db.set('alerts', `twitch_${guildId}_${twitchUsername.toLowerCase()}`, { guildId, discordChannelId, twitchUsername: twitchUsername.toLowerCase(), isLive: false, ts: Date.now() });
}
function removeTwitchAlert(guildId, twitchUsername) {
  db.del('alerts', `twitch_${guildId}_${twitchUsername.toLowerCase()}`);
}

module.exports = { addYoutubeAlert, removeYoutubeAlert, checkYoutubeAlerts, addTwitchAlert, removeTwitchAlert, checkTwitchAlerts };
