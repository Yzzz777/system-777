const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/db');
const { infoEmbed } = require('../../utils/embeds');

const SYSTEMS = [
  { name: 'antiflood',   label: 'Anti-Flood',     emoji: '🚨' },
  { name: 'antilink',    label: 'Anti-Link',       emoji: '🔗' },
  { name: 'anticaps',    label: 'Anti-Caps',       emoji: '🔡' },
  { name: 'antiemoji',   label: 'Anti-Emoji',      emoji: '😵' },
  { name: 'wordfilter',  label: 'Word Filter',     emoji: '🚫' },
  { name: 'phishing',    label: 'Anti-Phishing',   emoji: '🎣' },
  { name: 'antitoken',   label: 'Anti-Token',      emoji: '🔑' },
  { name: 'antizalgo',   label: 'Anti-Zalgo',      emoji: '̷' },
  { name: 'antinsfw',    label: 'Anti-NSFW',       emoji: '🔞' },
];

const TYPE_CHOICES = [
  { name: 'Usuario', value: 'user'    },
  { name: 'Canal',   value: 'channel' },
  { name: 'Rol',     value: 'role'    },
];

const ENTITY_TYPES = ['user', 'channel', 'role'];
const ENTITY_KEYS  = { user: 'users', channel: 'channels', role: 'roles' };
const ENTITY_LABELS = { user: 'usuario', channel: 'canal', role: 'rol' };

function getSystemWl(guildId, system) {
  const cfg = db.get('guilds', guildId, {});
  if (!cfg.whitelists) cfg.whitelists = {};
  if (!cfg.whitelists[system]) cfg.whitelists[system] = { users: [], channels: [], roles: [] };
  return cfg.whitelists[system];
}

function saveSystemWl(guildId, system, wl) {
  const cfg = db.get('guilds', guildId, {});
  if (!cfg.whitelists) cfg.whitelists = {};
  cfg.whitelists[system] = wl;
  db.set('guilds', guildId, cfg);
}

function isWhitelistedFor(message, system) {
  if (!message.guild) return false;
  const wl = getSystemWl(message.guild.id, system);
  if (wl.users?.includes(message.author.id)) return true;
  if (wl.channels?.includes(message.channel.id)) return true;
  if (wl.roles?.length && message.member?.roles?.cache?.some(r => wl.roles.includes(r.id))) return true;
  return false;
}

