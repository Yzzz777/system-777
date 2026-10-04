const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db     = require('../../utils/db');
const logger = require('../../utils/logger');
const ipBan  = require('../../systems/ipBan');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('globalban')
    .setDescription('[OWNER] Ban/unban global en todos los servidores')
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Banear globalmente (permanente — solo tú puedes revertir)')
      .addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(true)))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Retirar ban global (solo owner)')
      .addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('Ver lista de bans globales'))
    .addSubcommand(s => s
      .setName('link')
      .setDescription('Vincular cuenta alt a un usuario baneado globalmente')
      .addStringOption(o => o.setName('banned_id').setDescription('ID del usuario baneado principal').setRequired(true))
      .addStringOption(o => o.setName('alt_id').setDescription('ID de la cuenta alt a vincular').setRequired(true)))
    .addSubcommand(s => s
      .setName('unlink')
      .setDescription('Desvincular alt de un usuario baneado')
      .addStringOption(o => o.setName('banned_id').setDescription('ID del usuario baneado principal').setRequired(true))
      .addStringOption(o => o.setName('alt_id').setDescription('ID de la alt a desvincular').setRequired(true)))
    .addSubcommand(s => s
      .setName('alts')
      .setDescription('Ver alts vinculadas a un usuario baneado')
      .addStringOption(o => o.setName('id').setDescription('ID del usuario baneado').setRequired(true)))
    .addSubcommand(s => s
      .setName('ipban')
      .setDescription('Banear IP — acepta IP directa o User ID (auto-lookup)')
      .addStringOption(o => o.setName('objetivo').setDescription('IP (1.2.3.4) o User ID — si es User ID busca su IP automático').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(true)))
    .addSubcommand(s => s
      .setName('ipunban')
      .setDescription('Desbloquear una IP')
      .addStringOption(o => o.setName('ip').setDescription('Dirección IP').setRequired(true)))
    .addSubcommand(s => s
      .setName('iplist')
      .setDescription('Ver IPs baneadas'))
    .addSubcommand(s => s
      .setName('ipcheck')
      .setDescription('Ver IPs y alts de un usuario (User ID o mención)')
      .addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('ipscan')
      .setDescription('[OWNER] Escanear todos los miembros del servidor y enviar IPs conocidas al DM'))
    .addSubcommand(s => s
      .setName('ipaudit')
      .setDescription('Ver historial de acciones IP (bans, unbans, auto-bans)'))
    .addSubcommand(s => s
      .setName('ipstats')
      .setDescription('Ver estadísticas del sistema de IP bans')),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();

    // ── add ──────────────────────────────────────────────────────────────────
    if (sub === 'add') {
      const userId = interaction.options.getString('id');
      const reason = interaction.options.getString('razon');
      const gbans  = db.get('globalbans', 'users', {});
      gbans[userId] = { reason, bannedBy: interaction.user.id, ts: Date.now(), permanent: true };
      db.set('globalbans', 'users', gbans);

      const bl = db.get('blacklist', 'users', {});
      if (!bl[userId]) { bl[userId] = { reason: 'Global Ban', ts: Date.now() }; db.set('blacklist', 'users', bl); }

      let count = 0;
      for (const guild of client.guilds.cache.values()) {
        try {
          await guild.bans.create(userId, { reason: `System 777 Global Ban (permanente): ${reason}` });
          count++;
        } catch {}
      }

      logger.warn(`GlobalBan PERMANENTE aplicado a ${userId} en ${count} servidores. Razón: ${reason}`);

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('⛔ Ban Global Permanente Aplicado')
          .setDescription('Solo tú (owner) puedes revertir este ban.')
          .addFields(
            { name: 'User ID',              value: userId,      inline: true },
            { name: 'Razón',                value: reason,      inline: true },
            { name: 'Servidores afectados', value: `${count}`,  inline: true }
          )
          .setFooter({ text: 'System 777 • Developer 777' })]
      });

    // ── remove ───────────────────────────────────────────────────────────────
    } else if (sub === 'remove') {
      const userId = interaction.options.getString('id');
      const gbans  = db.get('globalbans', 'users', {});
      delete gbans[userId];
      db.set('globalbans', 'users', gbans);

      const bl = db.get('blacklist', 'users', {});
      delete bl[userId];
      db.set('blacklist', 'users', bl);

      let count = 0;
      for (const guild of client.guilds.cache.values()) {
        try { await guild.bans.remove(userId); count++; } catch {}
      }

      logger.info(`GlobalBan retirado de ${userId} en ${count} servidores por ${interaction.user.tag}`);
      await interaction.editReply({ content: `✅ Ban global de \`${userId}\` retirado en ${count} servidores.` });

    // ── list ─────────────────────────────────────────────────────────────────
    } else if (sub === 'list') {
      const gbans = db.get('globalbans', 'users', {});
      const entries = Object.entries(gbans);
      const desc = entries.length
        ? entries.map(([id, d]) => `\`${id}\` — ${d.reason} (<t:${Math.floor(d.ts/1000)}:R>)${d.permanent ? ' 🔒' : ''}`).join('\n').slice(0, 2000)
        : 'No hay bans globales.';

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(`⛔ Bans Globales (${entries.length}) — 🔒 = permanente`)
          .setDescription(desc)
          .setFooter({ text: 'System 777 • Developer 777' })]
      });

    // ── link ─────────────────────────────────────────────────────────────────
    } else if (sub === 'link') {
      const bannedId = interaction.options.getString('banned_id');
      const altId    = interaction.options.getString('alt_id');

      const gbans = db.get('globalbans', 'users', {});
      if (!gbans[bannedId]) {
        return interaction.editReply({ content: `❌ \`${bannedId}\` no está en la lista de bans globales. Banéalo primero con \`/globalban add\`.` });
      }
      if (bannedId === altId) {
        return interaction.editReply({ content: '❌ No puedes vincularte a ti mismo.' });
      }

      const altLinks = db.get('globalbans', 'alt_links', {});
      if (!altLinks[bannedId]) altLinks[bannedId] = [];
      if (altLinks[bannedId].includes(altId)) {
        return interaction.editReply({ content: `❌ \`${altId}\` ya está vinculada a \`${bannedId}\`.` });
      }
      altLinks[bannedId].push(altId);
      db.set('globalbans', 'alt_links', altLinks);

      // Ban the alt immediately in all servers
      let count = 0;
      const reason = `Alt vinculada de ${bannedId}: ${gbans[bannedId].reason}`;
      for (const guild of client.guilds.cache.values()) {
        try {
          await guild.bans.create(altId, { reason: `System 777 · Alt de usuario baneado globalmente (${bannedId}): ${gbans[bannedId].reason}` });
          count++;
        } catch {}
      }

      // Add alt to global ban list too
      const gbansUpdated = db.get('globalbans', 'users', {});
      if (!gbansUpdated[altId]) {
        gbansUpdated[altId] = { reason, bannedBy: 'system:alt_link', ts: Date.now(), permanent: true, parentId: bannedId };
        db.set('globalbans', 'users', gbansUpdated);
      }

      logger.warn(`Alt ${altId} vinculada a ${bannedId} y baneada en ${count} servidores.`);

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4400)
          .setTitle('🔗 Alt Vinculada y Baneada')
          .addFields(
            { name: 'Usuario baneado principal', value: `\`${bannedId}\``, inline: true },
            { name: 'Alt vinculada',              value: `\`${altId}\``,    inline: true },
            { name: 'Baneada en',                 value: `${count} servidores`, inline: true },
            { name: 'Efecto',                     value: 'Si esta alt intenta entrar a cualquier servidor, será baneada automáticamente.' }
          )
          .setFooter({ text: 'System 777 • Developer 777' })]
      });

    // ── unlink ───────────────────────────────────────────────────────────────
    } else if (sub === 'unlink') {
      const bannedId = interaction.options.getString('banned_id');
      const altId    = interaction.options.getString('alt_id');

      const altLinks = db.get('globalbans', 'alt_links', {});
      if (!altLinks[bannedId] || !altLinks[bannedId].includes(altId)) {
        return interaction.editReply({ content: `❌ \`${altId}\` no está vinculada a \`${bannedId}\`.` });
      }
      altLinks[bannedId] = altLinks[bannedId].filter(x => x !== altId);
      if (altLinks[bannedId].length === 0) delete altLinks[bannedId];
      db.set('globalbans', 'alt_links', altLinks);

      await interaction.editReply({ content: `✅ Alt \`${altId}\` desvinculada de \`${bannedId}\`.` });

    // ── alts ─────────────────────────────────────────────────────────────────
    } else if (sub === 'alts') {
      const userId   = interaction.options.getString('id');
      const altLinks = db.get('globalbans', 'alt_links', {});
      const alts     = altLinks[userId] || [];
      const desc = alts.length
        ? alts.map((id, i) => `${i + 1}. \`${id}\``).join('\n')
        : 'Sin alts vinculadas.';

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4400)
          .setTitle(`🔗 Alts vinculadas a \`${userId}\` (${alts.length})`)
          .setDescription(desc)
          .setFooter({ text: 'System 777 • Developer 777' })]
      });

    // ── ipban ─────────────────────────────────────────────────────────────────
    } else if (sub === 'ipban') {
      const objetivo = interaction.options.getString('objetivo').trim();
      const reason   = interaction.options.getString('razon');

      const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(objetivo);
      let ipsToban = [];

      if (isIp) {
        ipsToban = [objetivo];
      } else {
        // User ID → buscar IPs del registro
        const userIps = ipBan.getUserIps(objetivo);
        ipsToban = userIps.map(u => u.ip);
        if (!ipsToban.length) {
          return interaction.editReply({
            content: `❌ No hay IPs registradas para \`${objetivo}\`.\n> El usuario nunca hizo clic en el link de tracking.`
          });
        }
      }

      let totalUsers = 0, totalGuildBans = 0;
      const ipsBanned = [];
      const lookups = [];
      const startTime = Date.now();
      const TIMEOUT_MS = 13 * 60 * 1000;
      let timedOut = false;

      for (const ip of ipsToban) {
        if (Date.now() - startTime > TIMEOUT_MS) { timedOut = true; break; }

        const banEntry = ipBan.banIp(ip, reason, interaction.user.id);
        ipsBanned.push(ip);

        const lookup = await ipBan.lookupIp(ip).catch(() => null);
        if (lookup) {
          lookups.push(lookup);
          banEntry.lookup = lookup;
          const bannedIps = db.get('ip_registry', 'banned_ips', {});
          bannedIps[ip] = banEntry;
          db.set('ip_registry', 'banned_ips', bannedIps);
        }

        const reg = db.get('ip_registry', 'data', {});
        const usersOnIp = reg[ip] || [];
        totalUsers += usersOnIp.length;
        const gbans = db.get('globalbans', 'users', {});
        for (const userId of usersOnIp) {
          gbans[userId] = { reason: `IP Ban (${ip}): ${reason}`, bannedBy: interaction.user.id, ts: Date.now(), permanent: true };
        }
        if (usersOnIp.length) db.set('globalbans', 'users', gbans);

        const banPromises = [];
        for (const userId of usersOnIp) {
          for (const guild of client.guilds.cache.values()) {
            banPromises.push(
              guild.bans.create(userId, { reason: `System 777 · IP Ban: ${reason}` })
                .then(() => { totalGuildBans++; })
                .catch(() => {})
            );
          }
        }

        for (let i = 0; i < banPromises.length; i += 10) {
          if (Date.now() - startTime > TIMEOUT_MS) { timedOut = true; break; }
          await Promise.all(banPromises.slice(i, i + 10));
        }
        if (timedOut) break;
      }

      logger.warn(`IP Ban: ${ipsBanned.join(', ')} — ${totalUsers} usuarios, ${totalGuildBans} guild bans. Razón: ${reason}${timedOut ? ' (timeout parcial)' : ''}`);

      const lookupInfo = lookups.length
        ? lookups.map(l => `**${l.ip}** → ${l.city || '?'}, ${l.country || '?'} · ISP: ${l.isp || '?'} · AS: ${l.as || '?'}`).join('\n')
        : 'Sin datos de ubicación';

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(`🌐 IP(s) Baneada(s)${timedOut ? ' ⏱️ (parcial)' : ''}`)
          .addFields(
            { name: 'IPs baneadas',      value: ipsBanned.map(ip => `\`${ip}\``).join('\n') || '-', inline: true },
            { name: 'Cuentas afectadas', value: `${totalUsers}`,   inline: true },
            { name: 'Guild bans',        value: `${totalGuildBans}`, inline: true },
            { name: '📍 Lookup',         value: lookupInfo,        inline: false },
            { name: '📝 Razón',          value: reason,            inline: false },
            { name: '⚡ Efecto',         value: timedOut
              ? '⚠️ Timeout parcial: se procesaron las IPs en los primeros 13 minutos. Las cuentas registradas en DB ya están baneadas globalmente.'
              : 'Cuentas baneadas globalmente. Acceso futuro desde estas IPs será rechazado automáticamente.' }
          )
          .setFooter({ text: 'System 777 · Developer 777 · IP Ban System' })
          .setTimestamp()]
      });

    // ── ipunban ───────────────────────────────────────────────────────────────
    } else if (sub === 'ipunban') {
      const ip = interaction.options.getString('ip');
      const result = ipBan.unbanIp(ip, interaction.user.id);
      if (!result) return interaction.editReply({ content: `❌ \`${ip}\` no está baneada.` });

      let unbannedUsers = '';
      if (result.unbannedCount > 0) {
        // Desbanear de Discord
        for (const [userId, gban] of Object.entries(db.get('globalbans', 'users', {}))) {
          if (gban.reason?.includes(`IP Ban (${ip})`)) {
            for (const guild of client.guilds.cache.values()) {
              try { await guild.bans.remove(userId, `System 777 · IP Unban: ${ip}`); } catch {}
            }
          }
        }
        unbannedUsers = `\n**${result.unbannedCount}** cuentas desbaneadas de Discord.`;
      }

      logger.info(`IP Unban: ${ip} por ${interaction.user.tag}. ${result.unbannedCount} cuentas desbaneadas.`);
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ IP Desbloqueada')
          .setDescription(`IP \`${ip}\` desbloqueada correctamente.${unbannedUsers}`)
          .addFields(
            { name: 'IP',        value: `\`${ip}\``,        inline: true },
            { name: 'Razón original', value: result.originalBan.reason || '-', inline: true },
            { name: 'Baneada por',    value: `<@${result.originalBan.bannedBy}>`, inline: true },
          )
          .setFooter({ text: 'System 777 • Developer 777' })
          .setTimestamp()]
      });

    // ── iplist ────────────────────────────────────────────────────────────────
    } else if (sub === 'iplist') {
      const banned = ipBan.getBannedIps();
      const desc = banned.length
        ? banned.map(d => {
            const loc = d.lookup ? ` · ${d.lookup.city || ''}, ${d.lookup.country || ''}` : '';
            return `\`${d.ip}\` — ${d.reason}${loc} (<t:${Math.floor(d.ts/1000)}:R>)`;
          }).join('\n').slice(0, 2000)
        : 'No hay IPs baneadas.';
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(`🌐 IPs Baneadas (${banned.length})`)
          .setDescription(desc)
          .setFooter({ text: 'System 777 · Developer 777 · IP Ban System' })]
      });

    // ── ipcheck ───────────────────────────────────────────────────────────────
    } else if (sub === 'ipcheck') {
      const userId  = interaction.options.getString('id');
      const userIps = ipBan.getUserIps(userId);

      if (!userIps.length) {
        return interaction.editReply({ content: `❌ \`${userId}\` no ha verificado aún — no hay IPs registradas.` });
      }

      let desc = '';
      for (const entry of userIps) {
        const status = entry.isBanned ? '🔴 BANEADA' : '🟢 libre';
        desc += `**\`${entry.ip}\`** ${status}\n`;
        if (entry.banReason) desc += `  └ Razón: ${entry.banReason}\n`;
        if (entry.otherUsers.length) desc += `  └ Otras cuentas: ${entry.otherUsers.map(id => `\`${id}\``).join(', ')}\n`;
      }

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4400)
          .setTitle(`🌐 IPs de \`${userId}\` (${userIps.length})`)
          .setDescription(desc.slice(0, 2000) || 'Sin datos')
          .setFooter({ text: 'System 777 · Developer 777 · IP Ban System' })]
      });

    // ── ipscan ─────────────────────────────────────────────────────────────
    } else if (sub === 'ipscan') {
      await interaction.editReply({ content: '🔍 Escaneando miembros... esto llegará a tu DM en segundos.' });

      const uips      = db.get('ip_registry', 'user_ips', {});
      const reg       = db.get('ip_registry', 'data', {});
      const bannedIps = db.get('ip_registry', 'banned_ips', {});
      const gbans     = db.get('globalbans', 'users', {});

      // Fetch all members from current guild
      let members;
      try {
        members = await interaction.guild.members.fetch();
      } catch {
        return interaction.editReply({ content: '❌ No pude obtener la lista de miembros.' });
      }

      const results = [];
      for (const [, member] of members) {
        if (member.user.bot) continue;
        const userId = member.user.id;
        const ips    = uips[userId];
        if (!ips?.length) continue;

        const isGBanned = gbans[userId] ? '⛔' : '';
        const ipLines = ips.map(ip => {
          const banned  = bannedIps[ip] ? ' 🔴BAN' : '';
          const others  = (reg[ip] || []).filter(id => id !== userId);
          const altStr  = others.length ? ` [alts: ${others.join(',')}]` : '';
          return `  \`${ip}\`${banned}${altStr}`;
        }).join('\n');

        results.push(`${isGBanned} **${member.user.tag}** (\`${userId}\`)\n${ipLines}`);
      }

      if (!results.length) {
        try {
          await interaction.user.send('🔍 **IP Scan** — Ningún miembro tiene IPs registradas aún. Deben hacer clic en el link de tracking primero.');
        } catch {}
        return;
      }

      // Split into chunks of 10 users per DM message
      const chunks = [];
      for (let i = 0; i < results.length; i += 10) chunks.push(results.slice(i, i + 10));

      try {
        await interaction.user.send(`🌐 **IP Scan — ${interaction.guild.name}**\n${results.length} miembros con IPs registradas:\n${'─'.repeat(40)}`);
        for (const chunk of chunks) {
          await interaction.user.send(chunk.join('\n\n').slice(0, 1900));
        }
        await interaction.user.send(`✅ Scan completo. ${results.length} entradas. Total en registro global: ${Object.keys(uips).length} usuarios.`);
      } catch {
        await interaction.editReply({ content: '❌ No pude enviarte el DM. Asegúrate de tener los DMs abiertos.' });
      }

    // ── ipaudit ─────────────────────────────────────────────────────────────
    } else if (sub === 'ipaudit') {
      const audit = ipBan.getAuditLog(25);
      const desc = audit.length
        ? audit.map(e => {
            const action = { ip_ban: '🔴 IP BAN', ip_unban: '🟢 IP UNBAN', auto_ban_on_join: '⚡ AUTO-BAN JOIN' }[e.action] || e.action;
            const who = e.bannedBy ? `<@${e.bannedBy}>` : e.unbannedBy ? `<@${e.unbannedBy}>` : 'system';
            const loc = e.lookup ? ` · ${e.lookup.city || ''}, ${e.lookup.country || ''}` : '';
            return `${action} \`${e.ip}\`${loc}\n  por ${who} — ${e.reason || ''} (<t:${Math.floor(e.ts/1000)}:R>)`;
          }).join('\n\n').slice(0, 2000)
        : 'Sin registros de auditoría.';

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF9900)
          .setTitle(`📋 Auditoría IP Bans (${audit.length} entradas recientes)`)
          .setDescription(desc)
          .setFooter({ text: 'System 777 · IP Audit Log' })
          .setTimestamp()]
      });

    // ── ipstats ─────────────────────────────────────────────────────────────
    } else if (sub === 'ipstats') {
      const stats = ipBan.getStats();
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📊 Estadísticas IP Ban System')
          .addFields(
            { name: '🔴 IPs Baneadas',     value: `${stats.totalBannedIps}`,   inline: true },
            { name: '👤 Usuarios rastreados', value: `${stats.totalTrackedUsers}`, inline: true },
            { name: '🌐 IPs registradas',    value: `${stats.totalTrackedIps}`,  inline: true },
            { name: '📋 Entradas auditoría', value: `${stats.totalAuditEntries}`, inline: true },
          )
          .setFooter({ text: 'System 777 · IP Ban Stats' })
          .setTimestamp()]
      });
    }
  }
};
