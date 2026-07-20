const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

function fixImageUrl(url) {
  if (!url) return url;
  if (url.includes('imgur.com/') && !url.includes('i.imgur.com')) {
    url = url.replace('imgur.com/', 'i.imgur.com/');
    if (!url.match(/\.(png|jpg|jpeg|gif|webp)$/)) url += '.png';
  }
  return url;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function replaceVariables(text, vars) {
  if (!text) return '';
  return text
    .replace(/{user}/g, vars.user || '')
    .replace(/{username}/g, vars.username || '')
    .replace(/{guild}/g, vars.guild || '')
    .replace(/{channel}/g, vars.channel || '')
    .replace(/{memberCount}/g, vars.memberCount ?? '')
    .replace(/{memberCountOrdinal}/g, vars.memberCountOrdinal ?? '');
}

function buildWelcomeEmbed(member, cfg, channel) {
  const guild = member.guild;
  const colorHex = cfg.embedColor || '#5865F2';
  const color = parseInt(colorHex.replace('#', ''), 16) || 0x5865F2;

  const vars = {
    user: `${member}`,
    username: member.user.username,
    guild: guild.name,
    channel: channel ? `<#${channel.id}>` : '',
    memberCount: guild.memberCount,
    memberCountOrdinal: ordinal(guild.memberCount),
  };

  const title = replaceVariables('👋 Bienvenido/a a {guild}!', vars);

  const customMsg = cfg.message;
  const defaultDesc =
    `> ¡Hola ${member}! Bienvenido/a a **${guild.name}**.\n` +
    `> Estamos encantados de que te unas a nuestra comunidad.\n\n` +
    `**📋 Pasos para comenzar:**\n` +
    `> 1️⃣ · Lee las reglas del servidor\n` +
    `> 2️⃣ · Preséntate en el canal de chat\n` +
    `> 3️⃣ · Disfruta de la comunidad`;

  let desc = customMsg ? replaceVariables(customMsg, vars) : defaultDesc;
  if (desc.length > 4096) desc = desc.slice(0, 4093) + '...';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  const bannerUrl = cfg.image;
  if (bannerUrl) {
    embed.setImage(fixImageUrl(bannerUrl));
  } else if (guild.bannerURL()) {
    embed.setImage(guild.bannerURL({ size: 1024 }));
  }

  const channels = cfg.channels || [];
  const fields = [];

  for (const ch of channels) {
    if (ch.channelId) {
      fields.push({ name: `${ch.emoji || '📋'} ${ch.label}`, value: `<#${ch.channelId}>`, inline: true });
    }
  }

  embed.addFields(fields);

  embed.setFooter({
    text: `Miembro #${guild.memberCount} • ${guild.name}`,
    iconURL: member.client.user.displayAvatarURL({ size: 64 }) || undefined,
  });

  return embed;
}

function buildGoodbyeEmbed(member, cfg) {
  const guild = member.guild;
  const colorHex = cfg.embedColor || '#ED4245';
  const color = parseInt(colorHex.replace('#', ''), 16) || 0xED4245;

  const vars = {
    user: `${member}`,
    username: member.user.username,
    guild: guild.name,
    memberCount: guild.memberCount,
    memberCountOrdinal: ordinal(guild.memberCount),
  };

  const title = replaceVariables('👋 ¡Hasta pronto, {username}!', vars);

  const customMsg = cfg.message;
  const defaultDesc =
    `> **${member.user.username}** ha abandonado el servidor.\n` +
    `> Esperamos verte de nuevo pronto.`;

  let desc = customMsg ? replaceVariables(customMsg, vars) : defaultDesc;
  if (desc.length > 4096) desc = desc.slice(0, 4093) + '...';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
  let ageText;
  if (accountAge < 1) ageText = 'Menos de 1 día';
  else if (accountAge < 30) ageText = `${accountAge} días`;
  else if (accountAge < 365) ageText = `${Math.floor(accountAge / 30)} meses`;
  else ageText = `${Math.floor(accountAge / 365)} años`;

  embed.addFields(
    { name: '👥 Miembros restantes', value: `**${guild.memberCount}**`, inline: true },
    { name: '📅 Cuenta creada', value: ageText, inline: true },
  );

  embed.setFooter({
    text: `Miembros restantes: ${guild.memberCount}`,
    iconURL: guild.iconURL({ size: 64 }) || undefined,
  });

  return embed;
}

function buildWelcomeButtons(member, cfg) {
  const guild = member.guild;
  const rows = [];
  const channels = cfg.channels || [];

  if (channels.length > 0) {
    const row = new ActionRowBuilder();
    for (const ch of channels.slice(0, 5)) {
      if (ch.channelId) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel(`${ch.emoji || ''} ${ch.label}`)
            .setURL(`https://discord.com/channels/${guild.id}/${ch.channelId}`)
            .setStyle(ButtonStyle.Link)
        );
      }
    }
    if (row.components.length > 0) rows.push(row);
  }

  const verifyCfg = db.get('guilds', guild.id, {}).verification || {};
  if (verifyCfg.active && verifyCfg.channelId) {
    const row2 = new ActionRowBuilder();
    row2.addComponents(
      new ButtonBuilder()
        .setLabel('✅ Verificarse')
        .setURL(`${process.env.BASE_URL || 'https://jrsystem7777.com'}/verify/${guild.id}`)
        .setStyle(ButtonStyle.Link)
    );
    rows.push(row2);
  }

  return rows;
}

