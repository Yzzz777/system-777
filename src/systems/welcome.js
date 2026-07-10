const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

function formatMsg(template, member, type) {
  return template
    .replace(/{user}/g, `${member}`)
    .replace(/{username}/g, member.user.username)
    .replace(/{guild}/g, member.guild.name)
    .replace(/{count}/g, member.guild.memberCount);
}

async function sendWelcome(member, type = 'welcome') {
  const cfg = db.get('guilds', member.guild.id, {});
  const chId = cfg[`${type}Channel`];
  if (!chId) return;

  const channel = member.guild.channels.cache.get(chId);
  if (!channel) return;

  const isWelcome = type === 'welcome';
  const defaultMsg = isWelcome
    ? '¡Bienvenido/a al servidor! 🎉'
    : 'Ha salido del servidor. 👋';

  const customMsg = cfg[`${type}Message`];
  const desc = customMsg ? formatMsg(customMsg, member, type) : defaultMsg;

  const color = cfg.welcomeColor ?? (isWelcome ? 0x00FF88 : 0xFF6600);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(isWelcome ? `👋 ¡Bienvenido/a a ${member.guild.name}!` : `👋 Hasta pronto — ${member.user.username}`)
    .setDescription(desc)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '👤 Usuario',    value: `${member.user.tag}`,                                        inline: true },
      { name: '🆔 ID',         value: `\`${member.user.id}\``,                                     inline: true },
      { name: '👥 Miembros',   value: `${member.guild.memberCount}`,                               inline: true },
      { name: '📅 Cuenta creada', value: `<t:${Math.floor(member.user.createdAt/1000)}:R>`,        inline: true },
    )
    .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
    .setTimestamp();

  await channel.send({ content: isWelcome ? `${member}` : undefined, embeds: [embed] }).catch(() => {});
}

module.exports = { sendWelcome };
