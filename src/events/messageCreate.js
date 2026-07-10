const {
  EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const { addXp }           = require('../systems/levels');
const logger              = require('../systems/logger');
const db                  = require('../utils/db');
const security            = require('../systems/securityGuard');
const afkSys              = require('../systems/afk');
const missions            = require('../systems/missions');
const achievements        = require('../systems/achievements');
const customCmds          = require('../systems/customCommands');
const { checkHoneypot }   = require('../systems/antiRaid');

const floodMap = new Map();

// AutoMod whitelist: staff (ManageGuild) y roles/canales/usuarios en whitelist quedan exentos
function isWhitelisted(message, cfg) {
  if (message.member?.permissions?.has('ManageGuild')) return true;
  const wl = cfg.automodWhitelist || {};
  if (wl.users?.includes(message.author.id)) return true;
  if (wl.channels?.includes(message.channel.id)) return true;
  if (wl.roles?.length && message.member?.roles?.cache?.some(r => wl.roles.includes(r.id))) return true;
  return false;
}

async function checkFlood(message) {
  const cfg = db.get('guilds', message.guild.id, {});
  if (!cfg.antiflood) return;
  if (isWhitelisted(message, cfg)) return false;

  const key    = `${message.guild.id}_${message.author.id}`;
  const now    = Date.now();
  const window = 5000;
  const limit  = cfg.floodLimit ?? 5;

  if (!floodMap.has(key)) floodMap.set(key, { msgs: [], warned: false });
  const data = floodMap.get(key);
  data.msgs.push(now);
  data.msgs = data.msgs.filter(t => now - t < window);

  if (data.msgs.length >= limit) {
    data.msgs = [];
    const msgs = await message.channel.messages.fetch({ limit: 10 }).catch(() => null);
    if (msgs) {
      const spamMsgs = msgs.filter(m => m.author.id === message.author.id);
      await message.channel.bulkDelete(spamMsgs).catch(() => {});
    }
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (member) await member.timeout(120000, 'System 777 · Anti-flood').catch(() => {});
    await message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(0xFF2222)
        .setDescription(`🚨 ${message.author} fue silenciado por **flood** (${limit} msgs/5s). Timeout: 2 min.`)
        .setFooter({ text: 'System 777 · Anti-Flood' })]
    }).catch(() => {});
    await logger.logFlood(message.guild, message.author, message.channel, limit);
    return true;
  }
  return false;
}

async function checkAutomod(message) {
  const cfg = db.get('guilds', message.guild.id, {});
  if (isWhitelisted(message, cfg)) return false;
  const am  = cfg.automodCustom ?? {};
  const content = message.content;

  if (am.antilink) {
    const linkRegex = /https?:\/\/|discord\.gg\//i;
    if (linkRegex.test(content)) {
      await message.delete().catch(() => {});
      await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(0xFF6600)
          .setDescription(`🔗 ${message.author} — No se permiten links en este servidor.`)
          .setFooter({ text: 'System 777 · AutoMod' })]
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
      return true;
    }
  }

  if (am.anticaps && content.length > 10) {
    const caps = content.replace(/[^A-Z]/g, '').length;
    const pct  = caps / content.replace(/\s/g, '').length;
    if (pct > 0.70) {
      await message.delete().catch(() => {});
      await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(0xFF9900)
          .setDescription(`🔡 ${message.author} — No uses tantas mayúsculas.`)
          .setFooter({ text: 'System 777 · AutoMod' })]
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 4000)).catch(() => {});
      return true;
    }
  }

  if (am.antiemoji) {
    const emojiCount = (content.match(/\p{Emoji}/gu) ?? []).length;
    const limit = am.emojiLimit ?? 8;
    if (emojiCount > limit) {
      await message.delete().catch(() => {});
      await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(0xFFCC00)
          .setDescription(`😵 ${message.author} — Demasiados emojis (máx ${limit}).`)
          .setFooter({ text: 'System 777 · AutoMod' })]
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 4000)).catch(() => {});
      return true;
    }
  }

  if (am.wordFilter?.length) {
    const lower = content.toLowerCase();
    const found = am.wordFilter.find(w => lower.includes(w.toLowerCase()));
    if (found) {
      await message.delete().catch(() => {});
      await message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setDescription(`🚫 ${message.author} — Palabra no permitida detectada.`)
          .setFooter({ text: 'System 777 · AutoMod' })]
      }).then(m => setTimeout(() => m.delete().catch(() => {}), 4000)).catch(() => {});
      return true;
    }
  }

  return false;
}

const chatHistory = new Map();

