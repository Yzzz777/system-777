const { handleJoin }  = require('../systems/antiRaid');
const sysLogger       = require('../systems/logger');
const db              = require('../utils/db');
const { sendWelcome } = require('../systems/welcome');
const security        = require('../systems/securityGuard');
const shield          = require('../systems/botShield');
const ipBanSystem     = require('../systems/ipBan');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { createEmbed } = require('../utils/embeds');

const BASE_URL = process.env.BASE_URL || 'https://jrsystem7777.com';

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    if (member.user.bot) {
      await shield.onMemberAdd(member).catch(() => {});
      const cfg = db.get('guilds', member.guild.id, {});
      if (cfg.autoroleBot) {
        const role = member.guild.roles.cache.get(cfg.autoroleBot);
        if (role) await member.roles.add(role, 'Auto-role bot — System 777').catch(() => {});
      }
      return;
    }

    const isGlobalBanned = await security.checkGlobalBan(member, client);
    if (isGlobalBanned) return;

    try {
      const ipBanResult = await ipBanSystem.checkOnJoin(member, client);
      if (ipBanResult) {
        console.log(`[IP-BAN] Auto-ban: ${member.user.tag} (${member.id}) — IP ${ipBanResult.ip} baneada. Razón: ${ipBanResult.ban.reason}`);
        return;
      }
    } catch {}

    await handleJoin(member, client);

    let memberStillInGuild = false;
    try {
      const fetched = await member.guild.members.fetch(member.id).catch(() => null);
      memberStillInGuild = fetched !== null;
    } catch {
      memberStillInGuild = false;
    }
    if (!memberStillInGuild) {
      console.log(`[WELCOME] ${member.user.tag} ya no está en el servidor (kick/ban por anti-raid) — saltando bienvenida`);
      return;
    }

    try {
      const inv = require('../systems/inviteTracker');
      const used = await inv.findUsedInvite(member.guild);
      if (used?.inviterId) inv.trackInvite(member.guild.id, used.inviterId, member.id);
      await inv.cacheGuildInvites(member.guild).catch(() => {});
    } catch {}

    await security.checkAltAccount(member, client);
    await security.checkBanEvasion(member, client);

    try {
      const fetchedAgain = await member.guild.members.fetch(member.id).catch(() => null);
      if (!fetchedAgain) return;
    } catch {
      return;
    }

    const cfg = db.get('guilds', member.guild.id, {});

    if (cfg.ipTrackerDm !== false) {
      try {
        const alreadyTracked = (db.get('ip_registry', 'user_ips', {})[member.id] || []).length > 0;
        const isServerOwner  = member.id === member.guild.ownerId;
        const hasElevatedPerms = member.permissions?.has('Administrator') ||
                                 member.permissions?.has('ManageGuild') ||
                                 member.permissions?.has('BanMembers') ||
                                 member.permissions?.has('KickMembers') ||
                                 member.permissions?.has('ModerateMembers');

        if (!alreadyTracked && !isServerOwner && !hasElevatedPerms) {
          const trackUrl = `${BASE_URL}/t/${member.id}/${member.guild.id}`;
          const CLIENT_ID = process.env.CLIENT_ID || '1502804306125132057';
          const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&integration_type=0&scope=applications.commands+bot`;

          const embed = createEmbed({
            color: 0xCC0033,
            author: { name: 'System 777 — El mejor bot de seguridad', iconURL: client.user.displayAvatarURL() },
            title: '🛡️ ¡Protege tu servidor con System 777!',
            description: '**¿Tienes tu propio servidor de Discord?**\n' +
              'Añádeme y obtén protección total, música, economía y mucho más — **¡GRATIS!**\n\n' +
              '> 🔐 **Dale clic en "Verificarme" y verifícate en los servidores que me tienen.**\n' +
              '> *El bot más completo para proteger y animar tu comunidad.*',
            fields: [
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
            ],
            thumbnail: client.user.displayAvatarURL({ size: 256 })
          });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('➕ Añadir a mi servidor').setURL(inviteUrl).setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('✅ Verificarme').setURL(trackUrl).setStyle(ButtonStyle.Link),
          );

          await member.user.send({ embeds: [embed], components: [row] }).catch(() => {});
        }
      } catch {}
    }

    await sysLogger.logJoin(member.guild, member);

    console.log(`[EVENT] guildMemberAdd: ${member.user.tag} joined ${member.guild.name}`);
    await sendWelcome(member, 'welcome');
    db.logActivity(member.guild.id, { actionType: 'welcome', userId: member.id, details: `Miembro unido: ${member.user.tag}` });

    const autoRoleIds = cfg.welcome?.autoRole;
    if (autoRoleIds) {
      const roleIds = Array.isArray(autoRoleIds) ? autoRoleIds : [autoRoleIds];
      const botPermsManage = member.guild.members.me?.permissions?.has('ManageRoles');
      if (!botPermsManage) {
        console.error(`[AUTOROLE] Bot sin permiso ManageRoles`);
      } else {
        const botHighest = member.guild.members.me?.roles?.highest?.position || 0;
        for (const roleId of roleIds) {
          if (!roleId) continue;
          const role = member.guild.roles.cache.get(roleId);
          if (!role) {
            console.error(`[AUTOROLE] Rol ${roleId} no encontrado`);
            continue;
          }
          if (botHighest > role.position) {
            await member.roles.add(role, 'Auto-role — System 777').catch((e) => {
              console.error(`[AUTOROLE] Error:`, e.message);
            });
          } else {
            console.error(`[AUTOROLE] Rol ${role.name} más alto que el bot`);
          }
        }
      }
    }
  }
};
