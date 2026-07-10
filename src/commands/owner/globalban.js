const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db     = require('../../utils/db');
const logger = require('../../utils/logger');

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
      .setDescription('[OWNER] Escanear todos los miembros del servidor y enviar IPs conocidas al DM')),

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
          .setFooter({ text: 'System 777 · Developer 777' })]
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
          .setFooter({ text: 'System 777 · Developer 777' })]
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
          .setFooter({ text: 'System 777 · Developer 777' })]
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
          .setFooter({ text: 'System 777 · Developer 777' })]
      });

    // ── ipban ─────────────────────────────────────────────────────────────────
    } else if (sub === 'ipban') {
      const objetivo = interaction.options.getString('objetivo').trim();
      const reason   = interaction.options.getString('razon');

      // Detect if objetivo is an IP address or a User ID
      const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(objetivo);
      let ipsToban = [];

      if (isIp) {
        ipsToban = [objetivo];
      } else {
        // Treat as User ID — look up their IPs from registry
        const uips = db.get('ip_registry', 'user_ips', {});
        ipsToban   = uips[objetivo] || [];
        if (!ipsToban.length) {
          return interaction.editReply({
            content: `❌ No hay IPs registradas para \`${objetivo}\`.\n> El usuario nunca hizo clic en el link de tracking o verificación.`
          });
        }
      }

      const bannedIps = db.get('ip_registry', 'banned_ips', {});
      const reg       = db.get('ip_registry', 'data', {});
      const gbans     = db.get('globalbans', 'users', {});
      let totalUsers = 0, totalGuildBans = 0;
      const ipsBanned = [];

      for (const ip of ipsToban) {
        bannedIps[ip] = { reason, ts: Date.now(), bannedBy: interaction.user.id };
        ipsBanned.push(ip);
        const usersOnIp = reg[ip] || [];
        totalUsers += usersOnIp.length;
        for (const userId of usersOnIp) {
          gbans[userId] = { reason: `IP Ban (${ip}): ${reason}`, bannedBy: 'system', ts: Date.now(), permanent: true };
          for (const guild of client.guilds.cache.values()) {
            try { await guild.bans.create(userId, { reason: `System 777 · IP Ban: ${reason}` }); totalGuildBans++; } catch {}
          }
        }
      }
      db.set('ip_registry', 'banned_ips', bannedIps);
      if (totalUsers) db.set('globalbans', 'users', gbans);
      logger.warn(`IP Ban: ${ipsBanned.join(', ')} — ${totalUsers} usuarios, ${totalGuildBans} guild bans. Razón: ${reason}`);

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🌐 IP(s) Baneada(s)')
          .addFields(
            { name: 'IPs baneadas',    value: ipsBanned.map(ip => `\`${ip}\``).join('\n') || '-', inline: true },
            { name: 'Cuentas afectadas', value: `${totalUsers}`,   inline: true },
            { name: 'Guild bans',       value: `${totalGuildBans}`, inline: true },
            { name: 'Razón',            value: reason },
            { name: 'Efecto',           value: 'Cuentas baneadas globalmente. Cualquier acceso futuro desde estas IPs es rechazado automáticamente.' }
          )
          .setFooter({ text: 'System 777 · Developer 777' })]
      });

    // ── ipunban ───────────────────────────────────────────────────────────────
    } else if (sub === 'ipunban') {
      const ip        = interaction.options.getString('ip');
      const bannedIps = db.get('ip_registry', 'banned_ips', {});
      if (!bannedIps[ip]) return interaction.editReply({ content: `❌ \`${ip}\` no está baneada.` });
      delete bannedIps[ip];
      db.set('ip_registry', 'banned_ips', bannedIps);
      await interaction.editReply({ content: `✅ IP \`${ip}\` desbloqueada.` });

    // ── iplist ────────────────────────────────────────────────────────────────
    } else if (sub === 'iplist') {
      const bannedIps = db.get('ip_registry', 'banned_ips', {});
      const entries   = Object.entries(bannedIps);
      const desc = entries.length
        ? entries.map(([ip, d]) => `\`${ip}\` — ${d.reason} (<t:${Math.floor(d.ts/1000)}:R>)`).join('\n').slice(0, 2000)
        : 'No hay IPs baneadas.';
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(`🌐 IPs Baneadas (${entries.length})`)
          .setDescription(desc)
          .setFooter({ text: 'System 777 · Developer 777' })]
      });

    // ── ipcheck ───────────────────────────────────────────────────────────────
    } else if (sub === 'ipcheck') {
      const userId = interaction.options.getString('id');
      const uips   = db.get('ip_registry', 'user_ips', {});
      const reg    = db.get('ip_registry', 'data', {});
      const ips    = uips[userId] || [];

      if (!ips.length) {
        return interaction.editReply({ content: `❌ \`${userId}\` no ha verificado aún — no hay IPs registradas.` });
      }

      const bannedIps = db.get('ip_registry', 'banned_ips', {});
      let desc = '';
      for (const ip of ips) {
        const isBanned = bannedIps[ip] ? '🔴 BANEADA' : '🟢 libre';
        const accounts = (reg[ip] || []).filter(id => id !== userId);
        desc += `**\`${ip}\`** ${isBanned}\n`;
        if (accounts.length) desc += `  └ Otras cuentas: ${accounts.map(id => `\`${id}\``).join(', ')}\n`;
      }

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4400)
          .setTitle(`🌐 IPs de \`${userId}\` (${ips.length})`)
          .setDescription(desc.slice(0, 2000) || 'Sin datos')
          .setFooter({ text: 'System 777 · Developer 777' })]
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
    }
  }
};