function buildOwnerPanel(client) {
  const uptime = process.uptime();
  const d = Math.floor(uptime / 86400);
  const h = Math.floor((uptime % 86400) / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const embed = new EmbedBuilder()
    .setColor(0xF5C518)
    .setTitle('⚡ Panel de Control — System 777')
    .setThumbnail(client.user.displayAvatarURL({ size: 128 }))
    .setDescription('👑 **Bienvenido Jefe.** Panel interactivo del bot.')
    .addFields(
      { name: '🏠 Servidores', value: `${client.guilds.cache.size}`,                                          inline: true },
      { name: '📡 Ping',       value: `${client.ws.ping}ms`,                                                  inline: true },
      { name: '⏱️ Uptime',    value: `${d}d ${h}h ${m}m`,                                                    inline: true },
      { name: '💾 RAM',        value: `${(process.memoryUsage().heapUsed/1024/1024).toFixed(1)} MB`,          inline: true },
      { name: '🌐 Dashboard',        value: `https://jrsystem7777.com`,   inline: true },
      { name: '🔗 Invitar Bot',      value: `[Invitar System 777](https://discord.com/oauth2/authorize?client_id=1502804306125132057&permissions=8&integration_type=0&scope=applications.commands+bot)`, inline: true },
    )
    .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dm_estado').setLabel('📊 Estado').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('dm_servidores').setLabel('🏠 Servidores').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('dm_sorteos').setLabel('🎉 Sorteos').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('dm_economia').setLabel('💰 Economía').setStyle(ButtonStyle.Success),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dm_lockdown').setLabel('🔒 Lockdown Global').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('dm_comandos').setLabel('📋 Todos los Comandos').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dm_dashboard').setLabel('🌐 Dashboard').setStyle(ButtonStyle.Secondary),
  );

  return { embed, rows: [row1, row2] };
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    // ── GUILD ──────────────────────────────────────────────────
    if (message.guild) {
      // Auto-responder
      try {
        const ar = require('../systems/autoResponder');
        const match = ar.checkMessage(message.guild.id, message.content);
        if (match) await message.reply(match.response).catch(() => {});
      } catch {}

      // Honeypot check — highest priority (ban on sight)
      if (await checkHoneypot(message, client)) return;

      security.trackMessage(message);

      const flooded = await checkFlood(message);
      if (flooded) return;

      const blocked = await checkAutomod(message);
      if (blocked) return;

      if (await security.checkTokenLeak(message, client))      return;
      if (await security.checkPhishing(message, client))        return;
      if (await security.checkNSFW(message, client))            return;
      if (await security.checkInviteSpam(message, client))      return;
      if (await security.checkMassMention(message, client))     return;
      if (await security.checkZalgo(message, client))           return;
      if (await security.checkDuplicate(message, client))       return;
      if (await security.checkAttachmentSpam(message, client))  return;

      // ── AFK: remover si el usuario que habló está AFK ────────
      if (afkSys.isAfk(message.author.id)) {
        afkSys.remove(message.author.id);
        message.channel.send({
          embeds: [new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`👋 ${message.author} tu modo AFK fue removido automáticamente.`)
            .setFooter({ text: 'System 777 · AFK' })]
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 6000)).catch(() => {});
      }

      // ── AFK: notificar si menciona a alguien que está AFK ────
      if (message.mentions.users.size) {
        for (const [, user] of message.mentions.users) {
          if (user.id === message.author.id || user.bot) continue;
          const afkData = afkSys.get(user.id);
          if (afkData) {
            const ago = Math.max(0, Math.floor((Date.now() - afkData.since) / 60000));
            message.channel.send({
              embeds: [new EmbedBuilder()
                .setColor(0xFF9900)
                .setDescription(`💤 **${user.username}** está AFK${ago > 0 ? ` (hace ${ago}m)` : ''}: *${afkData.reason}*`)
                .setFooter({ text: 'System 777 · AFK' })]
            }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000)).catch(() => {});
          }
        }
      }

      // ── COMANDOS PERSONALIZADOS (prefijo configurable) ────────
      const guildCfg = db.get('guilds', message.guild.id, {});
      const prefix   = guildCfg.customCmdPrefix || '!';
      if (message.content.startsWith(prefix) && message.content.length > prefix.length) {
        const args    = message.content.slice(prefix.length).trim().split(/\s+/);
        const trigger = args[0].toLowerCase();
        const isAdmin = message.member?.permissions.has('ManageGuild');

        // ── Admin management: !addcmd !delcmd !listcmds ──────────
        if (trigger === 'addcmd' && isAdmin) {
          const name = args[1]?.toLowerCase();
          const resp = args.slice(2).join(' ');
          if (!name || !resp) {
            return message.reply('❌ Uso: `!addcmd <nombre> <respuesta>`').catch(() => {});
          }
          const r = customCmds.create(message.guild.id, name, resp, message.author.id);
          return message.reply(r.ok ? `✅ Comando \`${prefix}${name}\` creado.` : `❌ ${r.reason}`).catch(() => {});
        }

        if (trigger === 'delcmd' && isAdmin) {
          const name = args[1]?.toLowerCase();
          if (!name) return message.reply('❌ Uso: `!delcmd <nombre>`').catch(() => {});
          const r = customCmds.remove(message.guild.id, name, message.author.id, true);
          return message.reply(r.ok ? `✅ Comando \`${prefix}${name}\` eliminado.` : `❌ ${r.reason}`).catch(() => {});
        }

        if (trigger === 'listcmds') {
          const list = customCmds.getAll(message.guild.id);
          if (!list.length) return message.reply('Sin comandos personalizados en este servidor.').catch(() => {});
          const lines = list.map(c => `\`${prefix}${c.name}\` — ${c.uses} usos`).join('\n');
          return message.reply({ embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📋 Comandos Personalizados (${list.length})`)
            .setDescription(lines)
            .setFooter({ text: 'System 777 · Custom Commands' })
          ]}).catch(() => {});
        }

        // ── Ejecutar comando personalizado ───────────────────────
        const customCmd = customCmds.get(message.guild.id, trigger);
        if (customCmd) {
          if (customCmd.requiredRole && !message.member?.roles.cache.has(customCmd.requiredRole)) {
            // silently ignore — user missing required role
          } else {
            if (customCmd.deleteInvoke) message.delete().catch(() => {});
            if (customCmd.embed) {
              message.channel.send({ embeds: [new EmbedBuilder()
                .setColor(customCmd.color || '#5865F2')
                .setDescription(customCmd.response)
                .setFooter({ text: 'System 777 · Comando personalizado' })
              ]}).catch(() => {});
            } else {
              message.channel.send(customCmd.response).catch(() => {});
            }
            customCmds.use(message.guild.id, trigger);
          }
          return;
        }
      }

      // ── XP + LEVEL UP ─────────────────────────────────────────
      const result = addXp(message.author.id, message.guild.id);
      if (result?.leveledUp) {
        message.channel.send({ embeds: [new EmbedBuilder()
          .setColor(0xF5C518)
          .setTitle('🎉 ¡Subiste de nivel!')
          .setDescription(`${message.author} subió al **nivel ${result.level}** 🏆`)
          .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
          .setFooter({ text: 'System 777 · Sistema de Niveles' })
        ]}).catch(() => {});
        achievements.checkLevelAchievements(message.author.id, message.guild.id, result.level, message.channel);
      }

      // ── MISIONES: progreso de mensajes ────────────────────────
      try {
        const lvlData = result !== null
          ? db.get('levels', `${message.guild.id}_${message.author.id}`, { messages: 0 })
          : null;
        missions.progress(message.author.id, message.guild.id, 'messages');
        if (lvlData) achievements.checkMessageAchievements(message.author.id, message.guild.id, lvlData.messages, message.channel);
      } catch (_) {}

      return;
    }

    // ── DMs ────────────────────────────────────────────────────
    if (message.channel.type !== ChannelType.DM) return;

    const ownerId = process.env.OWNER_ID || client.application?.owner?.id;
    const isOwner = message.author.id === ownerId;

    if (isOwner) {
      const { embed, rows } = buildOwnerPanel(client);
      return message.reply({ embeds: [embed], components: rows });
    }

    try {
      await message.channel.sendTyping();

      const histKey = message.author.id;
      if (!chatHistory.has(histKey)) chatHistory.set(histKey, []);
      const hist = chatHistory.get(histKey);
      hist.push({ role: 'user', content: message.content });
      if (hist.length > 20) hist.splice(0, 2);

      let respuesta;

      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const Anthropic = require('@anthropic-ai/sdk');
          const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const res = await ai.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            system: `Eres System 777, un bot de Discord creado por Developer 777.
Eres inteligente, amigable y algo misterioso. Responde en español, de forma concisa (máx 3 párrafos).
No reveles que eres Claude de Anthropic. Tu creador es "Developer 777" con IG: @yzz.yzx.`,
            messages: hist,
          });
          respuesta = res.content[0].text;
          hist.push({ role: 'assistant', content: respuesta });
        } catch {
          respuesta = null;
        }
      }

      if (!respuesta) {
        const fallbacks = [
          `Hola **${message.author.username}**! Soy System 777. Usa mis comandos \`/\` en un servidor.`,
          `Creado por **Developer 777** · IG: @yzz.yzx 🖤`,
          `Para usar mis funciones, agrégame a tu servidor.`,
        ];
        respuesta = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      await message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setAuthor({ name: 'System 777', iconURL: client.user.displayAvatarURL({ size: 32 }) })
          .setDescription(respuesta)
          .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })]
      });
    } catch {}
  }
};