async function sendWelcome(member, type = 'welcome') {
  const cfg = db.get('guilds', member.guild.id, {});
  const welcomeCfg = cfg.welcome || {};
  const goodbyeCfg = cfg.goodbye || {};
  const typeCfg = type === 'welcome' ? welcomeCfg : goodbyeCfg;

  if (typeCfg.enabled === false) return;

  const chId = typeCfg.channelId || typeCfg.channel || typeCfg.channel_id;
  if (!chId) return;

  const channel = member.guild.channels.cache.get(chId);
  if (!channel) return;

  const botPerms = channel.permissionsFor(member.guild.members.me);
  if (!botPerms || !botPerms.has('SendMessages') || !botPerms.has('EmbedLinks')) return;

  const isWelcome = type === 'welcome';

  const embed = isWelcome
    ? buildWelcomeEmbed(member, typeCfg, channel)
    : buildGoodbyeEmbed(member, typeCfg);

  const components = isWelcome ? buildWelcomeButtons(member, typeCfg) : [];

  const content = isWelcome ? `${member}` : undefined;

  try {
    await channel.send({
      content,
      embeds: [embed],
      components: components.length > 0 ? components : undefined,
    });
  } catch (e) {
    console.error(`[WELCOME] Error enviando ${type} en #${channel.name}:`, e.message);
    return;
  }

  if (isWelcome && typeCfg.mentionRole) {
    const role = member.guild.roles.cache.get(typeCfg.mentionRole);
    if (role) {
      await channel.send({ content: `${role} — ¡Nuevo miembro! 🎉` }).catch(() => {});
    }
  }

  if (isWelcome && typeCfg.autoRole) {
    const roleIds = Array.isArray(typeCfg.autoRole) ? typeCfg.autoRole : [typeCfg.autoRole];
    const rolesToAdd = [];
    const botPermsManage = member.guild.members.me?.permissions?.has('ManageRoles');
    if (!botPermsManage) {
      console.error(`[WELCOME] Bot sin permiso ManageRoles — no se pueden asignar auto-roles`);
    } else {
      const botHighest = member.guild.members.me?.roles?.highest?.position || 0;
      for (const roleId of roleIds) {
        if (!roleId) continue;
        const role = member.guild.roles.cache.get(roleId);
        if (!role) {
          console.error(`[WELCOME] Rol ${roleId} no encontrado en el servidor`);
          continue;
        }
        if (botHighest > role.position) {
          rolesToAdd.push(role);
        } else {
          console.error(`[WELCOME] Rol ${role.name} más alto que el bot (${role.position} > ${botHighest})`);
        }
      }
      if (rolesToAdd.length > 0) {
        try {
          await member.roles.add(rolesToAdd, 'Auto-role — System 777');
          console.log(`[WELCOME] ${rolesToAdd.length} roles asignados a ${member.user.tag}: ${rolesToAdd.map(r => r.name).join(', ')}`);
        } catch (e) {
          console.error(`[WELCOME] Error asignando roles:`, e.message);
        }
      }
    }
  }

  if (isWelcome) {
    const dmEnabled = typeCfg.dmEnabled;
    const dmMessage = typeCfg.dmMessage;
    if (dmEnabled && dmMessage) {
      const dmVars = {
        user: `${member}`,
        username: member.user.username,
        guild: member.guild.name,
        memberCount: member.guild.memberCount,
      };
      const dmEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription(replaceVariables(dmMessage, dmVars))
        .setTimestamp();
      await member.user.send({ embeds: [dmEmbed] }).catch(() => {});
    }
  }
}

module.exports = { sendWelcome, buildWelcomeEmbed, buildGoodbyeEmbed, buildWelcomeButtons };