module.exports = {
  SYSTEMS,
  ENTITY_KEYS,
  isWhitelistedFor,

  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Gestiona la whitelist por sistema (granular) y blacklist global')
    // ── SYSTEM ADD ──
    .addSubcommand(s => s
      .setName('system-add')
      .setDescription('Eximir de un sistema específico')
      .addStringOption(o => o.setName('sistema').setDescription('Sistema a eximir').setRequired(true).addChoices(
        ...SYSTEMS.map(s => ({ name: `${s.emoji} ${s.label}`, value: s.name }))
      ))
      .addStringOption(o => o.setName('tipo').setDescription('Tipo de entidad').setRequired(true).addChoices(...TYPE_CHOICES))
      .addStringOption(o => o.setName('id').setDescription('ID del usuario/canal/rol').setRequired(true)))
    // ── SYSTEM REMOVE ──
    .addSubcommand(s => s
      .setName('system-remove')
      .setDescription('Remover exención de un sistema')
      .addStringOption(o => o.setName('sistema').setDescription('Sistema').setRequired(true).addChoices(
        ...SYSTEMS.map(s => ({ name: `${s.emoji} ${s.label}`, value: s.name }))
      ))
      .addStringOption(o => o.setName('tipo').setDescription('Tipo de entidad').setRequired(true).addChoices(...TYPE_CHOICES))
      .addStringOption(o => o.setName('id').setDescription('ID').setRequired(true)))
    // ── SYSTEM LIST ──
    .addSubcommand(s => s
      .setName('system-list')
      .setDescription('Ver exenciones por sistema'))
    // ── BOT WHITELIST (anti-raid) ──
    .addSubcommand(s => s
      .setName('bot-add')
      .setDescription('Whitelistear bot (anti-raid)')
      .addStringOption(o => o.setName('id').setDescription('Bot Client ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('bot-remove')
      .setDescription('Remover bot de whitelist')
      .addStringOption(o => o.setName('id').setDescription('Bot Client ID').setRequired(true)))
    // ── BLACKLIST ──
    .addSubcommand(s => s
      .setName('blacklist-add')
      .setDescription('Banear usuario globalmente')
      .addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Razón')))
    .addSubcommand(s => s
      .setName('blacklist-remove')
      .setDescription('Remover de blacklist global')
      .addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true)))
    // ── LIST ALL ──
    .addSubcommand(s => s
      .setName('list')
      .setDescription('Ver todas las listas'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── SYSTEM ADD ──
    if (sub === 'system-add') {
      if (!interaction.guildId) return interaction.reply({ content: '❌ Solo en servidores.', flags: MessageFlags.Ephemeral });
      const system = interaction.options.getString('sistema');
      const tipo   = interaction.options.getString('tipo');
      const id     = interaction.options.getString('id');
      const wl     = getSystemWl(interaction.guildId, system);
      const key    = ENTITY_KEYS[tipo];
      if (!wl[key].includes(id)) { wl[key].push(id); saveSystemWl(interaction.guildId, system, wl); }
      const sysInfo = SYSTEMS.find(s => s.name === system);
      const label   = tipo === 'role' ? `<@&${id}>` : tipo === 'channel' ? `<#${id}>` : `<@${id}>`;
      return interaction.reply({
        content: `${sysInfo.emoji} ${label} (\`${id}\`) exento de **${sysInfo.label}**.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // ── SYSTEM REMOVE ──
    if (sub === 'system-remove') {
      if (!interaction.guildId) return interaction.reply({ content: '❌ Solo en servidores.', flags: MessageFlags.Ephemeral });
      const system = interaction.options.getString('sistema');
      const tipo   = interaction.options.getString('tipo');
      const id     = interaction.options.getString('id');
      const wl     = getSystemWl(interaction.guildId, system);
      const key    = ENTITY_KEYS[tipo];
      wl[key] = wl[key].filter(x => x !== id);
      saveSystemWl(interaction.guildId, system, wl);
      const sysInfo = SYSTEMS.find(s => s.name === system);
      return interaction.reply({
        content: `\`${id}\` removido de exención de **${sysInfo.label}**.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // ── SYSTEM LIST ──
    if (sub === 'system-list') {
      if (!interaction.guildId) return interaction.reply({ content: '❌ Solo en servidores.', flags: MessageFlags.Ephemeral });
      const cfg = db.get('guilds', interaction.guildId, {});
      const allWl = cfg.whitelists || {};
      const fields = [];
      for (const sys of SYSTEMS) {
        const wl = allWl[sys.name] || { users: [], channels: [], roles: [] };
        const u = wl.users?.map(id => `<@${id}>`).join(', ')    || '—';
        const c = wl.channels?.map(id => `<#${id}>`).join(', ') || '—';
        const r = wl.roles?.map(id => `<@&${id}>`).join(', ')   || '—';
        const total = (wl.users?.length || 0) + (wl.channels?.length || 0) + (wl.roles?.length || 0);
        fields.push({
          name: `${sys.emoji} ${sys.label} (${total})`,
          value: `👤 ${u}\n📢 ${c}\n🎭 ${r}`,
          inline: false,
        });
      }
      return interaction.reply({
        embeds: [infoEmbed('📋 Whitelist por Sistema', 'Exenciones granulares de cada sistema de protección', { fields })],
        flags: MessageFlags.Ephemeral
      });
    }

    // ── BOT ADD (anti-raid) ──
    if (sub === 'bot-add') {
      const id   = interaction.options.getString('id');
      const list = db.get('whitelist', 'bots', []);
      if (!list.includes(id)) { list.push(id); db.set('whitelist', 'bots', list); }
      return interaction.reply({ content: `🤖 Bot \`${id}\` añadido a whitelist anti-raid.`, flags: MessageFlags.Ephemeral });
    }

    // ── BOT REMOVE ──
    if (sub === 'bot-remove') {
      const id   = interaction.options.getString('id');
      const list = db.get('whitelist', 'bots', []).filter(x => x !== id);
      db.set('whitelist', 'bots', list);
      return interaction.reply({ content: `🤖 Bot \`${id}\` removido de whitelist anti-raid.`, flags: MessageFlags.Ephemeral });
    }

    // ── BLACKLIST ADD ──
    if (sub === 'blacklist-add') {
      const id     = interaction.options.getString('id');
      const reason = interaction.options.getString('razon') || 'Sin razón';
      const list   = db.get('blacklist', 'users', {});
      if (!list[id]) { list[id] = { addedAt: Date.now(), reason }; db.set('blacklist', 'users', list); }
      return interaction.reply({ content: `🚫 \`${id}\` baneado globalmente.\nRazón: ${reason}`, flags: MessageFlags.Ephemeral });
    }

    // ── BLACKLIST REMOVE ──
    if (sub === 'blacklist-remove') {
      const id   = interaction.options.getString('id');
      const list = db.get('blacklist', 'users', {});
      delete list[id];
      db.set('blacklist', 'users', list);
      return interaction.reply({ content: `✅ \`${id}\` removido de blacklist.`, flags: MessageFlags.Ephemeral });
    }

    // ── LIST ALL ──
    if (sub === 'list') {
      const wlB = db.get('whitelist', 'bots', []);
      const bl  = db.get('blacklist', 'users', {});
      const blKeys = Object.keys(bl);

      const fields = [
        { name: `🤖 Anti-Raid — Bots (${wlB.length})`, value: wlB.length ? wlB.map(id=>`\`${id}\``).join(', ').slice(0,512) : 'Ninguno' },
      ];

      if (interaction.guildId) {
        const cfg = db.get('guilds', interaction.guildId, {});
        const allWl = cfg.whitelists || {};
        for (const sys of SYSTEMS) {
          const wl = allWl[sys.name] || { users: [], channels: [], roles: [] };
          const total = (wl.users?.length || 0) + (wl.channels?.length || 0) + (wl.roles?.length || 0);
          if (total === 0) continue;
          const parts = [];
          if (wl.users?.length)    parts.push(`👤 ${wl.users.map(id=>`\`${id}\``).join(', ')}`);
          if (wl.channels?.length) parts.push(`📢 ${wl.channels.map(id=>`\`${id}\``).join(', ')}`);
          if (wl.roles?.length)    parts.push(`🎭 ${wl.roles.map(id=>`\`${id}\``).join(', ')}`);
          fields.push({ name: `${sys.emoji} ${sys.label} (${total})`, value: parts.join('\n').slice(0,512) });
        }
      }

      fields.push({ name: `🚫 Blacklist (${blKeys.length})`, value: blKeys.length ? blKeys.map(id=>`\`${id}\``).join(', ').slice(0,512) : 'Ninguna' });

      return interaction.reply({
        embeds: [infoEmbed('📋 Todas las Listas — System 777', null, { fields })],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
