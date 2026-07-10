const {
  SlashCommandBuilder, EmbedBuilder, MessageFlags,
} = require('discord.js');
const prem = require('../../systems/premium');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('premiummgr')
    .setDescription('👑 Gestión completa de premium (solo owner)')

    // ── user management ────────────────────────────────────────────────────
    .addSubcommand(s => s.setName('grant').setDescription('Dar premium a un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addStringOption(o => o.setName('plan').setDescription('Plan').setRequired(true)
        .addChoices(
          { name: '⭐ Basic ($5.99/mes)',    value: 'basic'   },
          { name: '🌟 Gold ($9.99/mes)',     value: 'gold'    },
          { name: '💠 Diamond ($14.99/mes)', value: 'diamond' },
          { name: '💎 Eternal ($49.99/año)', value: 'eternal' },
        ))
      .addIntegerOption(o => o.setName('dias').setDescription('Días (0 = eterno para Eternal)').setRequired(false)))

    .addSubcommand(s => s.setName('revoke').setDescription('Quitar premium a un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))

    .addSubcommand(s => s.setName('extend').setDescription('Extender premium de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addIntegerOption(o => o.setName('dias').setDescription('Días a añadir').setRequired(true).setMinValue(1)))

    .addSubcommand(s => s.setName('check').setDescription('Revisar premium de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))

    .addSubcommand(s => s.setName('list').setDescription('Ver todos los usuarios premium activos'))

    // ── server premium ─────────────────────────────────────────────────────
    .addSubcommand(s => s.setName('server').setDescription('Gestionar premium de un servidor')
      .addStringOption(o => o.setName('serverid').setDescription('ID del servidor').setRequired(true))
      .addStringOption(o => o.setName('accion').setDescription('Acción').setRequired(true)
        .addChoices(
          { name: 'Activar', value: 'grant' },
          { name: 'Revocar', value: 'revoke' },
          { name: 'Ver estado', value: 'status' },
        ))
      .addStringOption(o => o.setName('plan').setDescription('Plan (si activas)').setRequired(false)
        .addChoices(
          { name: '⭐ Basic',   value: 'basic'   },
          { name: '🌟 Gold',    value: 'gold'    },
          { name: '💠 Diamond', value: 'diamond' },
          { name: '💎 Eternal', value: 'eternal' },
        ))
      .addIntegerOption(o => o.setName('dias').setDescription('Días (0 = eterno)').setRequired(false)))

    // ── premium codes ──────────────────────────────────────────────────────
    .addSubcommand(s => s.setName('codegen').setDescription('Generar código de redención premium')
      .addStringOption(o => o.setName('plan').setDescription('Plan').setRequired(true)
        .addChoices(
          { name: '⭐ Basic',   value: 'basic'   },
          { name: '🌟 Gold',    value: 'gold'    },
          { name: '💠 Diamond', value: 'diamond' },
          { name: '💎 Eternal', value: 'eternal' },
        ))
      .addIntegerOption(o => o.setName('dias').setDescription('Días que dará el código').setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName('usos').setDescription('Número de usos (default: 1)').setRequired(false).setMinValue(1).setMaxValue(100)))

    .addSubcommand(s => s.setName('codelist').setDescription('Ver todos los códigos premium')
      .addBooleanOption(o => o.setName('solo_activos').setDescription('Solo mostrar activos').setRequired(false)))

    .addSubcommand(s => s.setName('codedel').setDescription('Eliminar un código premium')
      .addStringOption(o => o.setName('codigo').setDescription('Código a eliminar').setRequired(true)))

    // ── purchase requests ──────────────────────────────────────────────────
    .addSubcommand(s => s.setName('requests').setDescription('Ver solicitudes de compra pendientes')
      .addStringOption(o => o.setName('estado').setDescription('Filtrar por estado').setRequired(false)
        .addChoices(
          { name: 'Pendientes', value: 'pending'  },
          { name: 'Aprobadas',  value: 'approved' },
          { name: 'Rechazadas', value: 'denied'   },
        )))

    .addSubcommand(s => s.setName('approve').setDescription('Aprobar solicitud de compra')
      .addStringOption(o => o.setName('id').setDescription('ID de la solicitud').setRequired(true))
      .addIntegerOption(o => o.setName('dias').setDescription('Días de premium a dar (default: 30)').setRequired(false).setMinValue(1)))

    .addSubcommand(s => s.setName('deny').setDescription('Rechazar solicitud de compra')
      .addStringOption(o => o.setName('id').setDescription('ID de la solicitud').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Razón del rechazo').setRequired(false)))

    // ── history & config ───────────────────────────────────────────────────
    .addSubcommand(s => s.setName('logs').setDescription('Ver historial de acciones premium')
      .addUserOption(o => o.setName('usuario').setDescription('Filtrar por usuario').setRequired(false))
      .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad de entradas').setRequired(false).setMinValue(1).setMaxValue(30)))

    .addSubcommand(s => s.setName('storeurl').setDescription('Ver o cambiar URL de la tienda premium')
      .addStringOption(o => o.setName('url').setDescription('Nueva URL (vacío = solo ver)').setRequired(false)))

    // ── force expire ───────────────────────────────────────────────────────
    .addSubcommand(s => s.setName('expire').setDescription('Forzar expiración inmediata del premium de un usuario')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))

    // ── blacklist ──────────────────────────────────────────────────────────
    .addSubcommand(s => s.setName('blacklist').setDescription('Añadir usuario a la blacklist premium')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(false)))

    .addSubcommand(s => s.setName('unblacklist').setDescription('Quitar usuario de la blacklist premium')
      .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))

    .addSubcommand(s => s.setName('blacklistcheck').setDescription('Ver la blacklist premium completa'))

    // ── give all ───────────────────────────────────────────────────────────
    .addSubcommand(s => s.setName('giveall').setDescription('Dar premium a múltiples usuarios (IDs separados por coma)')
      .addStringOption(o => o.setName('plan').setDescription('Plan').setRequired(true)
        .addChoices(
          { name: '⭐ Normal', value: 'normal' },
          { name: '💠 Pro',    value: 'pro'    },
          { name: '💎 Max',    value: 'max'    },
        ))
      .addIntegerOption(o => o.setName('dias').setDescription('Días').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('userids').setDescription('IDs separados por coma (ej: 123,456,789)').setRequired(true)))

    // ── reload ─────────────────────────────────────────────────────────────
    .addSubcommand(s => s.setName('reload').setDescription('Recargar configuración del sistema premium'))

    // ── coupons ────────────────────────────────────────────────────────────
    .addSubcommand(s => s.setName('coupongen').setDescription('Crear cupón de descuento')
      .addStringOption(o => o.setName('codigo').setDescription('Código del cupón (ej: PROMO20)').setRequired(true))
      .addIntegerOption(o => o.setName('descuento').setDescription('Descuento (número, ej: 20 = 20%)').setRequired(true).setMinValue(1).setMaxValue(100))
      .addStringOption(o => o.setName('tipo').setDescription('Tipo').setRequired(true)
        .addChoices(
          { name: 'Porcentaje (%)',       value: 'percent' },
          { name: 'Días extra gratuitos', value: 'days'    },
        ))
      .addIntegerOption(o => o.setName('usos').setDescription('Máximo de usos (0=ilimitado)').setRequired(false).setMinValue(0))
      .addIntegerOption(o => o.setName('expira_dias').setDescription('Expira en N días (0=nunca)').setRequired(false).setMinValue(0)))

    .addSubcommand(s => s.setName('coupondel').setDescription('Eliminar cupón')
      .addStringOption(o => o.setName('codigo').setDescription('Código del cupón').setRequired(true)))

    .addSubcommand(s => s.setName('couponlist').setDescription('Ver todos los cupones activos')),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();

    // ── GRANT ───────────────────────────────────────────────────────────────
    if (sub === 'grant') {
      const user  = interaction.options.getUser('usuario');
      const plan  = interaction.options.getString('plan');
      const days  = interaction.options.getInteger('dias') ?? (plan === 'eternal' ? 0 : 30);
      const info  = prem.planInfo(plan);
      prem.grant(user.id, plan, days, interaction.user.id);

      const exp = (plan === 'eternal' || days === 0) ? 'Acceso eterno' : `${days} días`;

      try {
        await user.send({ embeds: [new EmbedBuilder()
          .setColor(info.color)
          .setTitle(`🎉 ¡Tu premium fue activado, ${user.username}!`)
          .setDescription(
            `**${info.emoji} ${info.name}** activado.\n\n**Duración:** ${exp}\n\n**Beneficios:**\n${info.perks.map(p => `• ${p}`).join('\n')}\n\nUsa \`/premium status\` para ver tu estado.`
          )
          .setFooter({ text: 'System 777 · Gracias por tu apoyo 💙' })
          .setTimestamp()] });
      } catch {}

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(info.color)
        .setTitle(`${info.emoji} Premium ${info.name} activado`)
        .setDescription(`**${user.tag}** ahora tiene acceso **${info.name}** (${exp}).`)
        .setFooter({ text: 'System 777 · Premium Manager' })] });
    }

    // ── REVOKE ──────────────────────────────────────────────────────────────
    if (sub === 'revoke') {
      const user = interaction.options.getUser('usuario');
      const ok   = prem.revoke(user.id, interaction.user.id);
      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(ok ? 0x57F287 : 0xFF4444)
        .setDescription(ok ? `✅ Premium revocado a **${user.tag}**.` : `❌ **${user.tag}** no tenía premium activo.`)] });
    }

    // ── EXTEND ─────────────────────────────────────────────────────────────
    if (sub === 'extend') {
      const user  = interaction.options.getUser('usuario');
      const days  = interaction.options.getInteger('dias');
      const updated = prem.extend(user.id, days, interaction.user.id);
      if (!updated) return interaction.editReply({ content: `❌ **${user.tag}** no tiene premium activo. Usa \`grant\` primero.` });

      const newExp = updated.expiresAt ? `<t:${Math.floor(updated.expiresAt/1000)}:F>` : 'Eterno';
      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('✅ Premium extendido')
        .addFields(
          { name: 'Usuario',    value: user.tag, inline: true },
          { name: 'Días añadidos', value: `+${days}`, inline: true },
          { name: 'Nueva expiración', value: newExp, inline: true }
        )] });
    }

    // ── CHECK ───────────────────────────────────────────────────────────────
    if (sub === 'check') {
      const user   = interaction.options.getUser('usuario');
      const p      = prem.get(user.id);
      const active = prem.isActive(user.id);
      if (!p) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x36393f).setDescription(`**${user.tag}** nunca ha tenido premium.`)] });

      const info = prem.planInfo(p.plan);
      const exp  = p.expiresAt ? `<t:${Math.floor(p.expiresAt/1000)}:F>` : 'Eterno';
      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(active ? info.color : 0x36393f)
        .setTitle(`${info.emoji} Premium de ${user.tag}`)
        .addFields(
          { name: 'Plan',   value: `${info.emoji} ${info.name}`, inline: true },
          { name: 'Estado', value: active ? '✅ Activo' : '❌ Expirado', inline: true },
          { name: 'Expira', value: exp, inline: true },
          { name: 'Dado por', value: `<@${p.grantedBy}> <t:${Math.floor(p.grantedAt/1000)}:R>`, inline: false }
        )] });
    }

    // ── LIST ────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const activos = prem.list();
      if (!activos.length) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x36393f).setDescription('No hay usuarios premium activos.')] });

      const lines = await Promise.all(activos.map(async p => {
        const info = prem.planInfo(p.plan);
        const exp  = p.expiresAt ? `<t:${Math.floor(p.expiresAt/1000)}:R>` : 'Eterno';
        let tag = p.userId;
        try { const u = await client.users.fetch(p.userId); tag = u.tag; } catch {}
        return `${info.emoji} **${tag}** — ${info.name} · Expira ${exp}`;
      }));

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`💎 Premium Activos (${activos.length})`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'System 777 · Premium Manager' })] });
    }

    // ── SERVER ──────────────────────────────────────────────────────────────
    if (sub === 'server') {
      const guildId = interaction.options.getString('serverid');
      const accion  = interaction.options.getString('accion');
      const guild   = client.guilds.cache.get(guildId);

      if (accion === 'status') {
        const sp = prem.getServerPremium(guildId);
        const name = guild?.name || guildId;
        if (!sp) return interaction.editReply({ content: `❌ **${name}** no tiene server premium activo.` });
        const info = prem.planInfo(sp.plan);
        const exp  = sp.expiresAt ? `<t:${Math.floor(sp.expiresAt/1000)}:F>` : 'Eterno';
        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(info.color)
          .setTitle(`${info.emoji} Server Premium — ${name}`)
          .addFields(
            { name: 'Plan',   value: `${info.emoji} ${info.name}`, inline: true },
            { name: 'Expira', value: exp, inline: true }
          )] });
      }

      if (accion === 'grant') {
        const plan = interaction.options.getString('plan') || 'basic';
        const days = interaction.options.getInteger('dias') ?? 30;
        prem.grantServer(guildId, plan, days, interaction.user.id);
        const info = prem.planInfo(plan);
        const name = guild?.name || guildId;
        return interaction.editReply({ embeds: [new EmbedBuilder()
          .setColor(info.color)
          .setTitle(`${info.emoji} Server Premium Activado`)
          .setDescription(`**${name}** ahora tiene server premium **${info.name}** por **${days === 0 ? 'siempre' : `${days} días`}**.`)] });
      }

      if (accion === 'revoke') {
        const ok   = prem.revokeServer(guildId);
        const name = guild?.name || guildId;
        return interaction.editReply({ content: ok ? `✅ Server premium revocado a **${name}**.` : `❌ **${name}** no tenía server premium.` });
      }
    }

    // ── CODEGEN ─────────────────────────────────────────────────────────────
    if (sub === 'codegen') {
      const plan = interaction.options.getString('plan');
      const days = interaction.options.getInteger('dias');
      const uses = interaction.options.getInteger('usos') ?? 1;
      const code = prem.generateCode(plan, days, interaction.user.id, uses);
      const info = prem.planInfo(plan);

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(info.color)
        .setTitle(`🎫 Código Premium Generado`)
        .addFields(
          { name: 'Código',  value: `\`\`\`${code}\`\`\``, inline: false },
          { name: 'Plan',    value: `${info.emoji} ${info.name}`, inline: true },
          { name: 'Días',    value: `${days}`, inline: true },
          { name: 'Usos',    value: `${uses}`, inline: true }
        )
        .setFooter({ text: 'Comparte este código con el usuario para que lo canjee con /premium redeem' })] });
    }

    // ── CODELIST ────────────────────────────────────────────────────────────
    if (sub === 'codelist') {
      const soloActivos = interaction.options.getBoolean('solo_activos') ?? true;
      let codes = prem.listCodes();
      if (soloActivos) codes = codes.filter(c => c.usedCount < c.uses);
      if (!codes.length) return interaction.editReply({ content: '📋 Sin códigos premium activos.' });

      const lines = codes.slice(0, 15).map(c => {
        const info = prem.planInfo(c.plan);
        return `\`${c.code}\` ${info?.emoji} ${info?.name} — ${c.days}d — ${c.usedCount}/${c.uses} usos`;
      }).join('\n');

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🎫 Códigos Premium (${codes.length})`)
        .setDescription(lines)] });
    }

    // ── CODEDEL ─────────────────────────────────────────────────────────────
    if (sub === 'codedel') {
      const codigo = interaction.options.getString('codigo');
      const ok     = prem.deleteCode(codigo);
      return interaction.editReply({ content: ok ? `✅ Código \`${codigo}\` eliminado.` : `❌ Código \`${codigo}\` no encontrado.` });
    }

    // ── REQUESTS ────────────────────────────────────────────────────────────
    if (sub === 'requests') {
      const estado   = interaction.options.getString('estado') || 'pending';
      const requests = prem.listRequests(estado);
      if (!requests.length) return interaction.editReply({ content: `📋 Sin solicitudes con estado **${estado}**.` });

      const STATUS_ICON = { pending: '⏳', approved: '✅', denied: '❌' };
      const lines = requests.slice(0, 10).map(r => {
        const info = prem.planInfo(r.plan);
        return `${STATUS_ICON[r.status]} \`${r.id}\` — ${r.userTag} → ${info?.emoji} ${info?.name}\n  └ ${r.note?.slice(0, 60) || 'Sin nota'} · <t:${Math.floor(r.createdAt/1000)}:R>`;
      }).join('\n');

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🛒 Solicitudes Premium — ${estado} (${requests.length})`)
        .setDescription(lines)] });
    }

    // ── APPROVE ─────────────────────────────────────────────────────────────
    if (sub === 'approve') {
      const id   = interaction.options.getString('id');
      const dias = interaction.options.getInteger('dias') ?? 30;
      const req  = prem.resolveRequest(id, 'approved', interaction.user.id, `Aprobado ${dias}d`);
      if (!req) return interaction.editReply({ content: `❌ Solicitud \`${id}\` no encontrada.` });

      prem.grant(req.userId, req.plan, dias, interaction.user.id);
      const info = prem.planInfo(req.plan);

      try {
        const u = await client.users.fetch(req.userId);
        await u.send({ embeds: [new EmbedBuilder()
          .setColor(info.color)
          .setTitle(`🎉 ¡Tu solicitud premium fue aprobada!`)
          .setDescription(`Tu plan **${info.emoji} ${info.name}** ha sido activado por **${dias} días**.\n\nUsa \`/premium status\` para ver tu estado.`)
          .setTimestamp()] });
      } catch {}

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('✅ Solicitud Aprobada')
        .addFields(
          { name: 'Usuario', value: req.userTag, inline: true },
          { name: 'Plan',    value: `${info.emoji} ${info.name}`, inline: true },
          { name: 'Días',    value: `${dias}`, inline: true }
        )] });
    }

    // ── DENY ────────────────────────────────────────────────────────────────
    if (sub === 'deny') {
      const id    = interaction.options.getString('id');
      const razon = interaction.options.getString('razon') || 'Sin razón especificada';
      const req   = prem.resolveRequest(id, 'denied', interaction.user.id, razon);
      if (!req) return interaction.editReply({ content: `❌ Solicitud \`${id}\` no encontrada.` });

      try {
        const u = await client.users.fetch(req.userId);
        await u.send({ embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('❌ Tu solicitud premium fue rechazada')
          .setDescription(`Razón: ${razon}\n\nSi crees que es un error, contacta al soporte.`)
          .setTimestamp()] });
      } catch {}

      return interaction.editReply({ content: `✅ Solicitud \`${id}\` de **${req.userTag}** rechazada.` });
    }

    // ── LOGS ────────────────────────────────────────────────────────────────
    if (sub === 'logs') {
      const user     = interaction.options.getUser('usuario');
      const cantidad = interaction.options.getInteger('cantidad') ?? 15;
      const history  = prem.getHistory(user?.id, cantidad);

      if (!history.length) return interaction.editReply({ content: '📋 Sin historial de acciones premium.' });

      const ACTION_ICONS = { granted: '✅', revoked: '❌', extended: '➕', expired: '⏰', redeemed_code: '🎫', granted_server: '🏠' };
      const lines = history.map(h => {
        const icon = ACTION_ICONS[h.action] || '📝';
        const info = prem.planInfo(h.plan);
        return `${icon} **${h.action}** — <@${h.userId}> — ${info?.emoji} ${info?.name || h.plan} <t:${Math.floor(h.ts/1000)}:R>`;
      }).join('\n');

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Premium History${user ? ` — ${user.tag}` : ''} (${history.length})`)
        .setDescription(lines.slice(0, 4000))
        .setTimestamp()] });
    }

    // ── STOREURL ────────────────────────────────────────────────────────────
    if (sub === 'storeurl') {
      const url = interaction.options.getString('url');
      if (url) {
        prem.setStoreUrl(url);
        return interaction.editReply({ content: `✅ URL de la tienda actualizada a: **${url}**` });
      }
      return interaction.editReply({ content: `🛒 URL de la tienda: **${prem.getStoreUrl()}**` });
    }

    // ── EXPIRE ──────────────────────────────────────────────────────────────
    if (sub === 'expire') {
      const user = interaction.options.getUser('usuario');
      const ok   = prem.forceExpire(user.id, interaction.user.id);
      if (!ok) return interaction.editReply({ content: `❌ **${user.tag}** no tiene premium activo.` });

      try {
        await user.send({ embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('⏰ Tu premium ha expirado')
          .setDescription('El owner ha expirado tu acceso premium manualmente.\n\nUsa `/premium info` para ver planes disponibles.')
          .setTimestamp()] });
      } catch {}

      return interaction.editReply({ content: `✅ Premium de **${user.tag}** expirado manualmente.` });
    }

    // ── BLACKLIST ───────────────────────────────────────────────────────────
    if (sub === 'blacklist') {
      const user  = interaction.options.getUser('usuario');
      const razon = interaction.options.getString('razon') || 'Sin razón especificada';
      prem.blacklistAdd(user.id, razon, interaction.user.id);
      if (prem.isActive(user.id)) prem.revoke(user.id, interaction.user.id);
      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('🚫 Usuario añadido a Premium Blacklist')
        .addFields(
          { name: 'Usuario', value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: 'Razón',   value: razon, inline: false }
        )
        .setTimestamp()] });
    }

    if (sub === 'unblacklist') {
      const user = interaction.options.getUser('usuario');
      const ok   = prem.blacklistRemove(user.id);
      return interaction.editReply({ content: ok ? `✅ **${user.tag}** removido de la blacklist premium.` : `❌ **${user.tag}** no estaba en la blacklist.` });
    }

    if (sub === 'blacklistcheck') {
      const list = prem.listBlacklist();
      if (!list.length) return interaction.editReply({ content: '✅ Premium blacklist vacía.' });

      const lines = await Promise.all(list.map(async b => {
        let tag = b.userId;
        try { const u = await client.users.fetch(b.userId); tag = u.tag; } catch {}
        return `🚫 **${tag}** — ${b.reason} · <t:${Math.floor(b.ts/1000)}:R>`;
      }));

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle(`🚫 Premium Blacklist (${list.length})`)
        .setDescription(lines.join('\n'))
        .setTimestamp()] });
    }

    // ── GIVEALL ─────────────────────────────────────────────────────────────
    if (sub === 'giveall') {
      const plan    = interaction.options.getString('plan');
      const dias    = interaction.options.getInteger('dias');
      const rawIds  = interaction.options.getString('userids');
      const userIds = rawIds.split(',').map(s => s.trim()).filter(Boolean);

      if (!userIds.length) return interaction.editReply({ content: '❌ No se proporcionaron IDs válidos.' });

      const results = prem.giveAll(userIds, plan, dias, interaction.user.id);
      const ok      = results.filter(r => r.ok).length;
      const failed  = results.filter(r => !r.ok);

      const info = prem.planInfo(plan);
      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(info.color)
        .setTitle(`${info.emoji} GiveAll Premium — ${plan.toUpperCase()}`)
        .addFields(
          { name: '✅ Exitosos',  value: `${ok}`,          inline: true },
          { name: '❌ Fallidos',  value: `${failed.length}`, inline: true },
          { name: 'Días',         value: `${dias}`,          inline: true },
          ...(failed.length ? [{ name: 'Errores', value: failed.slice(0,5).map(r => `\`${r.userId}\`: ${r.error}`).join('\n') }] : [])
        )
        .setTimestamp()] });
    }

    // ── RELOAD ──────────────────────────────────────────────────────────────
    if (sub === 'reload') {
      const result = prem.reload();
      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('🔄 Sistema Premium Recargado')
        .addFields(
          { name: 'Planes cargados', value: result.plans.join(', '), inline: false },
          { name: 'Store URL',       value: result.storeUrl,          inline: false },
        )
        .setTimestamp()] });
    }

    // ── COUPONGEN ───────────────────────────────────────────────────────────
    if (sub === 'coupongen') {
      const codigo     = interaction.options.getString('codigo');
      const descuento  = interaction.options.getInteger('descuento');
      const tipo       = interaction.options.getString('tipo');
      const maxUsos    = interaction.options.getInteger('usos')       ?? 0;
      const expiraDias = interaction.options.getInteger('expira_dias') ?? 0;

      const code = prem.createCoupon(codigo, descuento, tipo, interaction.user.id, maxUsos, expiraDias);
      const tipoLabel = tipo === 'percent' ? `${descuento}% de descuento` : `${descuento} días extra gratis`;

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0xF5C518)
        .setTitle('🏷️ Cupón Creado')
        .addFields(
          { name: 'Código',    value: `\`${code}\``,                               inline: true },
          { name: 'Descuento', value: tipoLabel,                                   inline: true },
          { name: 'Usos máx',  value: maxUsos > 0 ? `${maxUsos}` : 'Ilimitados',   inline: true },
          { name: 'Expira',    value: expiraDias > 0 ? `En ${expiraDias} días` : 'Nunca', inline: true },
        )
        .setFooter({ text: 'Comparte el código con los usuarios' })
        .setTimestamp()] });
    }

    if (sub === 'coupondel') {
      const codigo = interaction.options.getString('codigo');
      const ok     = prem.deleteCoupon(codigo);
      return interaction.editReply({ content: ok ? `✅ Cupón \`${codigo.toUpperCase()}\` eliminado.` : `❌ Cupón \`${codigo}\` no encontrado.` });
    }

    if (sub === 'couponlist') {
      const coupons = prem.listCoupons();
      if (!coupons.length) return interaction.editReply({ content: '📋 Sin cupones activos.' });

      const lines = coupons.map(c => {
        const tipoLabel = c.type === 'percent' ? `${c.discount}%` : `+${c.discount}d`;
        const exp = c.expires ? `<t:${Math.floor(c.expires/1000)}:R>` : '∞';
        return `🏷️ \`${c.code}\` — ${tipoLabel} · ${c.uses}/${c.maxUses || '∞'} usos · Exp: ${exp}`;
      }).join('\n');

      return interaction.editReply({ embeds: [new EmbedBuilder()
        .setColor(0xF5C518)
        .setTitle(`🏷️ Cupones (${coupons.length})`)
        .setDescription(lines)
        .setTimestamp()] });
    }
  },
};
