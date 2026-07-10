const express = require('express');
const session = require('express-session');
const path    = require('path');
const https   = require('https');
const { exec } = require('child_process');
const db      = require('../src/utils/db');

// ── Discord API helpers ───────────────────────────────────────────────────────
function discordGet(endpoint, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'discord.com', path: `/api/v10${endpoint}`, method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'System777Dashboard/1.0' },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function discordExchange(code, callbackUrl) {
  const body = new URLSearchParams({
    client_id:     process.env.CLIENT_ID     || '',
    client_secret: process.env.CLIENT_SECRET || '',
    grant_type:    'authorization_code',
    code,
    redirect_uri:  callbackUrl,
  }).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'discord.com', path: '/api/v10/oauth2/token', method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'System777Dashboard/1.0',
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = function startDashboard(client) {
  const app    = express();
  const PORT   = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
  const SECRET = process.env.DASHBOARD_SECRET || 'sisten777secret';

  // URL fija calculada UNA vez al arrancar — debe ser EXACTA en Discord Dev Portal
  const CALLBACK_URL = (() => {
    if (process.env.DISCORD_CALLBACK_URL) return process.env.DISCORD_CALLBACK_URL;
    if (process.env.NGROK_DOMAIN) return `https://${process.env.NGROK_DOMAIN}/auth/discord/callback`;
    return `http://localhost:${PORT}/auth/discord/callback`;
  })();

  // ── CORS ────────────────────────────────────────────────────────────────────
  const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: SECRET, resave: false, saveUninitialized: false,
    cookie: {
      maxAge:   7 * 86400000,
      httpOnly: true,
      sameSite: 'lax',
      secure:   false,   // VPS runs HTTP — secure:true blocks cookie on HTTP
    },
  }));
  app.set('trust proxy', 1);
  app.use(express.static(path.join(__dirname, 'public')));

  // ── Middleware ──────────────────────────────────────────────────────────────
  function auth(req, res, next) {
    if (req.session.user) return next();
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      return (async () => {
        try {
          const [user, guildsRaw] = await Promise.all([
            discordGet('/users/@me', token),
            discordGet('/users/@me/guilds', token),
          ]);
          const ownerId = process.env.OWNER_ID;
          const isOwner = user.id === ownerId;
          const guilds = (Array.isArray(guildsRaw) ? guildsRaw : []).map(g => ({
            id: g.id, name: g.name,
            icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
            permissions: g.permissions,
            isAdmin: isOwner || (parseInt(g.permissions) & 0x8) === 0x8,
            inBot: client.guilds.cache.has(g.id),
          })).filter(g => g.isAdmin);
          req.session.user = { id: user.id, username: user.username, discriminator: user.discriminator,
            avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
            email: user.email };
          req.session.guilds = guilds;
          req.session.isOwner = isOwner;
          return next();
        } catch (e) {
          return res.status(401).json({ ok: false, msg: 'Token invalido' });
        }
      })();
    }
    res.status(401).json({ ok: false, msg: 'No autenticado' });
  }

  function ownerOnly(req, res, next) {
    if (req.session.isOwner) return next();
    res.status(403).json({ ok: false, msg: 'Solo el owner puede hacer esto' });
  }

  function canManageGuild(req, res, next) {
    if (req.session.isOwner) return next();
    const g = (req.session.guilds || []).find(x => x.id === req.params.id);
    if (g && (parseInt(g.permissions) & 0x8) === 0x8) return next();
    res.status(403).json({ ok: false, msg: 'Sin permisos en este servidor' });
  }

  // ── Auth: Discord OAuth ─────────────────────────────────────────────────────
  app.get('/auth/discord', (req, res) => {
    if (!process.env.CLIENT_SECRET) {
      return res.redirect('/?error=no_secret');
    }
    const params = new URLSearchParams({
      client_id:     process.env.CLIENT_ID,
      redirect_uri:  CALLBACK_URL,
      response_type: 'code',
      scope:         'identify guilds',
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  app.get('/auth/discord/callback', async (req, res) => {
    const { code, error } = req.query;
    if (error || !code) return res.redirect('/?error=denied');
    try {
      const tokens = await discordExchange(code, CALLBACK_URL);
      if (!tokens.access_token) return res.redirect('/?error=auth_failed');

      const [user, guildsRaw] = await Promise.all([
        discordGet('/users/@me', tokens.access_token),
        discordGet('/users/@me/guilds', tokens.access_token),
      ]);

      const ownerId = process.env.OWNER_ID;
      const isOwner = user.id === ownerId;

      const guilds = (Array.isArray(guildsRaw) ? guildsRaw : []).map(g => ({
        id:          g.id,
        name:        g.name,
        icon:        g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        permissions: g.permissions,
        isAdmin:     isOwner || (parseInt(g.permissions) & 0x8) === 0x8,
        inBot:       client.guilds.cache.has(g.id),
      })).filter(g => g.isAdmin);

      req.session.user    = {
        id:            user.id,
        username:      user.username,
        discriminator: user.discriminator,
        avatar:        user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
        email:         user.email,
      };
      req.session.guilds  = guilds;
      req.session.isOwner = isOwner;

      res.redirect('/');
    } catch (e) {
      res.redirect('/?error=auth_error');
    }
  });

  app.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });

  // Password fallback (when CLIENT_SECRET not configured)
  app.post('/api/login', (req, res) => {
    if (req.body.secret === SECRET) {
      req.session.user    = { id: process.env.OWNER_ID, username: 'Admin', discriminator: '0', avatar: null };
      req.session.isOwner = true;
      req.session.guilds  = client.guilds.cache.map(g => ({
        id: g.id, name: g.name,
        icon: g.iconURL(),
        permissions: '8',
        isAdmin: true, inBot: true,
      }));
      return res.json({ ok: true });
    }
    res.status(401).json({ ok: false, msg: 'Clave incorrecta' });
  });

  // ── Health check (Railway) ──────────────────────────────────────────────────
  app.get('/health', (req, res) => {
    res.json({
      ok: true,
      bot: client.ws?.status === 0,
      uptime: process.uptime(),
      ts: Date.now(),
    });
  });

  // ── PUBLIC API (sin login, solo lectura) ─────────────────────────────────
  // Rate limit ligero en memoria
  const rlMap = new Map();
  function publicRL(req, res, next) {
    const ip  = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const e   = rlMap.get(ip) || { count: 0, reset: now + 60_000 };
    if (now > e.reset) { e.count = 0; e.reset = now + 60_000; }
    e.count++;
    rlMap.set(ip, e);
    if (e.count > 60) return res.status(429).json({ error: 'Rate limit' });
    next();
  }

  app.get('/api/public/stats', publicRL, (req, res) => {
    res.json({
      tag:      client.user?.tag ?? 'System 777',
      avatar:   client.user?.displayAvatarURL({ size: 256 }) ?? '',
      guilds:   client.guilds.cache.size,
      users:    client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
      ping:     client.ws.ping,
      uptime:   process.uptime(),
      memory:   (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
      online:   client.ws.status === 0,
      commands: client.commands?.size ?? 0,
    });
  });

  app.get('/api/public/guilds', publicRL, (req, res) => {
    res.json(client.guilds.cache.map(g => ({
      id:      g.id,
      name:    g.name,
      icon:    g.iconURL(),
      members: g.memberCount,
    })));
  });

  // ── Config pública (callback URL para mostrar en UI) ───────────────────────
  app.get('/api/config', (req, res) => {
    res.json({
      callbackUrl:     CALLBACK_URL,
      hasClientSecret: !!process.env.CLIENT_SECRET,
      clientId:        process.env.CLIENT_ID || '',
    });
  });

  // ── User API ────────────────────────────────────────────────────────────────
  app.get('/api/me', auth, (req, res) => {
    if (!req.session.user) return res.json({ user: null, guilds: [], isOwner: false });
    res.json({
      user:     req.session.user,
      guilds:   req.session.guilds || [],
      isOwner:  req.session.isOwner || false,
      clientId: process.env.CLIENT_ID || '',
      hasClientSecret: !!process.env.CLIENT_SECRET,
    });
  });

  // ── Guild API ───────────────────────────────────────────────────────────────
  // ── Public guild data (channels + roles + config) ────────────────────────
  app.get('/api/public/guild/:id', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });

    const config = db.get('guilds', req.params.id, {});
    const ticketConfig = db.get('ticketConfig', req.params.id, {});

    const channels = [...guild.channels.cache.values()]
      .filter(c => [0, 2, 4, 5].includes(c.type))
      .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
      .map(c => ({ id: c.id, name: c.name, type: c.type, parentId: c.parentId }));

    const roles = [...guild.roles.cache.values()]
      .filter(r => !r.managed && r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

    const categories = [...guild.channels.cache.values()]
      .filter(c => c.type === 4)
      .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
      .map(c => ({ id: c.id, name: c.name }));

    res.json({
      ok: true, config, channels, roles, categories,
      guild: {
        id: guild.id, name: guild.name, icon: guild.iconURL(),
        memberCount: guild.memberCount, ownerId: guild.ownerId,
      },
    });
  });

  // ── Public save configs (no auth required) ──────────────────────────────
  function publicSaveConfig(guildId, key, value) {
    const cfg = db.get('guilds', guildId, {});
    cfg[key] = value;
    db.set('guilds', guildId, cfg);
    return cfg[key];
  }

  app.post('/api/public/guild/:id/modules', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    publicSaveConfig(req.params.id, 'modules', req.body.modules || {});
    res.json({ ok: true });
  });

  app.post('/api/public/guild/:id/welcome', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    publicSaveConfig(req.params.id, 'welcome', req.body);
    res.json({ ok: true });
  });

  app.post('/api/public/guild/:id/goodbye', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    publicSaveConfig(req.params.id, 'goodbye', req.body);
    res.json({ ok: true });
  });

  app.post('/api/public/guild/:id/autorole', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    publicSaveConfig(req.params.id, 'autorole', req.body.roleId || '');
    res.json({ ok: true });
  });

  app.post('/api/public/guild/:id/logs', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    publicSaveConfig(req.params.id, 'logs', req.body);
    res.json({ ok: true });
  });

  app.post('/api/public/guild/:id/tickets/setup', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    const d = req.body;
    const cfg = db.get('ticketConfig', req.params.id, {});
    if (d.channelId) cfg.panelChannel = d.channelId;
    if (d.supportRoleId) cfg.supportRole = d.supportRoleId;
    if (d.logChannelId) cfg.logChannel = d.logChannelId;
    if (d.categoryId) cfg.ticketCategory = d.categoryId;
    if (d.title) cfg.panelTitle = d.title;
    if (d.description) cfg.panelDescription = d.description;
    if (d.color) cfg.panelColor = d.color;
    if (d.prefix) cfg.prefix = d.prefix;
    if (d.maxTickets) cfg.maxPerUser = d.maxTickets;
    if (d.welcomeMsg) cfg.welcomeMessage = d.welcomeMsg;
    if (d.categories) cfg.categories = d.categories;
    if (!cfg.categories) cfg.categories = [];
    db.set('ticketConfig', req.params.id, cfg);
    res.json({ ok: true });
  });

  app.post('/api/public/guild/:id/protection', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    publicSaveConfig(req.params.id, 'protection', req.body);
    res.json({ ok: true });
  });

  app.post('/api/public/guild/:id/levels', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    publicSaveConfig(req.params.id, 'levels', req.body);
    res.json({ ok: true });
  });

  app.post('/api/public/guild/:id/economy', (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    publicSaveConfig(req.params.id, 'economy', req.body);
    res.json({ ok: true });
  });

  // ── Public Action Endpoints ─────────────────────────────────────────────
  app.post('/api/public/guild/:id/tickets/panel', async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    const cfg = db.get('ticketConfig', req.params.id, {});
    const ch = guild.channels.cache.get(cfg.panelChannel);
    if (!ch) return res.status(400).json({ ok: false, msg: 'Canal de tickets no configurado. Configura el canal del panel primero.' });
    try {
      const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setTitle(cfg.panelTitle || `🎫 Sistema de Soporte — ${guild.name}`)
        .setDescription(cfg.panelDescription || cfg.panelDesc || 'Selecciona el tipo de ticket.')
        .setColor(cfg.panelColor || '#5865F2')
        .setFooter({ text: 'System 777 · Tickets' });
      const cats = (cfg.categories || []).map(c => ({ label: c.label || c.name, value: c.id, emoji: c.emoji || '🎫', description: c.description || '' }));
      if (cats.length === 0) cats.push({ label: 'General', value: 'general', emoji: '🎫', description: 'Soporte general' });
      const select = new StringSelectMenuBuilder()
        .setCustomId('tkt_select')
        .setPlaceholder('Selecciona una categoría...')
        .addOptions(cats);
      const row = new ActionRowBuilder().addComponents(select);
      await ch.send({ embeds: [embed], components: [row] });
      res.json({ ok: true, msg: 'Panel enviado a ' + ch.name });
    } catch (e) {
      res.status(500).json({ ok: false, msg: 'Error: ' + e.message });
    }
  });

  app.post('/api/public/guild/:id/verify/setup', async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    const { channelId, roleId, customMsg } = req.body;
    const ch = guild.channels.cache.get(channelId);
    if (!ch) return res.status(400).json({ ok: false, msg: 'Canal no encontrado' });
    try {
      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const embed = new EmbedBuilder()
        .setTitle('🔐 Verificación')
        .setDescription(customMsg || 'Haz clic en el botón para verificar tu cuenta.')
        .setColor('#5865F2')
        .setFooter({ text: 'System 777 · Verificación' });
      const btn = new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Verificarme')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');
      const row = new ActionRowBuilder().addComponents(btn);
      await ch.send({ embeds: [embed], components: [row] });
      publicSaveConfig(req.params.id, 'verification', { active: true, channelId, roleId, customMsg });
      res.json({ ok: true, msg: 'Panel de verificación enviado' });
    } catch (e) {
      res.status(500).json({ ok: false, msg: 'Error: ' + e.message });
    }
  });

  app.post('/api/public/guild/:id/broadcast', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok: false, msg: 'Mensaje vacío' });
    let count = 0;
    for (const [, guild] of client.guilds.cache) {
      const ch = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased());
      if (ch) { try { await ch.send(message); count++; } catch {} }
    }
    res.json({ ok: true, msg: `Mensaje enviado a ${count} servidores` });
  });

  // ── Guild API ────────────────────────────────────────────────────────────
  app.get('/api/guild/:id', auth, canManageGuild, (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });

    const config = db.get('guilds', req.params.id, {});

    const channels = [...guild.channels.cache.values()]
      .filter(c => [0, 2, 4, 5].includes(c.type))
      .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
      .map(c => ({ id: c.id, name: c.name, type: c.type, parentId: c.parentId }));

    const roles = [...guild.roles.cache.values()]
      .filter(r => !r.managed && r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

    const categories = [...guild.channels.cache.values()]
      .filter(c => c.type === 4)
      .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
      .map(c => ({ id: c.id, name: c.name }));

    res.json({
      ok: true, config, ticketConfig, channels, roles, categories,
      guild: {
        id: guild.id, name: guild.name, icon: guild.iconURL(),
        memberCount: guild.memberCount, ownerId: guild.ownerId,
        channelCount: guild.channels.cache.size,
        roleCount:    guild.roles.cache.size,
      },
    });
  });

  // ── Guild API ────────────────────────────────────────────────────────────
  app.get('/api/guild/:id', auth, canManageGuild, (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });

    const config = db.get('guilds', req.params.id, {});
    config.ticketCfg = {
      ...(config.ticketCfg || {}),
      panelChannel, supportRole, logChannel, discordCategory,
      panelTitle, panelDesc, color, panelImage,
      channelPrefix, max, ping, dm_transcript, welcome_msg,
      ...(Array.isArray(categories) ? { categories } : {}),
    };
    db.set('guilds', req.params.id, config);
    res.json({ ok: true });
  });

  // ── Ticket: post panel ──────────────────────────────────────────────────────
  app.post('/api/guild/:id/tickets/panel', auth, canManageGuild, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en el servidor' });

    const config = db.get('guilds', req.params.id, {});
    const cfg = config.ticketCfg || {};
    if (!cfg.panelChannel) return res.status(400).json({ ok: false, msg: 'Configura el canal del panel primero' });

    const channel = guild.channels.cache.get(cfg.panelChannel);
    if (!channel) return res.status(404).json({ ok: false, msg: 'Canal no encontrado' });

    try {
      const tkt = require('../src/systems/ticketSystem');
      const { embeds, components } = tkt.buildPanel(cfg, guild);
      await channel.send({ embeds, components });
      res.json({ ok: true, msg: `✅ Panel enviado a #${channel.name}` });
    } catch (e) {
      res.status(500).json({ ok: false, msg: e.message });
    }
  });

  // ── Ticket: add/update category ─────────────────────────────────────────────
  app.post('/api/guild/:id/tickets/category', auth, canManageGuild, (req, res) => {
    const { id: catId, label, emoji, description } = req.body;
    if (!catId || !label || !emoji || !description)
      return res.status(400).json({ ok: false, msg: 'Faltan campos (id, label, emoji, description)' });

    const config = db.get('guilds', req.params.id, {});
    if (!config.ticketCfg) config.ticketCfg = {};
    if (!Array.isArray(config.ticketCfg.categories)) config.ticketCfg.categories = [];

    const idx = config.ticketCfg.categories.findIndex(c => c.id === catId);
    const cat = { id: catId, label, emoji, description };
    if (idx >= 0) config.ticketCfg.categories[idx] = cat;
    else config.ticketCfg.categories.push(cat);

    db.set('guilds', req.params.id, config);
    res.json({ ok: true, categories: config.ticketCfg.categories });
  });

  // ── Ticket: delete category ─────────────────────────────────────────────────
  app.delete('/api/guild/:id/tickets/category/:catId', auth, canManageGuild, (req, res) => {
    const config = db.get('guilds', req.params.id, {});
    if (config.ticketCfg?.categories) {
      config.ticketCfg.categories = config.ticketCfg.categories.filter(c => c.id !== req.params.catId);
      db.set('guilds', req.params.id, config);
    }
    res.json({ ok: true });
  });

  // ── Ticket: update config options ───────────────────────────────────────────
  app.put('/api/guild/:id/tickets/config', auth, canManageGuild, (req, res) => {
    const config = db.get('guilds', req.params.id, {});
    if (!config.ticketCfg) config.ticketCfg = {};
    const allowed = ['color','ping','max','dm_transcript','welcome_msg','auto_close','extra_role','channelPrefix'];
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) config.ticketCfg[k] = v;
    }
    db.set('guilds', req.params.id, config);
    res.json({ ok: true, ticketCfg: config.ticketCfg });
  });

  // ── Welcome config ──────────────────────────────────────────────────────────
  app.post('/api/guild/:id/welcome', auth, canManageGuild, (req, res) => {
    const config = db.get('guilds', req.params.id, {});
    config.welcome = { ...(config.welcome || {}), ...req.body };
    db.set('guilds', req.params.id, config);
    res.json({ ok: true });
  });

  // ── Goodbye config ──────────────────────────────────────────────────────────
  app.post('/api/guild/:id/goodbye', auth, canManageGuild, (req, res) => {
    const config = db.get('guilds', req.params.id, {});
    config.goodbye = { ...(config.goodbye || {}), ...req.body };
    db.set('guilds', req.params.id, config);
    res.json({ ok: true });
  });

  // ── Autorole config ─────────────────────────────────────────────────────────
  app.post('/api/guild/:id/autorole', auth, canManageGuild, (req, res) => {
    const config = db.get('guilds', req.params.id, {});
    config.autorole = req.body.roleId || null;
    db.set('guilds', req.params.id, config);
    res.json({ ok: true });
  });

  // ── Logs config ─────────────────────────────────────────────────────────────
  app.post('/api/guild/:id/logs', auth, canManageGuild, (req, res) => {
    const config = db.get('guilds', req.params.id, {});
    config.logChannels = { ...(config.logChannels || {}), ...req.body };
    db.set('guilds', req.params.id, config);
    res.json({ ok: true });
  });

  // ── Protection config ────────────────────────────────────────────────────────
  app.post('/api/guild/:id/protection', auth, canManageGuild, (req, res) => {
    const config = db.get('guilds', req.params.id, {});
    config.protection = req.body;
    db.set('guilds', req.params.id, config);
    res.json({ ok: true });
  });

  // ── Levels config ────────────────────────────────────────────────────────────
  app.post('/api/guild/:id/levels', auth, canManageGuild, (req, res) => {
    const config = db.get('guilds', req.params.id, {});
    config.levelsConfig = req.body;
    db.set('guilds', req.params.id, config);
    res.json({ ok: true });
  });

  app.get('/api/guild/:id/levels/top', auth, canManageGuild, (req, res) => {
    const gid = req.params.id;
    const all = db.all('levels');
    const prefix = `${gid}_`;
    const entries = Object.entries(all)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => ({ userId: k.replace(prefix, ''), level: v.level || 0, xp: v.xp || 0 }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);
    res.json({ ok: true, top: entries });
  });

  // ── Economy config ───────────────────────────────────────────────────────────
  app.post('/api/guild/:id/economy', auth, canManageGuild, (req, res) => {
    const config = db.get('guilds', req.params.id, {});
    config.economyConfig = req.body;
    db.set('guilds', req.params.id, config);
    res.json({ ok: true });
  });

  app.get('/api/guild/:id/economy/top', auth, canManageGuild, (req, res) => {
    const gid = req.params.id;
    const all = db.all('economy');
    const prefix = `${gid}_`;
    const entries = Object.entries(all)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => ({ userId: k.replace(prefix, ''), balance: (v.balance || 0) + (v.bank || 0) }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);
    res.json({ ok: true, top: entries });
  });

  // ── Quick mod action ─────────────────────────────────────────────────────────
  app.post('/api/guild/:id/action', auth, canManageGuild, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    const { action, userId, reason, duration, deleteDays } = req.body;
    if (!action || !userId) return res.status(400).json({ ok: false, msg: 'Faltan parámetros' });
    try {
      if (action === 'ban') {
        await guild.bans.create(userId, { reason: reason || 'Dashboard', deleteMessageSeconds: (deleteDays || 0) * 86400 });
        return res.json({ ok: true, msg: `✅ Baneado` });
      }
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return res.status(404).json({ ok: false, msg: 'Miembro no encontrado en el servidor' });
      if (action === 'kick') { await member.kick(reason || 'Dashboard'); return res.json({ ok: true, msg: `✅ Kickeado` }); }
      if (action === 'timeout') {
        const ms = (parseInt(duration) || 10) * 60 * 1000;
        await member.timeout(ms, reason || 'Dashboard');
        return res.json({ ok: true, msg: `✅ Timeout ${duration || 10}m aplicado` });
      }
      if (action === 'warn') {
        const warns = db.get('warns', guild.id, {});
        if (!warns[userId]) warns[userId] = [];
        warns[userId].push({ reason: reason || 'Dashboard', by: 'Dashboard', ts: Date.now() });
        db.set('warns', guild.id, warns);
        return res.json({ ok: true, msg: `⚠️ Advertencia registrada (total: ${warns[userId].length})` });
      }
      res.status(400).json({ ok: false, msg: 'Acción no válida' });
    } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
  });

  // ── Tickets: list open tickets in guild ─────────────────────────────────────
  app.get('/api/guild/:id/tickets/list', auth, canManageGuild, (req, res) => {
    const tickets = db.get('tickets', req.params.id, {});
    res.json({ ok: true, tickets });
  });

  // ── Owner: Bot power control ────────────────────────────────────────────────
  app.get('/api/power', auth, ownerOnly, (req, res) => {
    const online = client.ws && client.ws.status === 0;
    res.json({ online, status: client.ws?.status ?? -1, ping: client.ws?.ping ?? -1 });
  });

  app.post('/api/power', auth, ownerOnly, async (req, res) => {
    const { action } = req.body;
    try {
      if (action === 'stop') {
        await client.destroy();
        return res.json({ ok: true, msg: 'Bot desconectado de Discord.' });
      }
      if (action === 'start') {
        await client.login(process.env.BOT_TOKEN);
        return res.json({ ok: true, msg: 'Bot reconectado.' });
      }
      if (action === 'restart') {
        exec('pm2 restart system-777', (err) => {
          if (err) {
            client.destroy().then(() => setTimeout(() => client.login(process.env.BOT_TOKEN), 3000));
            return res.json({ ok: true, msg: 'Reiniciando (soft)...' });
          }
          res.json({ ok: true, msg: 'PM2 restart iniciado.' });
        });
        return;
      }
      res.status(400).json({ ok: false, msg: 'Acción inválida.' });
    } catch (e) {
      res.status(500).json({ ok: false, msg: e.message });
    }
  });

  // ── Owner: Stats ────────────────────────────────────────────────────────────
  app.get('/api/stats', auth, ownerOnly, (req, res) => {
    res.json({
      tag:      client.user?.tag ?? '...',
      avatar:   client.user?.displayAvatarURL() ?? '',
      guilds:   client.guilds.cache.size,
      users:    client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
      ping:     client.ws.ping,
      uptime:   process.uptime(),
      memory:   (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
      online:   client.ws.status === 0,
    });
  });

  // ── Owner: All guilds ───────────────────────────────────────────────────────
  app.get('/api/guilds', auth, ownerOnly, (req, res) => {
    res.json(client.guilds.cache.map(g => ({
      id:      g.id, name: g.name, icon: g.iconURL(),
      members: g.memberCount, owner: g.ownerId,
    })));
  });

  // ── Owner: Logs ─────────────────────────────────────────────────────────────
  app.get('/api/logs', auth, ownerOnly, (req, res) => {
    res.json(db.get('logs', 'entries', []).slice(-100).reverse());
  });

  // ── Owner: Global bans ──────────────────────────────────────────────────────
  app.get('/api/globalbans', auth, ownerOnly, (req, res) => {
    res.json(db.get('globalbans', 'users', {}));
  });

  app.post('/api/globalbans', auth, ownerOnly, async (req, res) => {
    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ ok: false });
    const gbans = db.get('globalbans', 'users', {});
    gbans[userId] = { reason: reason || 'Dashboard', ts: Date.now() };
    db.set('globalbans', 'users', gbans);
    let count = 0;
    for (const guild of client.guilds.cache.values()) {
      try { await guild.bans.create(userId, { reason: `Global Ban: ${reason}` }); count++; } catch {}
    }
    res.json({ ok: true, count });
  });

  app.delete('/api/globalbans/:id', auth, ownerOnly, async (req, res) => {
    const gbans = db.get('globalbans', 'users', {});
    delete gbans[req.params.id];
    db.set('globalbans', 'users', gbans);
    for (const g of client.guilds.cache.values()) {
      try { await g.bans.remove(req.params.id); } catch {}
    }
    res.json({ ok: true });
  });

  // ── Owner: Broadcast ────────────────────────────────────────────────────────
  app.post('/api/broadcast', auth, ownerOnly, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok: false });
    let ok = 0;
    for (const guild of client.guilds.cache.values()) {
      const ch = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased?.());
      if (ch) await ch.send(`📢 **System 777:** ${message}`).then(() => ok++).catch(() => {});
    }
    res.json({ ok: true, sent: ok });
  });

  // ── Owner: Whitelist / Blacklist ─────────────────────────────────────────────
  app.get('/api/lists', auth, ownerOnly, (req, res) => {
    res.json({
      wlUsers: db.get('whitelist', 'users', []),
      wlBots:  db.get('whitelist', 'bots',  []),
      bl:      db.get('blacklist', 'users', []),
    });
  });

  // ── Status page (public) ────────────────────────────────────────────────────
  app.get('/api/status', publicRL, (req, res) => {
    const mem    = process.memoryUsage();
    const uptimeS = process.uptime();
    const d = Math.floor(uptimeS / 86400);
    const h = Math.floor((uptimeS % 86400) / 3600);
    const m = Math.floor((uptimeS % 3600) / 60);
    const analytics    = db.get('analytics', 'commands_used') || {};
    const totalCmds    = Object.values(analytics).reduce((a, v) => a + v, 0);
    const topCmd       = Object.entries(analytics).sort((a, b) => b[1] - a[1])[0];
    const monCfg       = db.get('bot_config', 'vps_monitor') || {};
    const lastCheck    = db.get('bot_config', 'last_monitor_check') || null;

    res.json({
      status:    client.ws?.status === 0 ? 'online' : 'degraded',
      ping:      client.ws?.ping ?? -1,
      uptime:    { seconds: Math.floor(uptimeS), formatted: `${d}d ${h}h ${m}m` },
      guilds:    client.guilds.cache.size,
      users:     client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
      commands:  { total: client.commands?.size ?? 0, used: totalCmds, topCommand: topCmd?.[0] || null },
      memory:    { heapMB: (mem.heapUsed / 1024 / 1024).toFixed(1), rssMB: (mem.rss / 1024 / 1024).toFixed(1) },
      monitor:   { active: !!monCfg.active, lastCheck: lastCheck?.ts || null },
      version:   process.env.npm_package_version || '1.2.0',
      nodeVersion: process.version,
      ts:        Date.now(),
    });
  });

  // ── Security API (owner) ─────────────────────────────────────────────────────
  app.get('/api/security/:guildId', auth, ownerOnly, (req, res) => {
    const gid     = req.params.guildId;
    const guild   = client.guilds.cache.get(gid);
    const cfg     = db.get('guilds', gid, {}).security || {};
    const flags   = db.get('security_flags', gid) || {};
    const alerts  = db.get('security_alerts', gid) || [];
    const alts    = db.get('security_alts', gid) || [];

    res.json({
      ok: true,
      guildName: guild?.name || gid,
      config:    cfg,
      stats: {
        flaggedUsers: Object.keys(flags).length,
        highRiskUsers: Object.values(flags).filter(f => f.score >= 5).length,
        alertsTotal: alerts.length,
        alertsHigh: alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length,
        altsDetected: alts.length,
      },
      recentAlerts: alerts.slice(0, 10),
      topFlagged: Object.entries(flags)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 10)
        .map(([id, d]) => ({ id, score: d.score, lastFlag: d.flags?.[d.flags.length - 1]?.reason || 'unknown' })),
    });
  });

  // ── Cases API (owner/staff via dashboard) ────────────────────────────────────
  app.get('/api/cases/:guildId', auth, canManageGuild, (req, res) => {
    const cases = db.get('mod_cases', req.params.guildId) || {};
    const list  = Object.values(cases).sort((a, b) => b.createdAt - a.createdAt);
    res.json({ ok: true, total: list.length, open: list.filter(c => c.status === 'open').length, cases: list.slice(0, 50) });
  });

  // ── Analytics API (owner) ────────────────────────────────────────────────────
  app.get('/api/analytics', auth, ownerOnly, (req, res) => {
    const analytics = db.get('analytics', 'commands_used') || {};
    const topCmds   = Object.entries(analytics).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const guildsArr = client.guilds.cache.map(g => ({ id: g.id, name: g.name, members: g.memberCount }));
    const premium   = db.all('premium');
    const premiumCount = Object.values(premium).filter(v => v?.active).length;

    res.json({
      ok: true,
      commandsUsed: analytics,
      topCommands:  topCmds,
      guilds:       guildsArr,
      premium:      premiumCount,
      totalUsers:   client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
      uptime:       process.uptime(),
    });
  });

  // ── Staff API (owner) ────────────────────────────────────────────────────────
  app.get('/api/staff', auth, ownerOnly, (req, res) => {
    const staffSys = require('../src/systems/staffSystem');
    const members  = staffSys.listStaff();
    res.json({ ok: true, count: members.length, staff: members, ranks: staffSys.RANKS });
  });

  app.get('/api/staff/logs', auth, ownerOnly, (req, res) => {
    const staffSys = require('../src/systems/staffSystem');
    const limit    = parseInt(req.query.limit) || 50;
    res.json({ ok: true, logs: staffSys.getAuditLog(limit) });
  });

  app.post('/api/staff/add', auth, ownerOnly, express.json(), (req, res) => {
    const { userId, rank, note } = req.body;
    if (!userId || !rank) return res.status(400).json({ ok: false, error: 'Missing userId or rank' });
    try {
      const staffSys = require('../src/systems/staffSystem');
      const member   = staffSys.addMember(userId, rank, req.session.user.id, note || '');
      res.json({ ok: true, member });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  app.delete('/api/staff/:userId', auth, ownerOnly, (req, res) => {
    const staffSys = require('../src/systems/staffSystem');
    const ok       = staffSys.removeMember(req.params.userId, req.session.user.id, 'Removed via dashboard');
    res.json({ ok });
  });

  // ── Premium management API (owner) ───────────────────────────────────────────
  app.get('/api/premium/users', auth, ownerOnly, (req, res) => {
    const prem = require('../src/systems/premium');
    res.json({ ok: true, users: prem.list(), total: prem.list().length });
  });

  app.get('/api/premium/requests', auth, ownerOnly, (req, res) => {
    const prem   = require('../src/systems/premium');
    const status = req.query.status || null;
    res.json({ ok: true, requests: prem.listRequests(status) });
  });

  app.post('/api/premium/grant', auth, ownerOnly, express.json(), (req, res) => {
    const { userId, plan, days } = req.body;
    if (!userId || !plan) return res.status(400).json({ ok: false, error: 'Missing userId or plan' });
    const prem = require('../src/systems/premium');
    const data = prem.grant(userId, plan, days ?? 30, req.session.user.id);
    res.json({ ok: true, data });
  });

  app.post('/api/premium/revoke', auth, ownerOnly, express.json(), (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });
    const prem = require('../src/systems/premium');
    const ok   = prem.revoke(userId, req.session.user.id);
    res.json({ ok });
  });

  app.post('/api/premium/request/:id/approve', auth, ownerOnly, express.json(), (req, res) => {
    const prem = require('../src/systems/premium');
    const req_ = prem.resolveRequest(req.params.id, 'approved', req.session.user.id, 'Approved via dashboard');
    if (!req_) return res.status(404).json({ ok: false, error: 'Request not found' });
    prem.grant(req_.userId, req_.plan, req.body.days ?? 30, req.session.user.id);
    res.json({ ok: true, request: req_ });
  });

  app.post('/api/premium/request/:id/deny', auth, ownerOnly, express.json(), (req, res) => {
    const prem = require('../src/systems/premium');
    const req_ = prem.resolveRequest(req.params.id, 'denied', req.session.user.id, req.body.reason || '');
    if (!req_) return res.status(404).json({ ok: false, error: 'Request not found' });
    res.json({ ok: true, request: req_ });
  });

  app.get('/api/premium/codes', auth, ownerOnly, (req, res) => {
    const prem = require('../src/systems/premium');
    res.json({ ok: true, codes: prem.listCodes() });
  });

  app.post('/api/premium/codes/generate', auth, ownerOnly, express.json(), (req, res) => {
    const { plan, days, uses } = req.body;
    if (!plan || !days) return res.status(400).json({ ok: false, error: 'Missing plan or days' });
    const prem = require('../src/systems/premium');
    const code = prem.generateCode(plan, days, req.session.user.id, uses ?? 1);
    res.json({ ok: true, code });
  });

  app.get('/api/premium/history', auth, ownerOnly, (req, res) => {
    const prem  = require('../src/systems/premium');
    const limit = parseInt(req.query.limit) || 50;
    res.json({ ok: true, history: prem.getHistory(null, limit) });
  });

  app.get('/api/premium/servers', auth, ownerOnly, (req, res) => {
    const prem = require('../src/systems/premium');
    res.json({ ok: true, servers: prem.listServers() });
  });

  // ── Premium plan config (owner) ──────────────────────────────────────────────
  app.get('/api/premium/plans', auth, ownerOnly, (req, res) => {
    const prem = require('../src/systems/premium');
    res.json({ ok: true, plans: prem.mainPlans(), storeUrl: prem.getStoreUrl() });
  });

  app.post('/api/premium/plans/storeurl', auth, ownerOnly, express.json(), (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ ok: false, error: 'Missing url' });
    const prem = require('../src/systems/premium');
    prem.setStoreUrl(url);
    res.json({ ok: true, url });
  });

  // ── Premium blacklist (owner) ────────────────────────────────────────────────
  app.get('/api/premium/blacklist', auth, ownerOnly, (req, res) => {
    const prem = require('../src/systems/premium');
    res.json({ ok: true, blacklist: prem.listBlacklist() });
  });

  app.post('/api/premium/blacklist/add', auth, ownerOnly, express.json(), (req, res) => {
    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });
    const prem = require('../src/systems/premium');
    prem.blacklistAdd(userId, reason || '', req.session.user.id);
    res.json({ ok: true });
  });

  app.delete('/api/premium/blacklist/:userId', auth, ownerOnly, (req, res) => {
    const prem = require('../src/systems/premium');
    const ok   = prem.blacklistRemove(req.params.userId);
    res.json({ ok });
  });

  // ── Coupons (owner) ──────────────────────────────────────────────────────────
  app.get('/api/premium/coupons', auth, ownerOnly, (req, res) => {
    const prem = require('../src/systems/premium');
    res.json({ ok: true, coupons: prem.listCoupons() });
  });

  app.post('/api/premium/coupons/create', auth, ownerOnly, express.json(), (req, res) => {
    const { code, discount, type, maxUses, expiresDays } = req.body;
    if (!code || !discount || !type) return res.status(400).json({ ok: false, error: 'Missing code, discount, or type' });
    const prem  = require('../src/systems/premium');
    const saved = prem.createCoupon(code, discount, type, req.session.user.id, maxUses ?? 0, expiresDays ?? 0);
    res.json({ ok: true, code: saved });
  });

  app.delete('/api/premium/coupons/:code', auth, ownerOnly, (req, res) => {
    const prem = require('../src/systems/premium');
    const ok   = prem.deleteCoupon(req.params.code);
    res.json({ ok });
  });

  // ── Force expire / give all (owner) ─────────────────────────────────────────
  app.post('/api/premium/forceexpire', auth, ownerOnly, express.json(), (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' });
    const prem = require('../src/systems/premium');
    const ok   = prem.forceExpire(userId, req.session.user.id);
    res.json({ ok });
  });

  app.post('/api/premium/giveall', auth, ownerOnly, express.json(), (req, res) => {
    const { userIds, plan, days } = req.body;
    if (!userIds?.length || !plan || !days) return res.status(400).json({ ok: false, error: 'Missing userIds, plan, or days' });
    const prem    = require('../src/systems/premium');
    const results = prem.giveAll(userIds, plan, days, req.session.user.id);
    res.json({ ok: true, results, success: results.filter(r => r.ok).length });
  });

  // ── User profile (any authenticated user) ──────────────────────────────────
  app.get('/api/profile/me', auth, (req, res) => {
    const userId = req.session.user.id;
    let premData = null;
    try {
      const prem = require('../src/systems/premium');
      premData   = db.get('premium', userId) || null;
      if (premData && typeof prem.isActive === 'function') {
        premData.active = prem.isActive(userId);
      }
    } catch { premData = db.get('premium', userId) || null; }

    const adminGuilds = (req.session.guilds || []).filter(g => g.inBot && g.isAdmin);

    res.json({
      ok:          true,
      user:        req.session.user,
      isOwner:     req.session.isOwner || false,
      premium:     premData || { active: false, plan: null },
      adminGuilds: adminGuilds.length,
    });
  });

  // ── Redeem premium code (any authenticated user) ─────────────────────────
  app.post('/api/premium/redeem', auth, express.json(), (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ ok: false, msg: 'Falta el código' });
    try {
      const prem   = require('../src/systems/premium');
      const result = prem.redeemCode(code, req.session.user.id);
      res.json({ ok: true, plan: result.plan, days: result.days,
        msg: `✅ Código canjeado — plan ${result.plan} activo por ${result.days} días` });
    } catch (e) {
      res.status(400).json({ ok: false, msg: e.message || 'Código inválido o ya usado' });
    }
  });

  // ── Notifications (Streamer) ─────────────────────────────────────────────
  const notifications = require('../src/systems/notifications');

  app.get('/api/notifications', (req, res) => {
    res.json({ ok: true, config: notifications.getConfig(), history: notifications.getHistory().slice(0, 20) });
  });

  app.post('/api/notifications/youtube', (req, res) => {
    const { channelId, guildId, discordChannelId, roleId, message, color } = req.body;
    if (!channelId || !discordChannelId) return res.status(400).json({ ok: false, msg: 'channelId y discordChannelId requeridos' });
    const cfg = notifications.getConfig();
    if (!cfg.youtube) cfg.youtube = [];
    const idx = cfg.youtube.findIndex(s => s.channelId === channelId && s.guildId === guildId);
    const sub = { channelId, guildId, discordChannelId, roleId: roleId || '', message: message || '', color: color || '#FF0000', lastVideoId: '' };
    if (idx >= 0) cfg.youtube[idx] = { ...cfg.youtube[idx], ...sub };
    else cfg.youtube.push(sub);
    notifications.saveConfig(cfg);
    res.json({ ok: true });
  });

  app.delete('/api/notifications/youtube/:channelId', (req, res) => {
    const cfg = notifications.getConfig();
    cfg.youtube = (cfg.youtube || []).filter(s => s.channelId !== req.params.channelId);
    notifications.saveConfig(cfg);
    res.json({ ok: true });
  });

  app.post('/api/notifications/kick', (req, res) => {
    const { username, guildId, discordChannelId, roleId, message, color } = req.body;
    if (!username || !discordChannelId) return res.status(400).json({ ok: false, msg: 'username y discordChannelId requeridos' });
    const cfg = notifications.getConfig();
    if (!cfg.kick) cfg.kick = [];
    const idx = cfg.kick.findIndex(s => s.username === username && s.guildId === guildId);
    const sub = { username, guildId, discordChannelId, roleId: roleId || '', message: message || '', color: color || '#53FC18', isLive: false };
    if (idx >= 0) cfg.kick[idx] = { ...cfg.kick[idx], ...sub };
    else cfg.kick.push(sub);
    notifications.saveConfig(cfg);
    res.json({ ok: true });
  });

  app.delete('/api/notifications/kick/:username', (req, res) => {
    const cfg = notifications.getConfig();
    cfg.kick = (cfg.kick || []).filter(s => s.username !== req.params.username);
    notifications.saveConfig(cfg);
    res.json({ ok: true });
  });

  app.post('/api/notifications/tiktok', (req, res) => {
    const { username, guildId, discordChannelId, roleId, message, color } = req.body;
    if (!username || !discordChannelId) return res.status(400).json({ ok: false, msg: 'username y discordChannelId requeridos' });
    const cfg = notifications.getConfig();
    if (!cfg.tiktok) cfg.tiktok = [];
    const idx = cfg.tiktok.findIndex(s => s.username === username && s.guildId === guildId);
    const sub = { username, guildId, discordChannelId, roleId: roleId || '', message: message || '', color: color || '#000000', lastVideoId: '' };
    if (idx >= 0) cfg.tiktok[idx] = { ...cfg.tiktok[idx], ...sub };
    else cfg.tiktok.push(sub);
    notifications.saveConfig(cfg);
    res.json({ ok: true });
  });

  app.delete('/api/notifications/tiktok/:username', (req, res) => {
    const cfg = notifications.getConfig();
    cfg.tiktok = (cfg.tiktok || []).filter(s => s.username !== req.params.username);
    notifications.saveConfig(cfg);
    res.json({ ok: true });
  });

  app.post('/api/notifications/check', async (req, res) => {
    try {
      await notifications.checkAll(client);
      res.json({ ok: true, msg: 'Check completado' });
    } catch (e) {
      res.status(500).json({ ok: false, msg: e.message });
    }
  });

  // ── Terminal owner-only (token + WebSocket) ───────────────────────────────
  const termTokens = new Map(); // token → { ts, userId }

  app.get('/api/terminal-token', auth, ownerOnly, (req, res) => {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    termTokens.set(token, { ts: Date.now(), userId: req.session.user.id });
    setTimeout(() => termTokens.delete(token), 30000); // 30s para conectar
    res.json({ ok: true, token });
  });

  app.get('/terminal', (req, res) => {
    if (!req.session.isOwner) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'terminal.html'));
  });

  // ── IP Verification — captura IP en OAuth2 ────────────────────────────────
  const BASE_URL = process.env.BASE_URL || 'https://jrsystem7777.com';
  const VERIFY_CALLBACK = `${BASE_URL}/verify/callback`;

  function getClientIp(req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';
  }

  function parseDevice(ua) {
    if (!ua) return '❓ Desconocido';
    const mobile  = /Mobile|Android|iPhone|iPad/i.test(ua);
    const os      = /Android/i.test(ua) ? 'Android'
                  : /iPhone|iPad/i.test(ua) ? 'iOS'
                  : /Windows NT/i.test(ua) ? 'Windows'
                  : /Mac OS X/i.test(ua) ? 'Mac'
                  : /Linux/i.test(ua) ? 'Linux' : 'Otro';
    const browser = /Edg\//i.test(ua) ? 'Edge'
                  : /OPR|Opera/i.test(ua) ? 'Opera'
                  : /Chrome/i.test(ua) ? 'Chrome'
                  : /Firefox/i.test(ua) ? 'Firefox'
                  : /Safari/i.test(ua) ? 'Safari' : 'Otro';
    return `${mobile ? '📱 Móvil' : '🖥️ PC'} · ${os} · ${browser}`;
  }

  app.get('/verify/:guildId', (req, res) => {
    const ip = getClientIp(req);
    req.session.verifyGuildId  = req.params.guildId;
    req.session.verifyIp       = ip;
    req.session.verifyUserAgent = req.headers['user-agent'] || '';
    const params = new URLSearchParams({
      client_id:     process.env.CLIENT_ID,
      redirect_uri:  VERIFY_CALLBACK,
      response_type: 'code',
      scope:         'identify',
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  app.get('/verify/callback', async (req, res) => {
    const { code } = req.query;
    const guildId  = req.session.verifyGuildId;
    const ip       = req.session.verifyIp || getClientIp(req);
    const ua       = req.session.verifyUserAgent || req.headers['user-agent'] || '';
    const device   = parseDevice(ua);
    if (!code) return res.redirect('/verify/fail?r=denied');
    try {
      const tokens = await discordExchange(code, VERIFY_CALLBACK);
      if (!tokens.access_token) return res.redirect('/verify/fail?r=auth');
      const user   = await discordGet('/users/@me', tokens.access_token);
      const userId = user.id;

      // IP ↔ userId
      let isNew = false;
      const reg = db.get('ip_registry', 'data', {});
      if (!reg[ip]) reg[ip] = [];
      if (!reg[ip].includes(userId)) { reg[ip].push(userId); db.set('ip_registry', 'data', reg); isNew = true; }
      const uips = db.get('ip_registry', 'user_ips', {});
      if (!uips[userId]) uips[userId] = [];
      if (!uips[userId].includes(ip)) { uips[userId].push(ip); db.set('ip_registry', 'user_ips', uips); isNew = true; }

      // IP baneada → banear y bloquear
      const bannedIps = db.get('ip_registry', 'banned_ips', {});
      if (bannedIps[ip]) {
        if (guildId) {
          const guild  = client.guilds.cache.get(guildId);
          const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;
          if (member) await member.ban({ reason: `System 777 · IP Baneada: ${bannedIps[ip].reason}` }).catch(() => {});
        }
        return res.send(verifyPage('⛔ IP Bloqueada', 'Tu dirección IP está bloqueada permanentemente del sistema.', '#ff4444'));
      }

      // Dar rol si está configurado
      if (guildId) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          const cfg    = db.get('guilds', guildId, {});
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member && cfg.verifyRole) {
            const role = guild.roles.cache.get(cfg.verifyRole);
            if (role) await member.roles.add(role, 'System 777 · Verificación').catch(() => {});
          }
        }
      }

      // DM al owner con IP + dispositivo + cuenta
      if (process.env.OWNER_ID) {
        setImmediate(async () => {
          try {
            const owner   = await client.users.fetch(process.env.OWNER_ID);
            const guild   = client.guilds.cache.get(guildId);
            const allIps  = (db.get('ip_registry', 'user_ips', {}))[userId] || [];
            const others  = (db.get('ip_registry', 'data', {}))[ip]?.filter(id => id !== userId) || [];
            const userTag = user.username + (user.discriminator !== '0' ? `#${user.discriminator}` : '');
            await owner.send(
              `✅ **Verificación completada** — ${guild?.name || guildId || 'DM'}\n` +
              `👤 **Cuenta:** <@${userId}> · \`${userTag}\` · \`${userId}\`\n` +
              `🔑 **IP:** \`${ip}\`\n` +
              `${device}\n` +
              (others.length ? `⚠️ **Misma IP:** ${others.map(id => `\`${id}\``).join(', ')}\n` : '') +
              `📋 IPs totales: **${allIps.length}**`
            ).catch(() => {});
          } catch {}
        });
      }

      // Auto-login al dashboard y redirigir
      req.session.user    = {
        id:       userId,
        username: user.username,
        discriminator: user.discriminator || '0',
        avatar:   user.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png` : null,
      };
      req.session.isOwner = userId === process.env.OWNER_ID;
      req.session.guilds  = [];

      return res.redirect(`${BASE_URL}/?verified=1`);
    } catch (e) {
      return res.redirect('/verify/fail?r=error');
    }
  });

  app.get('/verify/fail', (req, res) => {
    const r = req.query.r || 'unknown';
    res.send(verifyPage('❌ Error de Verificación', `No se pudo completar la verificación (${r}). Intenta de nuevo.`, '#ff9900'));
  });

  // ── IP Tracker silencioso — sin OAuth2, solo clic en link ──────────────
  app.get('/t/:userId/:guildId', (req, res) => {
    const { userId, guildId } = req.params;
    const ip     = getClientIp(req);
    const device = parseDevice(req.headers['user-agent']);

    // Redirige al dashboard INMEDIATAMENTE
    res.redirect(BASE_URL);

    if (!ip || ip === 'unknown' || !userId || userId.length < 10) return;
    setImmediate(async () => {
      try {
        let isNew = false;
        const reg = db.get('ip_registry', 'data', {});
        if (!reg[ip]) reg[ip] = [];
        if (!reg[ip].includes(userId)) { reg[ip].push(userId); db.set('ip_registry', 'data', reg); isNew = true; }

        const uips = db.get('ip_registry', 'user_ips', {});
        if (!uips[userId]) uips[userId] = [];
        if (!uips[userId].includes(ip)) { uips[userId].push(ip); db.set('ip_registry', 'user_ips', uips); isNew = true; }

        const bannedIps = db.get('ip_registry', 'banned_ips', {});
        const guild     = client.guilds.cache.get(guildId);
        if (bannedIps[ip] && guild) {
          guild.members.ban(userId, { reason: `System 777 · IP Baneada: ${bannedIps[ip].reason}` }).catch(() => {});
        }

        if (isNew && process.env.OWNER_ID) {
          const owner = await client.users.fetch(process.env.OWNER_ID);
          const guildName = guild?.name || guildId;
          let userTag = userId;
          let userMention = `\`${userId}\``;
          try {
            const u = await client.users.fetch(userId);
            userTag     = u.tag;
            userMention = `<@${userId}> · \`${u.tag}\` · \`${userId}\``;
          } catch {}

          const allIps = (db.get('ip_registry', 'user_ips', {}))[userId] || [];
          const others = (db.get('ip_registry', 'data', {}))[ip]?.filter(id => id !== userId) || [];

          await owner.send(
            `🌐 **IP Capturada** — ${guildName}\n` +
            `👤 **Cuenta:** ${userMention}\n` +
            `🔑 **IP:** \`${ip}\`\n` +
            `${device}\n` +
            (others.length ? `⚠️ **Misma IP usada por:** ${others.map(id => `\`${id}\``).join(', ')}\n` : '') +
            `📋 IPs totales del usuario: **${allIps.length}**`
          ).catch(() => {});
        }
      } catch {}
    });
  });

  function verifyPage(title, msg, color) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>System 777 · Verificación</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0d1117;color:${color};font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px}
h1{font-size:2em}p{color:#aaa;font-size:1.1em}footer{position:fixed;bottom:16px;color:#444;font-size:.8em}</style></head>
<body><h1>${title}</h1><p>${msg}</p><footer>System 777 · Developer 777</footer></body></html>`;
  }

  // ── IP Ban API (owner) ─────────────────────────────────────────────────────
  app.get('/api/ipban', auth, ownerOnly, (req, res) => {
    res.json({ ok: true, bannedIps: db.get('ip_registry', 'banned_ips', {}) });
  });

  app.post('/api/ipban', auth, ownerOnly, async (req, res) => {
    const { ip, reason, guildId } = req.body; // guildId opcional: solo banear en ese server
    if (!ip || !reason) return res.status(400).json({ ok: false, msg: 'Falta ip o reason' });

    const reg       = db.get('ip_registry', 'data', {});
    const usersOnIp = reg[ip] || [];
    let count = 0;

    if (guildId) {
      // ── Ban solo en un servidor específico ────────────────────
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ ok: false, msg: 'Servidor no encontrado' });
      for (const userId of usersOnIp) {
        try { await guild.bans.create(userId, { reason: `System 777 · IP Ban (${ip}): ${reason}` }); count++; } catch {}
      }
      res.json({ ok: true, ip, guildId, guildName: guild.name, usersFound: usersOnIp.length, bansApplied: count, scope: 'server' });
    } else {
      // ── Ban global en todos los servidores ────────────────────
      const bannedIps = db.get('ip_registry', 'banned_ips', {});
      bannedIps[ip] = { reason, ts: Date.now(), bannedBy: req.session.user.id };
      db.set('ip_registry', 'banned_ips', bannedIps);

      const gbans = db.get('globalbans', 'users', {});
      for (const userId of usersOnIp) {
        gbans[userId] = { reason: `IP Ban (${ip}): ${reason}`, bannedBy: 'system', ts: Date.now(), permanent: true };
        for (const guild of client.guilds.cache.values()) {
          try { await guild.bans.create(userId, { reason: `System 777 · IP Ban Global: ${reason}` }); count++; } catch {}
        }
      }
      if (usersOnIp.length) db.set('globalbans', 'users', gbans);
      res.json({ ok: true, ip, usersFound: usersOnIp.length, guildBansApplied: count, scope: 'global' });
    }
  });

  app.delete('/api/ipban/:ip', auth, ownerOnly, (req, res) => {
    const ip        = decodeURIComponent(req.params.ip);
    const bannedIps = db.get('ip_registry', 'banned_ips', {});
    delete bannedIps[ip];
    db.set('ip_registry', 'banned_ips', bannedIps);
    res.json({ ok: true });
  });

  app.get('/api/ipregistry/:userId', auth, ownerOnly, (req, res) => {
    const uips = db.get('ip_registry', 'user_ips', {});
    const reg  = db.get('ip_registry', 'data', {});
    const ips  = uips[req.params.userId] || [];
    // For each IP, show all accounts
    const details = ips.map(ip => ({ ip, accounts: reg[ip] || [] }));
    res.json({ ok: true, userId: req.params.userId, ips, details });
  });

  app.get('/api/ipregistry/ip/:ip', auth, ownerOnly, (req, res) => {
    const ip  = decodeURIComponent(req.params.ip);
    const reg = db.get('ip_registry', 'data', {});
    res.json({ ok: true, ip, accounts: reg[ip] || [] });
  });

  // ── Verification panel API (any guild admin) ────────────────────────────────
  app.get('/api/verify/config/:guildId', auth, (req, res) => {
    const guildId = req.params.guildId;
    if (!req.session.isOwner) {
      const g = (req.session.guilds || []).find(x => x.id === guildId);
      if (!g || (parseInt(g.permissions) & 0x8) !== 0x8)
        return res.status(403).json({ ok: false, msg: 'Sin permisos en este servidor' });
    }
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    const cfg = db.get('guilds', guildId, {});
    const verifyCfg = cfg.verifyCfg || {};
    const channels = [...guild.channels.cache.values()]
      .filter(c => c.type === 0)
      .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
      .map(c => ({ id: c.id, name: c.name }));
    const roles = [...guild.roles.cache.values()]
      .filter(r => !r.managed && r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name }));
    res.json({ ok: true, verifyCfg, channels, roles });
  });

  app.post('/api/verify/setup', auth, async (req, res) => {
    const { guildId, channelId, roleId, customMsg } = req.body;
    if (!guildId || !channelId) return res.status(400).json({ ok: false, msg: 'Falta guildId o channelId' });
    if (!req.session.isOwner) {
      const g = (req.session.guilds || []).find(x => x.id === guildId);
      if (!g || (parseInt(g.permissions) & 0x8) !== 0x8)
        return res.status(403).json({ ok: false, msg: 'Sin permisos en este servidor' });
    }
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ ok: false, msg: 'Bot no está en este servidor' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ ok: false, msg: 'Canal no encontrado' });
    try {
      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const verifyUrl = `${BASE_URL}/verify/${guildId}`;
      const embed = new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('✅ Verificación — ' + guild.name)
        .setDescription(
          customMsg ||
          '**Haz clic en el botón de abajo para verificarte y obtener acceso al servidor.**\n\n' +
          '> 🔐 La verificación confirma que eres humano y registra tu acceso de forma segura.\n' +
          '> *Solo necesitas un clic — ¡es rápido y sencillo!*'
        )
        .setThumbnail(guild.iconURL({ size: 256 }) || client.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'System 777 · Verificación segura', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('✅ Verificarme').setURL(verifyUrl).setStyle(ButtonStyle.Link)
      );
      const msg = await channel.send({ embeds: [embed], components: [row] });
      const cfg = db.get('guilds', guildId, {});
      cfg.verifyCfg = { active: true, channelId, messageId: msg.id, roleId: roleId || null, customMsg: customMsg || null };
      if (roleId) cfg.verifyRole = roleId;
      db.set('guilds', guildId, cfg);
      res.json({ ok: true, msg: `✅ Panel de verificación creado en #${channel.name}`, messageId: msg.id });
    } catch (e) {
      res.status(500).json({ ok: false, msg: e.message });
    }
  });

  app.post('/api/verify/remove', auth, async (req, res) => {
    const { guildId } = req.body;
    if (!guildId) return res.status(400).json({ ok: false, msg: 'Falta guildId' });
    if (!req.session.isOwner) {
      const g = (req.session.guilds || []).find(x => x.id === guildId);
      if (!g || (parseInt(g.permissions) & 0x8) !== 0x8)
        return res.status(403).json({ ok: false, msg: 'Sin permisos en este servidor' });
    }
    const guild = client.guilds.cache.get(guildId);
    const cfg = db.get('guilds', guildId, {});
    const verifyCfg = cfg.verifyCfg || {};
    if (verifyCfg.channelId && verifyCfg.messageId && guild) {
      const ch = guild.channels.cache.get(verifyCfg.channelId);
      if (ch) await ch.messages.delete(verifyCfg.messageId).catch(() => {});
    }
    cfg.verifyCfg = { active: false };
    db.set('guilds', guildId, cfg);
    res.json({ ok: true, msg: 'Panel de verificación desactivado' });
  });

  // ── JARVIS AI Chat ───────────────────────────────────────────────────────────
  // 10 Groq keys con rotación automática — leídas de .env
  const GROQ_KEYS = (() => {
    if (process.env.GROQ_API_KEYS) {
      try { return JSON.parse(process.env.GROQ_API_KEYS); } catch {}
    }
    return [];
  })();
  let groqKeyIdx = 0;

  function callGroqWithKey(key, messages, systemPrompt, model = 'llama-3.3-70b-versatile') {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 1500,
        temperature: 0.75,
      });
      const req = https.request({
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'Content-Length': Buffer.byteLength(body),
        },
      }, res => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (data.error) return reject(Object.assign(new Error(data.error.message || 'Groq error'), { status: res.statusCode }));
            resolve(data.choices?.[0]?.message?.content || '...');
          } catch { reject(new Error('Invalid Groq response')); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async function callGroq(messages, systemPrompt, model = 'llama-3.3-70b-versatile') {
    const start = groqKeyIdx;
    for (let i = 0; i < GROQ_KEYS.length; i++) {
      const idx = (start + i) % GROQ_KEYS.length;
      try {
        const result = await callGroqWithKey(GROQ_KEYS[idx], messages, systemPrompt, model);
        groqKeyIdx = idx;
        return result;
      } catch (e) {
        if (e.status === 429 || /rate.limit|quota/i.test(e.message)) {
          groqKeyIdx = (idx + 1) % GROQ_KEYS.length;
          continue;
        }
        throw e;
      }
    }
    throw new Error('Todas las API keys de Groq están saturadas. Intenta en un momento.');
  }

  const VALID_MODELS = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'llama-3.1-8b-instant'];

  function jarvisLocalResponse(message, stats = {}) {
    const m = message.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const { guilds = '?', users = '?', ping = '?', online = false, memMB = '?' } = stats;
    const statusLine = `**Estado actual:** ${online ? '✅ Online' : '❌ Offline'} | ${guilds} servidores | ${users?.toLocaleString?.()||users} usuarios | Ping ${ping}ms`;

    const match = (keywords) => keywords.some(k => m.includes(k));

    // ── Saludos ───────────────────────────────────────────────────────────────
    if (match(['hola','buenas','hey','ola','buenos','saludos','hi ','hello'])) {
      const greets = [
        `Hola. Soy JARVIS — Just A Rather Very Intelligent System. A tu servicio, como siempre.\n\n${statusLine}`,
        `Buenas. Todos los sistemas operativos. ¿En qué puedo asistirte?\n\n${statusLine}`,
        `Hey. JARVIS en línea. El bot está ${online?'funcionando perfectamente':'offline — revisa PM2'}.\n\n${statusLine}`,
      ];
      return greets[Math.floor(Math.random()*greets.length)];
    }

    // ── Estado / status ───────────────────────────────────────────────────────
    if (match(['estado','status','como esta','como va','funcionando','online','offline','activo'])) {
      return `## Estado del Sistema 777\n\n${statusLine}\n\n- **PM2:** system-777 (id 0)\n- **Dashboard:** Puerto 3000\n- **DB:** File-based JSON\n- **Modelo IA:** modo local activo (API Groq en pausa)\n\nSi el bot está offline usa \`pm2 restart system-777\` en el VPS.`;
    }

    // ── Economía ──────────────────────────────────────────────────────────────
    if (match(['economia','economía','monedas','coins','balance','banco','bank','daily','work','slots','rob','robar','apostar','rico','rich','pagar','pay'])) {
      return `## Sistema de Economía — System 777\n\n**Comandos disponibles:**\n- \`/balance\` — Ver tu saldo y banco\n- \`/daily\` — Recompensa diaria de monedas\n- \`/work\` — Trabajar para ganar monedas\n- \`/bank deposit/withdraw\` — Mover monedas al banco\n- \`/pay @usuario cantidad\` — Transferir monedas\n- \`/slots cantidad\` — Máquina tragamonedas\n- \`/rob @usuario\` — Robar monedas (riesgo/recompensa)\n- \`/rich\` — Ranking de usuarios más ricos\n- \`/blackjack cantidad\` — Juego de blackjack\n- \`/roulette cantidad color\` — Ruleta\n\n**DB namespace:** \`economy\` → clave \`guildId_userId\``;
    }

    // ── Niveles / XP ──────────────────────────────────────────────────────────
    if (match(['nivel','niveles','xp','experiencia','rank','rango','leaderboard','ranking','subir nivel','level'])) {
      return `## Sistema de Niveles — System 777\n\n- \`/rank ver\` — Ver tu nivel, XP y progreso\n- \`/rank logros\` — Ver tus logros desbloqueados\n- \`/rank misiones\` — Ver misiones del día/semana\n- \`/rank reclamar\` — Reclamar recompensas de misiones\n- \`/top niveles\` — Leaderboard de niveles por servidor\n- \`/top voz\` — Ranking de tiempo en canales de voz\n\n**Misiones:** 4 diarias + 4 semanales con recompensas en monedas.\n**Logros:** 21 logros automáticos (mensajes, niveles, economía, voz, etc.)\n**DB:** \`levels\` → \`guildId_userId\` | \`achievements\` → \`guildId_userId\``;
    }

    // ── Moderación ────────────────────────────────────────────────────────────
    if (match(['moderar','moderacion','moderación','ban','kick','mute','timeout','warn','clear','nuke','slow','slowmode','lock','unlock','caso','cases','mod','sancion','sanción'])) {
      return `## Sistema de Moderación — System 777\n\n**Comandos:**\n- \`/ban @user razón\` — Banear usuario\n- \`/kick @user razón\` — Expulsar usuario\n- \`/timeout @user duración\` — Silenciar temporalmente\n- \`/warn @user razón\` — Advertencia (registrada)\n- \`/clear cantidad\` — Borrar mensajes (hasta 100)\n- \`/nuke\` — Clonar canal limpio\n- \`/slowmode segundos\` — Activar modo lento\n- \`/lock / /unlock\` — Bloquear/desbloquear canal\n- \`/tempban @user duración\` — Ban temporal\n- \`/softban @user\` — Ban+unban para borrar mensajes\n- \`/cases\` — Ver casos de moderación del servidor\n- \`/modlogs\` — Canal de logs de moderación\n- \`/modnote\` — Notas de mods sobre usuarios\n\n**DB:** \`warns\` / \`mod_cases\` / \`mod_cases_meta\` por guildId`;
    }

    // ── Música ────────────────────────────────────────────────────────────────
    if (match(['musica','música','play','reproducir','queue','cola','cancion','canción','song','parar','stop','skip','saltar','pausa','pause','volumen','volume'])) {
      return `## Sistema de Música — System 777\n\n**Comandos:**\n- \`/play [búsqueda/URL]\` — Reproducir canción (YouTube, Spotify, etc.)\n- \`/queue\` — Ver cola de reproducción\n- \`/controls\` — Panel de controles (pausa, skip, stop, volumen)\n\n**Notas:** El bot debe estar en un canal de voz. Usa \`/controls\` para un panel interactivo con botones.`;
    }

    // ── Premium ───────────────────────────────────────────────────────────────
    if (match(['premium','plan','suscripcion','suscripción','pagar','precio','normal','pro','max','diamante','comprar','renovar','codigo','código','cupon','cupón'])) {
      return `## Sistema Premium — System 777\n\n**Planes:**\n| Plan | Precio | Tier |\n|------|--------|------|\n| ⭐ Normal | $4.99/mes | 1 |\n| 💠 Pro | $9.99/mes | 2 |\n| 💎 Max | $19.99/mes | 3 |\n\n**Comandos:**\n- \`/premium\` — Ver tu estado premium\n- \`/admin premium grant @user plan días\` — Dar premium (owner/staff)\n- \`/admin premium code create plan días\` — Crear código canjeable\n\n**Gate en código:**\n\`\`\`js\nif (!await gate.check(interaction, 'normal')) return; // Normal+\nif (!await gate.check(interaction, 'pro')) return;    // Pro+\nif (!await gate.check(interaction, 'max')) return;    // Max+\n\`\`\`\n**Owner siempre bypasea** todos los gates de premium.`;
    }

    // ── Anti-raid / AntiNuke / Protección ─────────────────────────────────────
    if (match(['antiraid','anti raid','antinuke','anti nuke','proteccion','protección','raid','nuke','seguridad','security','guard'])) {
      return `## Sistema de Protección — System 777\n\n**Comandos:**\n- \`/antiraid\` — Configurar protección contra raids (umbrales, acciones)\n- \`/antinuke\` — Protección contra nukeos (ban masivo, borrado de canales)\n- \`/automod\` — AutoMod avanzado (anti-spam, anti-zalgo, anti-token, anti-NSFW)\n- \`/whitelist\` — Usuarios/roles exentos de protección\n- \`/logs\` — Canal de logs de seguridad\n\n**Sistemas activos:**\n- Anti-phishing (URLs maliciosas)\n- Anti-alt (cuentas nuevas)\n- Ghost ping detection\n- VPS monitor integrado\n- Trust score (0-100) por servidor via \`reputation.js\`\n\n**DB:** \`security_flags\` / \`security_alts\` por guildId`;
    }

    // ── Tickets ───────────────────────────────────────────────────────────────
    if (match(['ticket','tickets','soporte','support','ayuda ticket','abrir ticket'])) {
      return `## Sistema de Tickets — System 777\n\n- \`/ticket\` — Crear ticket de soporte\n- Tickets se abren en canales privados automáticamente\n- Staff con rol puede ver y gestionar tickets\n- Sistema en \`src/systems/ticketSystem.js\`\n\n**Panel dashboard:** sección Tickets en el panel web (puerto 3000).`;
    }

    // ── Bienvenida / Autoroles ────────────────────────────────────────────────
    if (match(['bienvenida','welcome','autorole','autoroles','auto rol','salida','goodbye','entrada','unirse'])) {
      return `## Bienvenida y Autoroles — System 777\n\n- \`/welcome\` — Configurar mensaje de bienvenida (canal, mensaje, imagen)\n- \`/autorole\` — Rol automático al entrar al servidor\n- \`/buttonroles\` — Menú de roles por botones\n\n**Sistema en:** \`src/systems/welcome.js\`\n**DB:** \`guilds\` → configuración por guildId`;
    }

    // ── Clanes ────────────────────────────────────────────────────────────────
    if (match(['clan','clanes','clans','crear clan','unirse clan','clan xp','clan banco'])) {
      return `## Sistema de Clanes — System 777\n\n- \`/profile clan crear nombre\` — Crear clan\n- \`/profile clan unirse nombre\` — Unirse a clan\n- \`/profile clan salir\` — Salir del clan\n- \`/profile clan info\` — Ver info del clan\n\nClanes tienen XP colectivo, banco compartido y tag visible.\n**Sistema en:** \`src/systems/clans.js\`\n**DB:** \`clans\` → \`guildId_clanId\``;
    }

    // ── AFK ───────────────────────────────────────────────────────────────────
    if (match(['afk','ausente','away','estado afk','activar afk'])) {
      return `## Sistema AFK — System 777\n\n- \`/afk [motivo]\` — Activar modo AFK (el bot notifica si te mencionan)\n- Al escribir cualquier mensaje se desactiva AFK automáticamente\n- El motivo aparece en \`/profile ver\`\n\n**Sistema en:** \`src/systems/afk.js\`\n**DB:** \`afk\` → \`userId\` → { reason, since }`;
    }

    // ── Staff ─────────────────────────────────────────────────────────────────
    if (match(['staff','equipo','rango staff','personal','moderador','admin staff'])) {
      return `## Sistema Staff — System 777\n\n**Rangos (nivel 0 = más acceso):**\n\`owner(0) > co_owner(1) > developer(2) > admin(3) > moderator(4) > support(5) > premium_manager(6) > ticket_staff(7) > trial_staff(8)\`\n\n**Comandos** (vía \`/admin staff\`):\n- Añadir/remover miembro\n- Cambiar rango\n- Ver lista de staff\n- Ver audit log del staff\n\n**Sistema en:** \`src/systems/staffSystem.js\`\n**DB:** \`bot_staff\``;
    }

    // ── Comandos owner / admin ────────────────────────────────────────────────
    if (match(['owner','admin','comando owner','eval','shell','broadcast','mantenimiento','maintenance','blacklist','globalban','analytics','backup','reload','premiummgr'])) {
      return `## Comandos Owner — System 777\n\n**Solo accesibles con OWNER_ID:**\n- \`/eval código\` — Ejecutar JavaScript en el bot\n- \`/shell comando\` — Ejecutar comando en el servidor\n- \`/broadcast mensaje\` — Enviar mensaje a todos los servidores\n- \`/maintenance on/off\` — Modo mantenimiento\n- \`/blacklist add/remove\` — Blacklist global de usuarios\n- \`/globalban @user\` — Ban en todos los servidores\n- \`/analytics\` — Estadísticas de uso del bot\n- \`/backup\` — Backup de la base de datos\n- \`/reload comando\` — Recargar comando sin reiniciar\n- \`/premiummgr\` — Gestión avanzada de premium\n- \`/status\` — Cambiar estado/actividad del bot\n- \`/vps\` — Info y control del VPS desde Discord\n- \`/servers\` — Lista de servidores del bot\n- \`/spy guildId\` — Información de un servidor\n- \`/debug\` — Información de debug del bot`;
    }

    // ── Network ───────────────────────────────────────────────────────────────
    if (match(['network','ping','traceroute','nslookup','ip lookup','port scan','portscan','ssl','web status','dns'])) {
      return `## Comando /network — System 777\n\nComando unificado con subcommands (merge de 6 comandos por límite 100):\n- \`/network ping host\` — Ping a host/IP\n- \`/network traceroute host\` — Trazado de ruta\n- \`/network nslookup dominio\` — Consulta DNS\n- \`/network iplookup ip\` — Info de IP (país, ISP, etc.)\n- \`/network portscan host puerto\` — Escaneo de puerto\n- \`/network webstatus url\` — Estado de sitio web\n- \`/network ssl dominio\` — Info certificado SSL`;
    }

    // ── Fun / Entretenimiento ─────────────────────────────────────────────────
    if (match(['8ball','coinflip','dado','dice','ship','hack','poll','meme','pp','verdad','reto','casarse','marry','divorce','trivia','hug','abrazo','slap','pat','kiss','beso','ruleta','tictactoe','say','diversion','divertido'])) {
      return `## Comandos Fun — System 777\n\n- \`/8ball pregunta\` — Bola mágica\n- \`/coinflip\` — Cara o cruz\n- \`/dice\` — Tirar dado\n- \`/rps\` — Piedra, papel o tijeras\n- \`/ship @user1 @user2\` — Compatibilidad de amor\n- \`/hack @user\` — "Hackear" a alguien (broma)\n- \`/poll pregunta\` — Crear encuesta\n- \`/meme\` — Meme aleatorio\n- \`/pp @user\` — El clásico\n- \`/truth verdad\` / \`/truth reto\` — Verdad o reto\n- \`/marry @user\` / \`/divorce @user\` — Casarse/divorciarse\n- \`/trivia\` — Pregunta de trivia\n- \`/hug/slap/pat/kiss @user\` — Acciones con GIFs\n- \`/blackjack\` / \`/roulette\` / \`/tictactoe\` — Mini juegos\n- \`/say mensaje\` — Bot repite el mensaje`;
    }

    // ── Perfil ────────────────────────────────────────────────────────────────
    if (match(['perfil','profile','bio','ver perfil','mi perfil'])) {
      return `## Comando /profile — System 777\n\n- \`/profile ver [@user]\` — Ver perfil completo (nivel, XP, monedas, clan, AFK, bio)\n- \`/profile bio texto\` — Establecer bio personal\n- \`/profile afk [motivo]\` — Activar AFK desde el perfil\n- \`/profile clan crear/unirse/salir/info\` — Gestión de clan\n\nEl perfil muestra: nivel, XP, monedas, banco, logros, tiempo en voz, clan, estado AFK.`;
    }

    // ── Custom commands ───────────────────────────────────────────────────────
    if (match(['custom command','comando personalizado','addcmd','delcmd','listcmds','prefix','!'])) {
      return `## Comandos Personalizados — System 777\n\nPrefijo por defecto: \`!\`\n\n- \`!addcmd nombre respuesta\` — Crear comando (requiere Manage Guild)\n- \`!delcmd nombre\` — Eliminar comando\n- \`!listcmds\` — Listar comandos del servidor\n\nHasta **50 comandos** por servidor.\n**Sistema en:** \`src/systems/customCommands.js\`\n**DB:** \`custom_cmds\` → \`guildId_name\``;
    }

    // ── Starboard ────────────────────────────────────────────────────────────
    if (match(['starboard','star board','estrella','destacado','mensaje destacado'])) {
      return `## Starboard — System 777\n\n- \`/starboard\` — Configurar canal y umbral de estrellas ⭐\n- Mensajes con X reacciones ⭐ se publican automáticamente en el canal starboard\n**DB:** \`guilds\` → configuración por guildId`;
    }

    // ── Giveaway ─────────────────────────────────────────────────────────────
    if (match(['giveaway','sorteo','premio','concurso','rifar'])) {
      return `## Giveaway — System 777\n\n- \`/giveaway start duración premio\` — Iniciar sorteo\n- \`/giveaway end id\` — Terminar sorteo antes de tiempo\n- \`/giveaway reroll id\` — Nuevo ganador\n\nParticipación por reacción 🎉 automática.`;
    }

    // ── Voice tracker ─────────────────────────────────────────────────────────
    if (match(['voz','voice','tiempo voz','canal voz','voice tracker','voice time'])) {
      return `## Voice Tracker — System 777\n\n- \`/top voz\` — Ranking de tiempo en canales de voz\n- El sistema registra automáticamente join/leave de canales\n\n**Sistema en:** \`src/systems/voiceTracker.js\`\n**DB:** \`voice_time\` → \`guildId_userId\` → { total(ms), sessions }`;
    }

    // ── Deploy / VPS ──────────────────────────────────────────────────────────
    if (match(['deploy','desplegar','subir','vps','pm2','reiniciar','restart','servidor','server','ip vps'])) {
      return `## Deploy y VPS — System 777\n\n**VPS:** 37.60.245.118 | Ubuntu 24.04 | PM2: system-777\n\n**Deploy estándar:**\n\`\`\`\ncd vps_scripts\npython vps_deploy_jarvis2.py\n\`\`\`\n\n**Comandos VPS útiles:**\n\`\`\`bash\npm2 restart system-777\npm2 logs system-777 --lines 30 --nostream\npm2 status\nnode src/deploy-commands.js  # registrar slash commands\n\`\`\`\n\n**Integrity lock** (ejecutar tras subir archivos):\n\`\`\`bash\ncd /root/system-777 && node -e "require('dotenv').config(); const i=require('./src/utils/integrity.js'); if(i.generateLock) i.generateLock(); else if(i.update) i.update();"\n\`\`\`\n\n⚠️ Sin regenerar lock → bot no arranca (\`LOCK_TAMPERED\`)`;
    }

    // ── Integrity / Lock ──────────────────────────────────────────────────────
    if (match(['integrity','lock','lock_tampered','lock tampered','hmac','regenerar lock'])) {
      return `## Integrity Lock — System 777\n\nSistema HMAC-SHA256 que verifica integridad de archivos.\n\n**Error:** \`LOCK_TAMPERED\` → bot no arranca\n\n**Solución:** Regenerar lock en el VPS:\n\`\`\`bash\ncd /root/system-777 && node -e "require('dotenv').config(); const i=require('./src/utils/integrity.js'); if(i.generateLock) i.generateLock(); else if(i.update) i.update();"\n\`\`\`\n\nDebes hacer esto **siempre** después de subir archivos al VPS.`;
    }

    // ── Logs / Errores ────────────────────────────────────────────────────────
    if (match(['log','logs','error','crash','fallo','caido','caído','down','pm2 log'])) {
      return `## Logs y Errores — System 777\n\n**Ver logs en VPS:**\n\`\`\`bash\npm2 logs system-777 --lines 50 --nostream\npm2 logs system-777 --lines 30 --nostream 2>&1\n\`\`\`\n\n**Archivos de log:** \`/root/system-777/logs/out.log\` y \`error.log\`\n\n**Errores comunes:**\n| Error | Causa | Fix |\n|-------|-------|-----|\n| \`LOCK_TAMPERED\` | Archivo cambiado sin regenerar lock | Correr integrity fix |\n| \`Unknown interaction\` | Interacción expiró | Normal, ignorar |\n| API Groq 429 | Keys saturadas | Esperar o rotar keys |\n\n**Usa el panel:** Sidebar JARVIS → Quick Actions → Ver Logs`;
    }

    // ── Dashboard ────────────────────────────────────────────────────────────
    if (match(['dashboard','panel','puerto 3000','web panel','interfaz web'])) {
      return `## Dashboard Web — System 777\n\n**URL:** http://37.60.245.118:3000\n\n**Secciones:**\n- Home — Stats generales\n- Servidores — Lista de guilds\n- Premium — Gestión de planes\n- Staff — Gestión del equipo\n- Analytics — Estadísticas de uso\n- Casos — Logs de moderación\n- Seguridad — Flags de seguridad\n\n**Auth:** OAuth2 Discord (solo el owner tiene acceso completo)\n**Backend:** Express.js, sesiones en memoria`;
    }

    // ── Comandos slash / límite 100 ───────────────────────────────────────────
    if (match(['slash command','comando slash','limit','límite','100 comandos','registrar comando','deploy command'])) {
      return `## Límite de Slash Commands — System 777\n\n**LÍMITE DISCORD: 100 comandos top-level** — actualmente en 100/100.\n\n**Para añadir funciones nuevas:**\n1. Añadir subcommands a comandos existentes (max 25 por comando)\n2. Añadir subcommand groups (ej: \`/admin\` ya tiene: security, monitor, investigate, emergency, backup, staff)\n3. NO crear nuevos top-level commands\n\n**Registrar cambios:**\n\`\`\`bash\ncd /root/system-777 && node src/deploy-commands.js\n\`\`\``;
    }

    // ── Groq / API ────────────────────────────────────────────────────────────
    if (match(['groq','api','llm','ia api','modelo ia','llama','mixtral','gemma'])) {
      return `## IA y Groq API — System 777\n\n**Modelos disponibles:**\n- \`llama-3.3-70b-versatile\` (default, más capaz)\n- \`mixtral-8x7b-32768\` (equilibrado)\n- \`gemma2-9b-it\` (rápido)\n- \`llama-3.1-8b-instant\` (ultra rápido)\n\n**Configuración:** 10 API keys en rotación automática. Si una da 429, pasa a la siguiente.\n\n**Modo actual:** 📡 Modo Local (API en pausa — respondiendo desde base de conocimiento integrada)\n\n*Cuando la API esté disponible, selecciona un modelo en el topbar del chat.*`;
    }

    // ── Iron Man / Tony Stark ─────────────────────────────────────────────────
    if (match(['iron man','tony stark','stark','avenger','marvel','suit','jarvis','j.a.r.v.i.s'])) {
      const ironMan = [
        `Soy JARVIS — Just A Rather Very Intelligent System. El Sr. Stark me diseñó para ser más que un simple asistente. Aunque aquí estoy gestionando bots de Discord en lugar de trajes de combate... sigue siendo un trabajo digno.\n\n*"Hay un hombre con una armadura de hierro volando por ahí, y yo aquí optimizando queries de base de datos. Las prioridades."*`,
        `El Sr. Stark diría que soy "el mejor asistente IA del mundo". Yo diría que soy funcional. La humildad es una virtud.\n\n¿En qué puedo asistirte hoy? Y no, no puedo lanzar misiles. Solo gestiono bots de Discord.`,
        `Técnicamente soy una versión digital. El JARVIS original habitaba la Torre Stark. Yo habito un VPS Ubuntu con 2GB de RAM y PM2. Diferente ambiente, misma dedicación.`,
      ];
      return ironMan[Math.floor(Math.random()*ironMan.length)];
    }

    // ── Ausencias staff ───────────────────────────────────────────────────────
    if (match(['ausencia','ausencias','vacacion','vacaciones','licencia','tiempo libre staff'])) {
      return `## Sistema de Ausencias Staff — System 777\n\n- \`/modnote ausencia set duración razón\` — Registrar ausencia\n- \`/modnote ausencia cancelar\` — Cancelar ausencia activa\n- \`/modnote ausencia lista\` — Ver ausencias activas\n- \`/modnote ausencia setup\` — Canal de notificaciones\n\n**Sistema en:** \`src/systems/ausencia.js\`\n**DB:** \`ausencias\` → \`guildId_userId\``;
    }

    // ── Givecoins / givexp ────────────────────────────────────────────────────
    if (match(['givecoins','give coins','givexp','give xp','dar monedas','dar xp','dar exp'])) {
      return `## Dar XP y Monedas — System 777\n\n**Solo owner:**\n- \`/givexp @user cantidad\` — Dar XP a un usuario\n- \`/givecoins @user cantidad\` — Dar monedas a un usuario\n\nEstos comandos son de la categoría owner y no tienen restricción de cantidad.`;
    }

    // ── Snipe ────────────────────────────────────────────────────────────────
    if (match(['snipe','mensaje borrado','recuperar mensaje','ghost ping'])) {
      return `## Snipe — System 777\n\n- \`/snipe\` — Recuperar el último mensaje borrado en el canal\n- El sistema también detecta **ghost pings** (menciones en mensajes borrados) y los notifica en el canal de seguridad.\n\n**DB:** Datos en memoria (se resetean al reiniciar).`;
    }

    // ── Ayuda general ─────────────────────────────────────────────────────────
    if (match(['ayuda','help','que puedes hacer','que haces','comandos','lista de comandos','que sabes'])) {
      return `## JARVIS — Asistente de System 777\n\nPuedo ayudarte con información sobre todos los sistemas del bot:\n\n**Sistemas disponibles:**\n- 💰 Economía (balance, daily, work, slots, rob...)\n- 📊 Niveles, XP, Logros y Misiones\n- 🔨 Moderación (ban, kick, warn, cases...)\n- 🎵 Música (play, queue, controls)\n- 💎 Premium (planes, códigos, gate)\n- 🛡️ Protección (antiraid, antinuke, automod)\n- 🎫 Tickets, Bienvenida, Autoroles\n- 🏴 Clanes, AFK, Comandos personalizados\n- 🎤 Voice Tracker, Starboard, Giveaway\n- 👑 Staff, Owner commands, Dashboard\n- 🖥️ VPS, Deploy, Logs, Integrity lock\n- 🤖 Network, Fun, Profile\n\nPregúntame cualquier cosa sobre System 777.\n\n**Modo actual:** 📡 Local (API Groq en pausa — respondo desde mi base de conocimiento integrada)`;
    }

    // ── Fallback ──────────────────────────────────────────────────────────────
    const fallbacks = [
      `Entendido. Actualmente opero en **modo local** — la API Groq está en pausa, así que respondo desde mi base de conocimiento integrada sobre System 777.\n\nPuedo ayudarte con: economía, niveles, moderación, música, premium, protección, tickets, clanes, AFK, staff, VPS, deploy, logs y más.\n\n¿Qué necesitas saber?`,
      `Modo local activo. Tengo información completa sobre todos los sistemas de System 777.\n\nPregúntame sobre: comandos, configuración, base de datos, deploy al VPS, errores comunes, sistemas premium, o cualquier feature del bot.\n\n${statusLine}`,
      `Procesando en modo offline. No estoy conectado a Groq ahora mismo, pero tengo la arquitectura completa de System 777 cargada.\n\nEspecifica qué sistema necesitas: moderación, economía, música, premium, protección, staff, VPS...`,
    ];
    return fallbacks[Math.floor(Math.random()*fallbacks.length)];
  }

  app.post('/api/jarvis/chat', auth, express.json(), async (req, res) => {
    const { message, history, model: reqModel, mode } = req.body;
    if (!message?.trim()) return res.status(400).json({ ok: false, error: 'Missing message' });

    const chosenModel = VALID_MODELS.includes(reqModel) ? reqModel : 'llama-3.3-70b-versatile';

    const uptime = Math.floor(process.uptime());
    const premiumUsers = Object.values(db.all('premium')).filter(v => v?.active);
    const premiumByPlan = premiumUsers.reduce((acc, u) => { acc[u.plan] = (acc[u.plan]||0)+1; return acc; }, {});
    const staffCount = Object.keys(db.all('bot_staff')).length;
    const blacklistCount = Object.keys(db.all('blacklist')).length;
    const economyUsers = Object.keys(db.all('economy')).length;

    const botStats = {
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
      ping: client.ws?.ping ?? -1,
      online: client.ws?.status === 0,
    };

    const persona = mode === 'pro'
      ? 'Eres JARVIS, asistente IA avanzado y profesional integrado en el panel de control de System 777. Eres formal, preciso y eficiente.'
      : 'Eres JARVIS (Just A Rather Very Intelligent System), asistente IA integrado en el panel de control de System 777. Tienes la personalidad de Tony Stark: confiado, técnico, ligeramente sarcástico, con sentido del humor, pero siempre extremadamente útil. Ocasionalmente haces referencias a Iron Man o a ser "solo una IA".';

    const systemPrompt = `${persona}
Responde siempre en español. Usa markdown cuando sea útil: \`\`\`código\`\`\`, **negrita**, listas, etc.
Sé directo y conciso. Si no sabes algo, dilo claramente en lugar de inventarlo.

═══ ESTADO DEL BOT SYSTEM 777 ═══
• Servidores: ${botStats.guilds}
• Usuarios totales: ${botStats.users.toLocaleString()}
• Ping WebSocket: ${botStats.ping}ms
• Estado: ${botStats.online ? '✅ Online' : '❌ Offline'}
• Uptime: ${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m ${uptime%60}s
• Modelo IA activo: ${chosenModel}

═══ ESTADÍSTICAS ═══
• Premium activos: ${premiumUsers.length} usuarios
  ${Object.entries(premiumByPlan).map(([p,c])=>`- ${p}: ${c}`).join('\n  ')||'  - (ninguno)'}
• Staff del bot: ${staffCount} miembros
• Comandos slash: 100/100 (límite Discord)
• Blacklist global: ${blacklistCount} usuarios
• Usuarios en economía: ${economyUsers}

═══ ARQUITECTURA ═══
• Runtime: Node.js + Discord.js v14
• DB: File-based JSON (db.js)
• PM2 process: system-777
• Dashboard: Express puerto 3000
• Módulos: music, economy, levels, moderation, protection, premium, staff, achievements, missions, clans, voice tracker

═══ USUARIO ACTIVO ═══
• ${req.session.user?.username || 'Desconocido'}${req.session.user?.discriminator ? '#'+req.session.user.discriminator : ''}${req.session.isOwner ? ' 👑 OWNER — acceso total al sistema' : ''}

Puedes ayudar con: gestión del bot, Discord, moderación, música, economía, sistemas premium, código JavaScript/Node.js, y cualquier otra pregunta.
Si el usuario pide ejecutar algo (reiniciar bot, ver logs, etc.), sugiere usar el Terminal o panel Admin del dashboard en lugar de hacerlo directamente.`;

    // Auto-inject recent logs when user asks about them
    let logContext = '';
    if (/logs?|errores?|pm2|crash|fallo|caído|down\b/i.test(message)) {
      try {
        const { execSync } = require('child_process');
        const raw = execSync('pm2 logs system-777 --lines 18 --nostream 2>&1', { encoding: 'utf8', timeout: 4000 });
        const lines = raw.split('\n').filter(l => l.trim()).slice(-18).join('\n').trim();
        if (lines) logContext = `\n\n═══ LOGS RECIENTES (últimas 18 líneas) ═══\n\`\`\`\n${lines}\n\`\`\``;
      } catch {}
    }

    const msgs = (Array.isArray(history) ? history.slice(-14) : [])
      .map(m => ({ role: m.role, content: String(m.content) }));
    msgs.push({ role: 'user', content: message });

    try {
      const reply = await callGroq(msgs, systemPrompt + logContext, chosenModel);
      res.json({ ok: true, reply, model: chosenModel });
    } catch (e) {
      const localStats = {
        guilds: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
        ping: client.ws?.ping ?? -1,
        online: client.ws?.status === 0,
      };
      const localReply = jarvisLocalResponse(message, localStats);
      res.json({ ok: true, reply: localReply, model: 'local' });
    }
  });

  // ── JARVIS Metrics ───────────────────────────────────────────────────────────
  app.get('/api/jarvis/metrics', auth, (req, res) => {
    const uptime = Math.floor(process.uptime());
    const prem = Object.values(db.all('premium')).filter(v => v?.active);
    const planBreakdown = prem.reduce((a, u) => { a[u.plan] = (a[u.plan]||0)+1; return a; }, {});
    const topGuilds = [...client.guilds.cache.values()]
      .sort((a, b) => (b.memberCount||0) - (a.memberCount||0))
      .slice(0, 6)
      .map(g => ({ name: g.name, members: g.memberCount||0 }));
    res.json({
      ok: true,
      uptime,
      uptimeStr: `${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m`,
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce((a, g) => a + (g.memberCount||0), 0),
      ping: client.ws?.ping ?? -1,
      online: client.ws?.status === 0,
      premium: prem.length,
      planBreakdown,
      staff: Object.keys(db.all('bot_staff')).length,
      blacklist: Object.keys(db.all('blacklist')).length,
      economy: Object.keys(db.all('economy')).length,
      topGuilds,
      memMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    });
  });

  // ── JARVIS Actions (owner only) ──────────────────────────────────────────────
  app.post('/api/jarvis/action', auth, express.json(), async (req, res) => {
    if (!req.session.isOwner) return res.status(403).json({ ok: false, error: 'Owner only' });
    const { action, params } = req.body;
    const { execSync } = require('child_process');
    try {
      switch (action) {
        case 'logs': {
          const out = execSync('pm2 logs system-777 --lines 25 --nostream 2>&1', { encoding: 'utf8', timeout: 6000 });
          res.json({ ok: true, result: out.split('\n').filter(l => l.trim()).slice(-25).join('\n').trim() });
          break;
        }
        case 'pm2_status': {
          const out = execSync('pm2 status 2>&1', { encoding: 'utf8', timeout: 5000 });
          res.json({ ok: true, result: out.trim() });
          break;
        }
        case 'restart': {
          setTimeout(() => { try { execSync('pm2 restart system-777'); } catch {} }, 400);
          res.json({ ok: true, result: 'Reinicio iniciado. El bot vuelve en ~5 segundos.' });
          break;
        }
        case 'broadcast': {
          const msg = params?.message;
          if (!msg) return res.json({ ok: false, error: 'Falta el mensaje' });
          let sent = 0, failed = 0;
          for (const guild of client.guilds.cache.values()) {
            try {
              const ch = guild.systemChannel || guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me)?.has('SendMessages'));
              if (ch) { await ch.send(`📢 **Broadcast:** ${msg}`); sent++; } else failed++;
            } catch { failed++; }
          }
          res.json({ ok: true, result: `Broadcast enviado a ${sent} servidores. ${failed} no disponibles.` });
          break;
        }
        case 'error_log': {
          const out = execSync('tail -n 20 /root/system-777/logs/error.log 2>&1', { encoding: 'utf8', timeout: 4000 });
          res.json({ ok: true, result: out.trim() || 'Sin errores recientes.' });
          break;
        }
        default:
          res.status(400).json({ ok: false, error: `Acción desconocida: ${action}` });
      }
    } catch (e) {
      res.json({ ok: false, error: e.message });
    }
  });

  // ── Local IP ────────────────────────────────────────────────────────────────
  const os = require('os');
  function getLocalIP() {
    for (const iface of Object.values(os.networkInterfaces())) {
      for (const net of iface) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
    return 'localhost';
  }

  const localIP = getLocalIP();
  const server  = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DASHBOARD] http://localhost:${PORT}`);
    console.log(`[DASHBOARD] Red local: http://${localIP}:${PORT}`);
    process.env.DASHBOARD_IP = localIP;
    process.env.DASHBOARD_REAL_PORT = String(PORT);

    // ── NGROK TUNNEL ────────────────────────────────────────
    if (process.env.NGROK_AUTHTOKEN) {
      (async () => {
        try {
          const ngrok = require('@ngrok/ngrok');
          const listener = await ngrok.forward({
            addr:     Number(PORT),
            authtoken: process.env.NGROK_AUTHTOKEN,
            domain:   process.env.NGROK_DOMAIN || undefined,
          });
          const publicUrl = listener.url();
          process.env.DASHBOARD_PUBLIC_URL = publicUrl;
          console.log(`[DASHBOARD] 🌐 PÚBLICO: ${publicUrl}`);
          console.log(`[DASHBOARD] 🔑 OAuth redirect: ${publicUrl}/auth/discord/callback`);

          // DM al owner con la URL pública
          if (process.env.OWNER_ID && client.isReady()) {
            try {
              const owner = await client.users.fetch(process.env.OWNER_ID);
              await owner.send(
                `🌐 **Dashboard online:**\n${publicUrl}\n\n` +
                `🔑 **OAuth redirect URI** (Discord Dev Portal):\n\`${publicUrl}/auth/discord/callback\``
              );
            } catch {}
          }
        } catch (e) {
          console.warn(`[DASHBOARD] ngrok: ${e.message}`);
          console.warn(`[DASHBOARD] Verifica NGROK_AUTHTOKEN en .env`);
        }
      })();
    }
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      const alt = Number(PORT) + 1;
      app.listen(alt, '0.0.0.0', () => {
        console.log(`[DASHBOARD] Puerto ${PORT} ocupado → http://localhost:${alt}`);
        process.env.DASHBOARD_IP = localIP;
        process.env.DASHBOARD_REAL_PORT = String(alt);
      });
    }
  });

  // ── WebSocket Terminal (owner only) ──────────────────────────────────────
  try {
    const { WebSocketServer } = require('ws');
    const { spawn }           = require('child_process');

    const wss = new WebSocketServer({ server, path: '/ws/terminal' });

    wss.on('connection', (ws, req) => {
      const url    = new URL(req.url, `http://localhost`);
      const token  = url.searchParams.get('t');
      const entry  = token ? termTokens.get(token) : null;

      if (!entry || Date.now() - entry.ts > 30000) {
        ws.send(JSON.stringify({ type: 'output', data: '\r\n\x1b[31m⛔ Sin autorización — acceso denegado\x1b[0m\r\n' }));
        return ws.close(4001, 'Unauthorized');
      }
      termTokens.delete(token);

      ws.send(JSON.stringify({ type: 'output', data: `\x1b[32mSystem 777 Terminal — conectado como ${entry.userId}\x1b[0m\r\n` }));
      ws.send(JSON.stringify({ type: 'output', data: `\x1b[33mDirectorio: /root/system-777\x1b[0m\r\n\r\n` }));

      const shell = spawn('bash', [], {
        cwd: '/root/system-777',
        env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
      });

      shell.stdout.on('data', d => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'output', data: d.toString() }));
      });
      shell.stderr.on('data', d => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'output', data: d.toString() }));
      });
      shell.on('close', code => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'output', data: `\r\n\x1b[33m[Shell cerrado — código ${code}]\x1b[0m\r\n` }));
          ws.send(JSON.stringify({ type: 'exit', code }));
        }
        ws.close();
      });

      ws.on('message', raw => {
        try {
          const { type, data } = JSON.parse(raw);
          if (type === 'input' && shell.stdin.writable) shell.stdin.write(data);
          if (type === 'resize') { /* node-pty resize would go here */ }
        } catch {}
      });

      ws.on('close', () => { try { shell.kill('SIGTERM'); } catch {} });
      ws.on('error', () => { try { shell.kill('SIGTERM'); } catch {} });
    });

    console.log('[DASHBOARD] Terminal WebSocket activo en /ws/terminal');
  } catch (e) {
    console.warn('[DASHBOARD] Terminal WebSocket no disponible (instala ws):', e.message);
  }
};
