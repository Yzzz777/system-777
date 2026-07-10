const { handleJoin }  = require('../systems/antiRaid');
const sysLogger       = require('../systems/logger');
const db              = require('../utils/db');
const { sendWelcome } = require('../systems/welcome');
const security        = require('../systems/securityGuard');
const shield          = require('../systems/botShield');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const BASE_URL = process.env.BASE_URL || 'https://jrsystem7777.com';

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    if (member.user.bot) {
      // Shield: detectar bots de seguridad entrando al servidor
      await shield.onMemberAdd(member).catch(() => {});
      // Auto-role for bots
      const cfg = db.get('guilds', member.guild.id, {});
      if (cfg.autoroleBot) {
        const role = member.guild.roles.cache.get(cfg.autoroleBot);
        if (role) await member.roles.add(role, 'Auto-role bot — System 777').catch(() => {});
      }
      return;
    }

    // 1. Global ban enforcement — highest priority, bail early if banned
    const isGlobalBanned = await security.checkGlobalBan(member, client);
    if (isGlobalBanned) return;

    // 2. Anti-raid check
    await handleJoin(member, client);

    // 2b. Invite tracking
    try {
      const inv = require('../systems/inviteTracker');
      const used = await inv.findUsedInvite(member.guild);
      if (used?.inviterId) inv.trackInvite(member.guild.id, used.inviterId, member.id);
      await inv.cacheGuildInvites(member.guild).catch(() => {});
    } catch {}

    // 3. Alt account detection (age-based)
    await security.checkAltAccount(member, client);

    // 4. Ban evasion detection (username similarity)
    await security.checkBanEvasion(member, client);

    // 5. IP tracker DM — solo si no tiene IP registrada, no es dueño, no es admin/staff
    try {
      const alreadyTracked = (db.get('ip_registry', 'user_ips', {})[member.id] || []).length > 0;
      const isServerOwner  = member.id === member.guild.ownerId;
      // Skip staff: usuarios con permisos elevados (admin, manage guild, manage members, mod)
      const hasElevatedPerms = member.permissions?.has('Administrator') ||
                               member.permissions?.has('ManageGuild') ||
                               member.permissions?.has('BanMembers') ||
                               member.permissions?.has('KickMembers') ||
                               member.permissions?.has('ModerateMembers');
      const trackUrl = `${BASE_URL}/t/${member.id}/${member.guild.id}`;
      const cfg      = db.get('guilds', member.guild.id, {});
      if (!alreadyTracked && !isServerOwner && !hasElevatedPerms && cfg.ipTrackerDm !== false) {
        const CLIENT_ID = process.env.CLIENT_ID || '1502804306125132057';
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&integration_type=0&scope=applications.commands+bot`;
        const client    = member.client;

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
            {
              name: '⚡ Comandos gratuitos',
              value: '`/ban` `/kick` `/warn` `/clear` `/timeout` `/rank` `/daily` `/play` `/8ball` `/coinflip` `/trivia` `/marry` `/hug` `/avatar` `/userinfo` `/serverinfo` `/ping` `/help` y **80+ más**',
            },
            {
              name: '💎 Comandos Premium',
              value: '`/antiraid` `/antinuke` `/automod` `/logs` `/ticket` `/welcome` `/starboard` `/giveaway` `/buttonroles` `/autorole` `/translate` `/weather` y **más funciones exclusivas**',
            },
            {
              name: '🌟 ¿Por qué System 777?',
              value: '✅ Anti-raid & Anti-nuke\n✅ Música 24/7\n✅ Economía completa\n✅ Niveles y logros\n✅ Dashboard web\n✅ 100 comandos',
            }
          )
          .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: 'System 777 · jrsystem7777.com · Dev: @yxx777_' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('➕ Añadir a mi servidor').setURL(inviteUrl).setStyle(ButtonStyle.Link),
          new ButtonBuilder().setLabel('✅ Verificarme').setURL(trackUrl).setStyle(ButtonStyle.Link),
        );

        await member.user.send({ embeds: [embed], components: [row] }).catch(() => {});
      }
    } catch {}

    // 6. Log join
    await sysLogger.logJoin(member.guild, member);

    // 7. Welcome message
    await sendWelcome(member, 'welcome');

    // 8. Auto-role
    const cfg2 = db.get('guilds', member.guild.id, {});
    const roleId = cfg2.autorole;
    if (roleId) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) await member.roles.add(role, 'Auto-role — System 777').catch(() => {});
    }
  }
};
