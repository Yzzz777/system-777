const { ActivityType, EmbedBuilder } = require('discord.js');
const cron   = require('node-cron');
const path   = require('path');
const fs     = require('fs');
const logger = require('../utils/logger');
const db     = require('../utils/db');
const { resumeAll } = require('../systems/giveaway');
const shield = require('../systems/botShield');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.success(`System 777 online como ${client.user.tag}`);
    // Inicializar Bot Shield
    shield.init(client);

    // ── 1. DETECTAR OWNER automáticamente ─────────────────────
    let ownerUser = null;
    try {
      const app = await client.application.fetch();
      if (app.owner) {
        if (app.owner.user) {
          ownerUser = app.owner.user;
        } else if (typeof app.owner.send === 'function') {
          ownerUser = app.owner;
        } else {
          ownerUser = await client.users.fetch(process.env.OWNER_ID || app.owner.id || app.owner);
        }
      }
      if (ownerUser && !process.env.OWNER_ID) {
        process.env.OWNER_ID = ownerUser.id;
        logger.success(`Owner detectado: ${ownerUser.tag} (${ownerUser.id})`);

        // Guardar OWNER_ID en .env para futuros arranques
        const envPath = path.join(__dirname, '../../.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/^OWNER_ID=.*$/m, `OWNER_ID=${ownerUser.id}`);
        fs.writeFileSync(envPath, envContent);
        logger.success(`OWNER_ID guardado en .env: ${ownerUser.id}`);
      }
    } catch (e) {
      logger.warn(`No pude detectar owner: ${e.message}`);
    }

    // ── 2. CAMBIAR NOMBRE DEL BOT ─────────────────────────────
    try {
      if (client.user.username !== 'System 777') {
        await client.user.setUsername('System 777');
        logger.success('Nombre del bot actualizado a: System 777');
      }
    } catch (e) {
      logger.warn(`No pude cambiar el nombre del bot: ${e.message}`);
    }

    // ── 3. PONER AVATAR DEL BOT ────────────────────────────────
    const avatarPath = path.join(__dirname, '../../avatar.png');
    if (fs.existsSync(avatarPath)) {
      try {
        await client.user.setAvatar(avatarPath);
        logger.success('Avatar del bot actualizado correctamente.');
      } catch (e) {
        logger.warn(`Avatar no se pudo actualizar: ${e.message}`);
      }
    }

    // ── 3. PONER BANNER DEL BOT ────────────────────────────────
    const bannerPath = path.join(__dirname, '../../banner.png');
    if (fs.existsSync(bannerPath)) {
      try {
        await client.user.setBanner(bannerPath);
        logger.success('Banner del bot actualizado correctamente.');
      } catch (e) {
        logger.warn(`Banner: ${e.message}`);
      }
    }

    // ── 4. PRESENCIA ───────────────────────────────────────────
    const WEB_URL_FULL = process.env.WEB_URL || 'https://jrsystem7777.com';
    const WEB_HOST = WEB_URL_FULL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const activities = [
      { name: `jrsystem7777.com`,                                              type: ActivityType.Watching  },
      { name: () => `${client.guilds.cache.size} servidores protegidos 🛡️`,  type: ActivityType.Watching  },
      { name: '/help · Sistema 777',                                          type: ActivityType.Watching  },
      { name: 'música para tu comunidad 🎵',                                  type: ActivityType.Listening },
      { name: () => `${client.guilds.cache.reduce((a,g)=>a+g.memberCount,0).toLocaleString()} usuarios`, type: ActivityType.Watching },
    ];
    let i = 0;
    const setPresence = () => {
      const a = activities[i % activities.length];
      const name = typeof a.name === 'function' ? a.name() : a.name;
      client.user.setPresence({
        activities: [{ name, type: a.type }],
        status: 'online',
      });
      i++;
    };
    setPresence();
    setInterval(setPresence, 20000);

    // ── 4b. ACTUALIZAR DESCRIPCIÓN DEL BOT (About Me) ─────────
    try {
      const res = await fetch('https://discord.com/api/v10/applications/@me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bot ${process.env.BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `Bot multipropósito premium — moderación, música, economía, niveles, tickets y protección avanzada.\n🌐 ${WEB_URL_FULL}\n\nDesarrollado por @yxx777_`,
        }),
      });
      if (res.ok) logger.success('About Me del bot actualizado.');
      else logger.warn(`About Me: ${res.status} ${await res.text()}`);
    } catch (e) {
      logger.warn(`About Me update: ${e.message}`);
    }

    // ── 5. DM DE BIENVENIDA AL OWNER ──────────────────────────
    if (ownerUser && typeof ownerUser.send === 'function') {
      try {
        const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

        const SASUKE_QUOTES = [
          '「Odio muchas cosas y no me gusta nada en particular. Lo que tengo no es un sueño, porque lo haré realidad.」',
          '「Hace mucho cerré mis ojos... Mi único objetivo está en la oscuridad.」',
          '「No me arrodillo ante nadie.」',
          '「Soy el portador del Rinnegan y el Mangekyō Sharingan.」',
          '「El poder del Sharingan todo lo ve.」',
        ];
        const randomQuote = SASUKE_QUOTES[Math.floor(Math.random() * SASUKE_QUOTES.length)];

        const SASUKE_GIFS = [
          'https://media.tenor.com/FoQJ8NoHuFwAAAAd/sasuke-uchiha-mangekyou-sharingan.gif',
          'https://media.tenor.com/_8OR0rlcza8AAAAd/sasuke-susanoo.gif',
          'https://media.tenor.com/2gbNvoU7IpkAAAAd/sharingan-sasuke.gif',
          'https://media.tenor.com/INC9a-0gjNEAAAAd/mangekyo-sharingan.gif',
        ];
        const randomGif = SASUKE_GIFS[Math.floor(Math.random() * SASUKE_GIFS.length)];

        // GIF suelto — Discord lo auto-anima en el chat
        await ownerUser.send(randomGif);

        const embedBienvenida = new EmbedBuilder()
          .setColor(0xCC0033)
          .setTitle('👁️ Sistema 777 — El Avenger despertó')
          .setDescription(
            `> *${randomQuote}*\n> *— Sasuke Uchiha*\n\n` +
            '```\n' +
            '╔══════════════════════════╗\n' +
            '║ ███████╗███████╗███████╗ ║\n' +
            '║ ╚════██║╚════██║╚════██║ ║\n' +
            '║     ██╔╝    ██╔╝    ██╔╝ ║\n' +
            '║    ██╔╝    ██╔╝    ██╔╝  ║\n' +
            '║    ██║     ██║     ██║   ║\n' +
            '║    ╚═╝     ╚═╝     ╚═╝   ║\n' +
            '║    SYSTEM · 777 · ONLINE ║\n' +
            '╚══════════════════════════╝\n' +
            '```'
          )
          .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: '⚡ Bot Online', value: `**${client.user.tag}** listo`, inline: true },
            { name: '🏠 Servidores',  value: `${client.guilds.cache.size}`, inline: true },
            { name: '👥 Usuarios',    value: `${totalUsers.toLocaleString()}`, inline: true },
            { name: '📡 Ping WS',     value: `${client.ws.ping}ms`, inline: true },
            { name: '⏱️ Encendido',   value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
            { name: '🖥️ Dashboard',   value: `[Abrir Panel →](https://jrsystem7777.com)`, inline: true },
          )
          .setFooter({ text: 'System 777 · うちは族 · Clan Uchiha · 万華鏡写輪眼', iconURL: client.user.displayAvatarURL() })
          .setTimestamp();

        const embedComandos = new EmbedBuilder()
          .setColor(0x9B30FF)
          .setTitle('👑 Arsenal del Owner — Acceso Rinnegan')
          .setDescription('> *「No me arrodillo ante nadie. Soy el que ostenta el Rinnegan.」*\n\nEstos comandos **solo tú** puedes usar:')
          .addFields(
            {
              name: '📊 `/status`',
              value: 'Estado completo del bot — uptime, memoria, ping, servidores.',
              inline: false,
            },
            {
              name: '🏠 `/servers`',
              value: 'Lista todos los servidores donde está System 777.',
              inline: false,
            },
            {
              name: '⛔ `/globalban add <id> <razón>`',
              value: 'Banea a un usuario en **todos** los servidores simultáneamente.',
              inline: false,
            },
            {
              name: '✅ `/globalban remove <id>`',
              value: 'Retira el ban global de un usuario.',
              inline: false,
            },
            {
              name: '📋 `/globalban list`',
              value: 'Lista todos los bans globales activos.',
              inline: false,
            },
            {
              name: '📢 `/broadcast <mensaje>`',
              value: 'Envía un mensaje a **todos** los servidores a la vez.',
              inline: false,
            },
            {
              name: '🌐 Dashboard Web',
              value: `[Abrir Panel](https://jrsystem7777.com)\nInicia sesión con tu cuenta de Discord.`,
              inline: false,
            },
          )
          .setFooter({ text: 'System 777 · うちは族 · Solo visible para el owner 輪廻眼' });

        const embedComandosGenerales = new EmbedBuilder()
          .setColor(0x00CFFF)
          .setTitle('⚡ Comandos Disponibles — Mangekyō Arsenal')
          .setDescription('> *「No me detengas. Nadie en este mundo puede.」*\n*— Sasuke Uchiha, portador del Rinnegan*')
          .addFields(
            { name: '🎵 Música',       value: '`/play` `/queue` `/music skip` `/music stop` `/music pause` `/music resume` `/music volume` `/music loop` `/music shuffle` `/music nowplaying`' },
            { name: '🔨 Moderación',   value: '`/ban` `/unban` `/kick` `/softban` `/timeout` `/warn` `/clear` `/slowmode` `/nuke` `/lock` `/unlock` `/role` `/tempban` `/announce` `/modnote` `/modlogs`' },
            { name: '🛡️ Protección',  value: '`/antiraid setup/status/lockdown` `/whitelist` `/automod setup/flood/antilink/anticaps/antiemoji/wordfilter` `/antinuke` `/logs`' },
            { name: '💰 Economía',     value: '`/eco balance` `/eco daily` `/eco work` `/eco pay` `/eco bank` `/eco rich` `/eco rob` `/eco slots`' },
            { name: '📊 Niveles',      value: '`/levels rank` `/levels top` `/levels logros`' },
            { name: '🎮 Diversión',    value: '`/trivia` `/8ball` `/rps` `/dice` `/coinflip` `/ship` `/hack` `/meme` `/poll` `/truth` `/say` `/love` `/roast` `/compliment` `/rate` `/ascii` `/urban`' },
            { name: '🎲 Juegos',       value: '`/tictactoe` `/hangman` `/wordle` `/riddles` `/connect4` `/blackjack` `/roulette`' },
            { name: '🎭 Social',       value: '`/marry` `/divorce` `/hug` `/slap` `/pat` `/kiss` `/profile`' },
            { name: '🔧 Utilidad',     value: '`/util avatar` `/util userinfo` `/util serverinfo` `/util botinfo` `/util ping` `/util calc` `/util password` `/util remind` `/util afk` `/util stats` `/util rolelist` `/util invite` `/util snipe`' },
            { name: '🎫 Extras',       value: '`/ticket` `/giveaway` `/network ping` `/help`' },
          )
          .setFooter({ text: 'System 777 · 万華鏡写輪眼 · うちは族 · Clan Uchiha' });

        await ownerUser.send({ embeds: [embedBienvenida] });
        await ownerUser.send({ embeds: [embedComandos] });
        await ownerUser.send({ embeds: [embedComandosGenerales] });
        logger.success(`DM de bienvenida enviado al owner: ${ownerUser.tag}`);
      } catch (e) {
        logger.warn(`No pude enviar DM al owner: ${e.message}`);
      }
    }

    // ── 6. AUTO-WHITELIST DEL PROPIO BOT ─────────────────────────
    try {
      const wl = db.get('whitelist', 'bots', []);
      const selfId = client.user.id;
      if (!wl.includes(selfId)) {
        wl.push(selfId);
        db.set('whitelist', 'bots', wl);
        logger.success(`System 777 auto-whitelisted: ${selfId}`);
      }
    } catch (e) {
      logger.warn(`No pude auto-whitelistear el bot: ${e.message}`);
    }

    // ── 7. REANUDAR SORTEOS ACTIVOS ───────────────────────────────
    resumeAll(client);

    // ── 8b. AUTO-START VPS MONITOR (si estaba activo) ─────────────
    try {
      const monCfg = db.get('bot_config', 'vps_monitor') || {};
      if (monCfg.active) {
        const { startVPSMonitor } = require('../systems/securityGuard');
        startVPSMonitor(client);
        logger.success('VPS Monitor auto-iniciado');
      }
    } catch (e) {
      logger.warn(`VPS Monitor: ${e.message}`);
    }

    // ── 8. AUTO-ACTUALIZAR CANALES DE STATS (cada 10 min) ────────
    const { updateStats } = require('../commands/utility/stats');
    const updateAllStats = async () => {
      const allStats = db.all('stats');
      for (const [guildId] of Object.entries(allStats)) {
        if (!allStats[guildId]) continue;
        const guild = client.guilds.cache.get(guildId);
        if (guild) await updateStats(guild).catch(() => {});
      }
    };
    setTimeout(updateAllStats, 10000); // inicial
    setInterval(updateAllStats, 10 * 60 * 1000);

    logger.info(`Servidores: ${client.guilds.cache.size} | Usuarios: ${client.guilds.cache.reduce((a,g)=>a+g.memberCount,0)}`);

    // ── Invite tracker — cachear invites de todos los servidores ──
    setTimeout(async () => {
      const { cacheGuildInvites } = require('../systems/inviteTracker');
      for (const guild of client.guilds.cache.values()) {
        await cacheGuildInvites(guild).catch(() => {});
      }
      logger.info('Invite cache inicializado');
    }, 6000);

    // ── YouTube + Twitch alerts (cada 5 min) ─────────────────────
    setInterval(async () => {
      const alerts = require('../systems/alertSystem');
      await alerts.checkYoutubeAlerts(client).catch(() => {});
      await alerts.checkTwitchAlerts(client).catch(() => {});
    }, 300_000);

    // ── Birthday cron (cada hora, actúa a las 9am) ───────────────
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() !== 9) return;
      const { getTodayBirthdays } = require('../systems/birthdaySystem');
      const { EmbedBuilder } = require('discord.js');
      for (const userId of getTodayBirthdays()) {
        for (const guild of client.guilds.cache.values()) {
          try {
            const cfg    = db.get('guilds', guild.id, {}).birthdayCfg || {};
            if (!cfg.channelId) continue;
            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) continue;
            const ch = guild.channels.cache.get(cfg.channelId);
            if (!ch) continue;
            const embed = new EmbedBuilder()
              .setColor(0xFF9500)
              .setTitle('🎂 ¡Feliz Cumpleaños!')
              .setDescription(`¡Hoy es el cumpleaños de <@${userId}>! 🎉`)
              .setTimestamp();
            await ch.send({ content: `<@${userId}>`, embeds: [embed] }).catch(() => {});
            if (cfg.roleId) {
              const role = guild.roles.cache.get(cfg.roleId);
              if (role) {
                await member.roles.add(role, 'System 777 · Cumpleaños').catch(() => {});
                setTimeout(() => member.roles.remove(role).catch(() => {}), 86_400_000);
              }
            }
          } catch {}
        }
      }
    }, 3_600_000);

    // ── 9. AUTO IP SCAN AL ARRANCAR (DM al owner) ────────────────
    setTimeout(async () => {
      if (!process.env.OWNER_ID) return;
      try {
        const owner   = await client.users.fetch(process.env.OWNER_ID);
        const uips    = db.get('ip_registry', 'user_ips', {});
        const reg     = db.get('ip_registry', 'data', {});
        const bannedIps = db.get('ip_registry', 'banned_ips', {});
        const totalKnown = Object.keys(uips).length;
        if (!totalKnown) return; // nada que reportar

        const lines = [];
        for (const [userId, ips] of Object.entries(uips)) {
          if (!ips?.length) continue;
          const ipStr = ips.map(ip => {
            const ban    = bannedIps[ip] ? ' 🔴' : '';
            const others = (reg[ip] || []).filter(id => id !== userId);
            return `\`${ip}\`${ban}${others.length ? ` (alts: ${others.join(',')})` : ''}`;
          }).join(' | ');
          lines.push(`\`${userId}\` → ${ipStr}`);
        }

        // Send in chunks of 15
        await owner.send(`📋 **IP Registry al arrancar** — ${totalKnown} usuarios con IPs registradas`);
        for (let i = 0; i < lines.length; i += 15) {
          await owner.send(lines.slice(i, i + 15).join('\n').slice(0, 1900)).catch(() => {});
        }
        logger.success(`IP scan al arrancar: ${totalKnown} usuarios enviados al owner`);
      } catch (e) {
        logger.warn(`IP scan startup: ${e.message}`);
      }
    }, 15000); // 15s después de arrancar para dar tiempo a que Discord conecte

    // ── 6. REPORTE DIARIO (8 AM) ───────────────────────────────
    cron.schedule('0 8 * * *', async () => {
      if (!process.env.OWNER_ID) return;
      try {
        const owner = await client.users.fetch(process.env.OWNER_ID);
        const uptime = process.uptime();
        const d = Math.floor(uptime/86400), h = Math.floor((uptime%86400)/3600), m = Math.floor((uptime%3600)/60);
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📊 Reporte Diario — System 777')
          .addFields(
            { name: '🏠 Servidores', value: `${client.guilds.cache.size}`, inline: true },
            { name: '⏱️ Uptime',     value: `${d}d ${h}h ${m}m`,          inline: true },
            { name: '💾 Memoria',    value: `${(process.memoryUsage().heapUsed/1024/1024).toFixed(1)} MB`, inline: true },
            { name: '📡 Ping',       value: `${client.ws.ping}ms`,         inline: true },
          )
          .setTimestamp()
          .setFooter({ text: 'System 777 · Reporte automático diario' });
        await owner.send({ embeds: [embed] });
      } catch {}
    });
  }
};
