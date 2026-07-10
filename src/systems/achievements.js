const db = require('../utils/db');
const { EmbedBuilder } = require('discord.js');

const ACHIEVEMENTS = {
  first_coin:   { name: '💰 Primer Peso',   desc: 'Gana tu primera moneda',        emoji: '💰', points: 10,  cat: 'economy' },
  rich_10k:     { name: '💵 Adinerado',     desc: 'Alcanza 10,000 monedas',        emoji: '💵', points: 25,  cat: 'economy' },
  rich_100k:    { name: '🤑 Millonario',    desc: 'Alcanza 100,000 monedas',       emoji: '🤑', points: 75,  cat: 'economy' },
  gambler_10:   { name: '🎰 Apostador',     desc: 'Usa slots 10 veces',            emoji: '🎰', points: 20,  cat: 'economy' },
  daily_3:      { name: '📆 Racha',         desc: '3 días seguidos de daily',      emoji: '📆', points: 15,  cat: 'economy' },
  daily_7:      { name: '📅 Semanal',       desc: '7 días seguidos de daily',      emoji: '📅', points: 35,  cat: 'economy' },
  daily_30:     { name: '🔥 Mensual',       desc: '30 días seguidos de daily',     emoji: '🔥', points: 100, cat: 'economy' },
  lvl_5:        { name: '📈 En Camino',     desc: 'Alcanza el nivel 5',            emoji: '📈', points: 15,  cat: 'levels'  },
  lvl_10:       { name: '🎯 Nivel 10',      desc: 'Alcanza el nivel 10',           emoji: '🎯', points: 30,  cat: 'levels'  },
  lvl_25:       { name: '🚀 Nivel 25',      desc: 'Alcanza el nivel 25',           emoji: '🚀', points: 75,  cat: 'levels'  },
  lvl_50:       { name: '💎 Nivel 50',      desc: 'Alcanza el nivel 50',           emoji: '💎', points: 150, cat: 'levels'  },
  msg_100:      { name: '💬 Hablador',      desc: 'Envía 100 mensajes',            emoji: '💬', points: 15,  cat: 'social'  },
  msg_1000:     { name: '📢 Parlanchín',    desc: 'Envía 1,000 mensajes',          emoji: '📢', points: 40,  cat: 'social'  },
  msg_10000:    { name: '🌊 Incansable',    desc: 'Envía 10,000 mensajes',         emoji: '🌊', points: 150, cat: 'social'  },
  married:      { name: '💍 Casado/a',      desc: 'Contrae matrimonio',            emoji: '💍', points: 20,  cat: 'social'  },
  clan_create:  { name: '🛡️ Fundador',     desc: 'Crea un clan',                  emoji: '🛡️', points: 25, cat: 'clans'   },
  clan_join:    { name: '🤝 Miembro',       desc: 'Únete a un clan',               emoji: '🤝', points: 10,  cat: 'clans'   },
  premium_user: { name: '⭐ Premiado',      desc: 'Activa premium',                emoji: '⭐', points: 50,  cat: 'special' },
  cmd_50:       { name: '⚡ Activo',        desc: 'Usa 50 comandos',               emoji: '⚡', points: 20,  cat: 'misc'    },
  cmd_500:      { name: '🤖 Experto',       desc: 'Usa 500 comandos',              emoji: '🤖', points: 60,  cat: 'misc'    },
};

function getEarned(userId, guildId) {
  return db.get('achievements', `${guildId}_${userId}`) || [];
}

function has(userId, guildId, id) {
  return getEarned(userId, guildId).includes(id);
}

async function grant(userId, guildId, id, channel = null) {
  if (!ACHIEVEMENTS[id] || has(userId, guildId, id)) return false;
  const list = getEarned(userId, guildId);
  list.push(id);
  db.set('achievements', `${guildId}_${userId}`, list);
  if (channel) {
    const a = ACHIEVEMENTS[id];
    channel.send({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`${a.emoji} ¡Logro Desbloqueado!`)
      .setDescription(`<@${userId}> desbloqueó **${a.name}**\n*${a.desc}* · **+${a.points} pts**`)
      .setFooter({ text: 'System 777 · Logros' })
    ]}).catch(() => {});
  }
  return true;
}

function getPoints(userId, guildId) {
  return getEarned(userId, guildId).reduce((s, id) => s + (ACHIEVEMENTS[id]?.points || 0), 0);
}

function checkLevelAchievements(userId, guildId, level, channel) {
  if (level >= 5)  grant(userId, guildId, 'lvl_5',  channel);
  if (level >= 10) grant(userId, guildId, 'lvl_10', channel);
  if (level >= 25) grant(userId, guildId, 'lvl_25', channel);
  if (level >= 50) grant(userId, guildId, 'lvl_50', channel);
}

function checkMessageAchievements(userId, guildId, msgCount, channel) {
  if (msgCount >= 100)   grant(userId, guildId, 'msg_100',   channel);
  if (msgCount >= 1000)  grant(userId, guildId, 'msg_1000',  channel);
  if (msgCount >= 10000) grant(userId, guildId, 'msg_10000', channel);
}

function checkEconomyAchievements(userId, guildId, total, channel) {
  if (total > 0)      grant(userId, guildId, 'first_coin', channel);
  if (total >= 10000) grant(userId, guildId, 'rich_10k',   channel);
  if (total >= 100000) grant(userId, guildId, 'rich_100k', channel);
}

module.exports = {
  ACHIEVEMENTS,
  getEarned, has, grant, getPoints,
  checkLevelAchievements, checkMessageAchievements, checkEconomyAchievements,
};
