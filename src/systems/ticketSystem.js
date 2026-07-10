const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, ChannelType, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  StringSelectMenuBuilder, AttachmentBuilder,
} = require('discord.js');
const db = require('../utils/db');

// ── PRIORITY CONFIG ───────────────────────────────────────────────────────────
const PRIORITY = {
  low:    { label: '🟢 Baja',    color: 0x57F287, emoji: '🟢', prefix: 'low' },
  medium: { label: '🟡 Media',   color: 0xFEE75C, emoji: '🟡', prefix: 'med' },
  high:   { label: '🔴 Alta',    color: 0xED4245, emoji: '🔴', prefix: 'high' },
  urgent: { label: '🚨 Urgente', color: 0xFF0000, emoji: '🚨', prefix: 'urgente' },
};

const STATUS_COLOR = {
  open:   0x57F287,
  closed: 0xED4245,
  claimed:0xFEE75C,
};

// ── TRANSCRIPT HTML ───────────────────────────────────────────────────────────
async function generateTranscript(channel, ticketData) {
  const fetched = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!fetched) return null;
  const msgs = [...fetched.values()].reverse();

  const rows = msgs.map(m => {
    const time    = new Date(m.createdTimestamp).toLocaleString('es-ES');
    const avatar  = m.author.displayAvatarURL({ size: 32, extension: 'png' });
    const content = (m.content || (m.embeds.length ? '[Embed]' : '')).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    const files   = m.attachments.size ? `<br><span style="color:#00b0f4">[Archivos: ${[...m.attachments.values()].map(a=>`<a href="${a.url}" style="color:#00b0f4">${a.name}</a>`).join(', ')}]</span>` : '';
    const isBot   = m.author.bot;
    const rowBg   = isBot ? 'rgba(88,101,242,.06)' : 'transparent';
    return `<tr style="background:${rowBg}">
      <td class="time">${time}</td>
      <td class="author"><img src="${avatar}" class="avatar"><b style="color:${isBot?'#a5aaff':'#dcddde'}">${m.author.tag}</b>${isBot?'<span class="bot-badge">BOT</span>':''}</td>
      <td class="msg">${content || '<i style="color:#72767d">[Sin texto]</i>'}${files}</td>
    </tr>`;
  }).join('\n');

  const prio = ticketData.priority ? PRIORITY[ticketData.priority] : null;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transcript — Ticket #${String(ticketData.number).padStart(4,'0')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#1e1f22;color:#dcddde;font-family:'Segoe UI',system-ui,sans-serif;padding:0}
  .header{background:linear-gradient(135deg,#5865f2 0%,#3c45a5 100%);padding:28px 32px}
  .header-top{display:flex;align-items:center;gap:16px;margin-bottom:20px}
  .header-icon{width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:26px}
  .header-title{color:#fff;font-size:22px;font-weight:700;margin-bottom:4px}
  .header-sub{color:rgba(255,255,255,.7);font-size:13px}
  .meta{display:flex;flex-wrap:wrap;gap:10px}
  .meta-item{background:rgba(0,0,0,.25);border-radius:8px;padding:8px 14px;font-size:12px}
  .meta-item .ml{color:rgba(255,255,255,.5);font-size:10px;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:2px}
  .meta-item .mv{color:#fff;font-weight:600}
  .prio-badge{display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;margin-top:10px}
  .content{padding:24px 32px}
  table{width:100%;border-collapse:collapse;background:#2b2d31;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.3)}
  thead tr{background:#1e1f22}
  th{padding:11px 16px;text-align:left;color:#949ba4;font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
  tbody tr{border-bottom:1px solid rgba(255,255,255,.04);transition:background .1s}
  tbody tr:hover{background:#32353b}
  td{padding:10px 16px;vertical-align:top}
  .time{color:#949ba4;font-size:11px;white-space:nowrap;width:130px}
  .author{width:190px;font-size:13px;display:flex;align-items:flex-start;gap:8px}
  .avatar{width:26px;height:26px;border-radius:50%;flex-shrink:0;margin-top:2px}
  .bot-badge{background:#5865f2;color:#fff;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:5px;vertical-align:middle}
  .msg{word-break:break-word;font-size:13px;line-height:1.6;color:#dcddde}
  .footer{text-align:center;color:#949ba4;padding:20px;font-size:12px;border-top:1px solid rgba(255,255,255,.06)}
  .footer a{color:#5865f2;text-decoration:none}
</style>
</head>
<body>
<div class="header">
  <div class="header-top">
    <div class="header-icon">🎫</div>
    <div>
      <div class="header-title">Ticket #${String(ticketData.number).padStart(4,'0')} — ${ticketData.category}</div>
      <div class="header-sub">Transcript generado por System 777</div>
    </div>
  </div>
  ${prio ? `<div class="prio-badge" style="background:rgba(255,255,255,.12);color:#fff">${prio.emoji} Prioridad: ${prio.label}</div>` : ''}
  <div class="meta" style="margin-top:14px">
    <div class="meta-item"><span class="ml">Canal</span><span class="mv">#${channel.name}</span></div>
    <div class="meta-item"><span class="ml">Usuario</span><span class="mv">${ticketData.userTag}</span></div>
    <div class="meta-item"><span class="ml">Categoría</span><span class="mv">${ticketData.category}</span></div>
    <div class="meta-item"><span class="ml">Mensajes</span><span class="mv">${msgs.length}</span></div>
    <div class="meta-item"><span class="ml">Generado</span><span class="mv">${new Date().toLocaleString('es-ES')}</span></div>
    ${ticketData.claimedBy ? `<div class="meta-item"><span class="ml">Atendido por</span><span class="mv">${ticketData.claimedByTag}</span></div>` : ''}
    ${ticketData.rating ? `<div class="meta-item"><span class="ml">Valoración</span><span class="mv">${'⭐'.repeat(ticketData.rating)}</span></div>` : ''}
  </div>
</div>
<div class="content">
  <table>
    <thead><tr><th>Hora</th><th>Usuario</th><th>Mensaje</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>
<div class="footer">System 777 · <a href="https://jrsystem7777.com">jrsystem7777.com</a> · Dev: @yxx777_ · ${new Date().getFullYear()}</div>
</body>
</html>`;

  return Buffer.from(html, 'utf8');
}

// ── PANEL PRINCIPAL ───────────────────────────────────────────────────────────
const BUTTON_STYLES_MAP = { '1': ButtonStyle.Primary, '2': ButtonStyle.Secondary, '3': ButtonStyle.Success, '4': ButtonStyle.Danger };

function buildPanel(cfg, guild) {
  const rawColor = cfg.color ? parseInt(cfg.color.replace('#', ''), 16) : 0x5865F2;
  const color    = isNaN(rawColor) ? 0x5865F2 : rawColor;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(cfg.panelTitle || `🎫 Sistema de Soporte — ${guild.name}`)
    .setDescription(
      cfg.panelDesc ?? cfg.panelDescription ??
      `> **¿Necesitas ayuda?** Abre un ticket y nuestro equipo te atenderá pronto.\n\n` +
      `**📋 ¿Cómo funciona?**\n` +
      `> 1️⃣ · Selecciona el tipo de soporte que necesitas\n` +
      `> 2️⃣ · Describe tu problema en el formulario\n` +
      `> 3️⃣ · Un miembro del staff te atenderá\n\n` +
      `> ⚠️ *No abras tickets innecesarios. Respeta al staff.*`
    )
    .setThumbnail(guild.iconURL({ size: 256 }))
    .setFooter({ text: `${guild.name} · Soporte • Powered by System 777`, iconURL: guild.iconURL() || undefined })
    .setTimestamp();

  if (cfg.panelImage) embed.setImage(cfg.panelImage);

  const categories = cfg.categories ?? [];
  let components;

  if (categories.length === 0) {
    components = [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tkt_open_default')
        .setLabel('📩 Abrir Ticket')
        .setStyle(ButtonStyle.Primary)
    )];
  } else if (categories[0]?.style !== undefined) {
    const rows = [];
    for (let i = 0; i < Math.min(categories.length, 25); i++) {
      const c     = categories[i];
      const style = BUTTON_STYLES_MAP[String(c.style)] ?? ButtonStyle.Primary;
      const btn   = new ButtonBuilder()
        .setCustomId(`tkt_open_${c.id}`)
        .setLabel(c.label)
        .setStyle(style);
      if (c.emoji) {
        // Support custom emojis from other servers: <:name:id> or <a:name:id>
        const customEmoji = c.emoji.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
        if (customEmoji) {
          btn.setEmoji({ name: customEmoji[1], id: customEmoji[2], animated: c.emoji.startsWith('<a:') });
        } else {
          btn.setEmoji(c.emoji);
        }
      }
      const rowIdx = Math.floor(i / 5);
      if (!rows[rowIdx]) rows[rowIdx] = new ActionRowBuilder();
      rows[rowIdx].addComponents(btn);
    }
    components = rows.slice(0, 5);
  } else {
    const select = new StringSelectMenuBuilder()
      .setCustomId('tkt_select')
      .setPlaceholder('📂 Selecciona el tipo de soporte...')
      .addOptions(categories.map(c => {
        const opt = {
          label: c.label, value: c.id,
          description: c.description?.slice(0, 100),
        };
        if (c.emoji) {
          const customEmoji = c.emoji.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
          if (customEmoji) {
            opt.emoji = { name: customEmoji[1], id: customEmoji[2], animated: c.emoji.startsWith('<a:') };
          } else {
            opt.emoji = c.emoji;
          }
        }
        return opt;
      }));
    components = [new ActionRowBuilder().addComponents(select)];
  }

  return { embeds: [embed], components };
}

// ── CONTROL PANEL DENTRO DEL TICKET ──────────────────────────────────────────
function buildControlPanel(ticketData) {
  const isClosed = ticketData.status === 'closed';
  const claimed  = !!ticketData.claimedBy;
  const prio     = ticketData.priority || 'low';

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tkt_close')
      .setLabel(isClosed ? '🔓 Reabrir' : '🔒 Cerrar')
      .setStyle(isClosed ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('tkt_claim')
      .setLabel(claimed ? '🙋 Liberar' : '🙋 Reclamar')
      .setStyle(claimed ? ButtonStyle.Secondary : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('tkt_transcript')
      .setLabel('📋 Transcript')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tkt_add_user')
      .setLabel('➕ Añadir')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tkt_delete')
      .setLabel('🗑️ Eliminar')
      .setStyle(ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('tkt_priority')
      .setPlaceholder(`${PRIORITY[prio].emoji} Prioridad actual: ${PRIORITY[prio].label}`)
      .addOptions([
        { label: '🟢 Baja',    value: 'low',    description: 'Ticket de baja prioridad',    emoji: '🟢' },
        { label: '🟡 Media',   value: 'medium',  description: 'Ticket de prioridad media',    emoji: '🟡' },
        { label: '🔴 Alta',    value: 'high',    description: 'Ticket urgente, atender pronto', emoji: '🔴' },
        { label: '🚨 Urgente', value: 'urgent',  description: 'PRIORIDAD MÁXIMA',              emoji: '🚨' },
      ])
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tkt_rating')
      .setLabel('⭐ Valorar')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tkt_move')
      .setLabel('📂 Mover')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2, row3];
}

// ── EMBED DEL TICKET ──────────────────────────────────────────────────────────
function buildTicketEmbed(ticketData, member, guild) {
  const prio  = ticketData.priority || 'low';
  const prioD = PRIORITY[prio];
  const color = ticketData.claimedBy ? STATUS_COLOR.claimed
              : ticketData.status === 'closed' ? STATUS_COLOR.closed
              : prioD.color;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `Ticket #${String(ticketData.number).padStart(4,'0')} · ${ticketData.category}`, iconURL: guild.iconURL() || undefined })
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .setDescription(
      `Hola ${member}! Describe tu problema con detalle.\n` +
      `Un miembro de nuestro equipo te atenderá en breve.\n\n` +
      (ticketData.reason ? `**📝 Motivo:** ${ticketData.reason}` : '')
    )
    .addFields(
      { name: '👤 Usuario',      value: `${member} (\`${member.user.tag}\`)`,                                   inline: true },
      { name: '📂 Categoría',    value: ticketData.category,                                                     inline: true },
      { name: '⚡ Prioridad',    value: prioD.label,                                                             inline: true },
      { name: '📅 Abierto',      value: `<t:${Math.floor(ticketData.createdAt / 1000)}:R>`,                     inline: true },
      { name: '📊 Estado',       value: ticketData.claimedBy
          ? `🟡 Reclamado por <@${ticketData.claimedBy}>`
          : ticketData.status === 'open' ? '🟢 Esperando staff' : '🔴 Cerrado',
        inline: true },
      { name: '🎫 ID',           value: `\`#${String(ticketData.number).padStart(4,'0')}\``,                    inline: true },
    )
    .setFooter({ text: `${guild.name} · System 777 · Soporte`, iconURL: guild.iconURL() || undefined })
    .setTimestamp();

  return embed;
}

// ── ABRIR TICKET ──────────────────────────────────────────────────────────────
async function openModal(interaction, categoryId = 'default') {
  const cfg      = db.get('ticketConfig', interaction.guild.id, {});
  const category = cfg.categories?.find(c => c.id === categoryId);
  const catName  = category?.label ?? 'Soporte';

  const modal = new ModalBuilder()
    .setCustomId(`tkt_modal_${categoryId}`)
    .setTitle(`📩 Nuevo Ticket — ${catName}`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('tkt_razon')
        .setLabel('¿Cuál es el motivo de tu ticket?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe tu problema con el mayor detalle posible...')
        .setMinLength(10)
        .setMaxLength(1000)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('tkt_prio_hint')
        .setLabel('Prioridad estimada (baja/media/alta/urgente)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('baja')
        .setRequired(false)
        .setMaxLength(10)
    ),
  );
  await interaction.showModal(modal);
}

async function createTicket(interaction, categoryId, razon, prioHint = '') {
  let cfg = db.get('ticketConfig', interaction.guild.id, {});
  // Fallback: read from file if cache is empty
  if (!cfg.supportRole && !cfg.categories?.length) {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataFile = path.join(__dirname, '../../data/ticketConfig.json');
      const allData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (allData[interaction.guild.id]) {
        cfg = allData[interaction.guild.id];
        db.set('ticketConfig', interaction.guild.id, cfg);
      }
    } catch {}
  }
  if (!cfg.supportRole && !cfg.categories?.length) {
    return interaction.reply({ content: '❌ Tickets no configurados desde el Dashboard.', flags: MessageFlags.Ephemeral });
  }

  const allTickets   = db.all('tickets');
  const userOpenTkts = Object.values(allTickets).filter(
    t => t && t.userId === interaction.user.id && t.guildId === interaction.guild.id && t.status === 'open'
  );
  const maxPerUser = cfg.max ?? cfg.maxPerUser ?? 1;
  if (userOpenTkts.length >= maxPerUser) {
    const ch = interaction.guild.channels.cache.get(userOpenTkts[0].channelId);
    return interaction.reply({
      content: `❌ Tienes **${userOpenTkts.length}/${maxPerUser}** ticket(s) abierto(s)${ch ? `. Ir a: ${ch}` : '.'}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Determine priority from hint
  const prioMap = { baja:'low', media:'medium', alta:'high', urgente:'urgent', low:'low', medium:'medium', high:'high', urgent:'urgent' };
  const priority = prioMap[(prioHint||'').toLowerCase().trim()] || 'low';
  const prioD    = PRIORITY[priority];

  const count  = (db.get('ticketConfig', `count_${interaction.guild.id}`) ?? 0) + 1;
  db.set('ticketConfig', `count_${interaction.guild.id}`, count);

  const category = cfg.categories?.find(c => c.id === categoryId);
  const catName  = category?.label ?? 'Soporte';
  const parentId = category?.channelCategoryId ?? cfg.ticketCategory;

  const perms = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id,                 allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: interaction.client.user.id,          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels] },
  ];
  if (cfg.supportRole) {
    perms.push({ id: cfg.supportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] });
  }

  const prefix      = cfg.channelPrefix ?? 'ticket';
  const channelName = `${prioD.prefix}-${String(count).padStart(4,'0')}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,14)}`;

  let channel;
  try {
    channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentId ?? null,
      topic: `Ticket #${String(count).padStart(4,'0')} | ${interaction.user.tag} | ${catName} | ${prioD.label}`,
      permissionOverwrites: perms,
    });
  } catch (e) {
    db.set('ticketConfig', `count_${interaction.guild.id}`, count - 1); // revert counter
    return interaction.editReply({ content: `❌ No pude crear el canal del ticket. Verifica que el bot tenga permiso **Gestionar Canales** y que la categoría exista.\n\`${e.message.slice(0,100)}\`` });
  }

  const ticketData = {
    number:     count,
    channelId:  channel.id,
    userId:     interaction.user.id,
    userTag:    interaction.user.tag,
    guildId:    interaction.guild.id,
    category:   catName,
    categoryId: categoryId,
    reason:     razon,
    priority:   priority,
    status:     'open',
    claimedBy:  null,
    claimedByTag: null,
    createdAt:  Date.now(),
    closedAt:   null,
    rating:     null,
  };
  db.set('tickets', channel.id, ticketData);

  const member = interaction.member;
  const embed  = buildTicketEmbed(ticketData, member, interaction.guild);
  const components = buildControlPanel(ticketData);

  const shouldPing = cfg.ping !== false && cfg.pingOnOpen !== false;
  const pingParts  = [];
  if (shouldPing && cfg.supportRole) pingParts.push(`<@&${cfg.supportRole}>`);
  if (shouldPing && cfg.extraSupportRole) pingParts.push(`<@&${cfg.extraSupportRole}>`);
  const pingStr = pingParts.join(' ');

  const catWelcome    = category?.welcomeMsg || '';
  const globalWelcome = cfg.welcome_msg || cfg.welcomeMsg || '';
  const welcomeExtra  = (catWelcome || globalWelcome) ? `\n\n📌 ${catWelcome || globalWelcome}` : '';
  if (welcomeExtra) embed.setDescription((embed.data.description || '') + welcomeExtra);

  await channel.send({
    content: `${pingStr ? pingStr + ' — ' : ''}${interaction.user} abrió el ticket **#${String(count).padStart(4,'0')}**`,
    embeds: [embed],
    components,
  });

  await interaction.editReply({
    content: `✅ Ticket abierto: ${channel}\n> Categoría: **${catName}** · Prioridad: ${prioD.label}`,
  });
}

// ── CERRAR TICKET ─────────────────────────────────────────────────────────────
async function openCloseModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('tkt_modal_close')
    .setTitle('🔒 Cerrar Ticket');

  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('tkt_close_reason')
      .setLabel('Razón del cierre (opcional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Problema resuelto, Sin respuesta, etc.')
      .setRequired(false)
      .setMaxLength(200)
  ));
  await interaction.showModal(modal);
}

async function closeTicket(interaction, reason = 'Sin razón especificada') {
  const ticketData = db.get('tickets', interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  if (ticketData.status === 'closed') return reopenTicket(interaction);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  await interaction.channel.permissionOverwrites.edit(ticketData.userId, {
    SendMessages: false, ViewChannel: false,
  }).catch(() => {});

  ticketData.status      = 'closed';
  ticketData.closedAt    = Date.now();
  ticketData.closeReason = reason;
  ticketData.closedBy    = interaction.user.id;
  db.set('tickets', interaction.channel.id, ticketData);

  const cfg = db.get('ticketConfig', interaction.guild.id, {});

  const transcriptBuf = await generateTranscript(interaction.channel, ticketData);
  const attachment    = transcriptBuf ? new AttachmentBuilder(transcriptBuf, { name: `transcript-${interaction.channel.name}.html` }) : null;

  // Update main ticket embed
  try {
    const messages  = await interaction.channel.messages.fetch({ limit: 10 });
    const ticketMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.components.length > 0);
    if (ticketMsg) {
      const member = await interaction.guild.members.fetch(ticketData.userId).catch(() => interaction.member);
      await ticketMsg.edit({ embeds: [buildTicketEmbed(ticketData, member, interaction.guild)], components: buildControlPanel(ticketData) });
    }
  } catch {}

  const timeOpen = ticketData.closedAt - ticketData.createdAt;
  const h = Math.floor(timeOpen / 3600000);
  const m = Math.floor((timeOpen % 3600000) / 60000);
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  const closeEmbed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🔒 Ticket Cerrado')
    .setThumbnail(interaction.guild.iconURL())
    .addFields(
      { name: '👤 Usuario',         value: `<@${ticketData.userId}>`,       inline: true },
      { name: '🙋 Cerrado por',     value: `${interaction.user}`,           inline: true },
      { name: '📂 Categoría',       value: ticketData.category,             inline: true },
      { name: '📝 Razón',           value: reason,                         inline: false },
      { name: '⏱️ Tiempo abierto', value: timeStr,                         inline: true },
      { name: '⚡ Prioridad',       value: PRIORITY[ticketData.priority||'low'].label, inline: true },
    )
    .setFooter({ text: `System 777 · Ticket #${String(ticketData.number).padStart(4,'0')}` })
    .setTimestamp();

  const reopenRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tkt_close').setLabel('🔓 Reabrir').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tkt_transcript').setLabel('📋 Transcript').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tkt_delete').setLabel('🗑️ Eliminar').setStyle(ButtonStyle.Danger),
  );

  const files = attachment ? [attachment] : [];
  await interaction.channel.send({ embeds: [closeEmbed], components: [reopenRow], files });

  // Log to logChannel
  if (cfg.logChannel && attachment) {
    const logCh = interaction.guild.channels.cache.get(cfg.logChannel);
    if (logCh) {
      await logCh.send({
        embeds: [new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`📋 Transcript — Ticket #${String(ticketData.number).padStart(4,'0')}`)
          .addFields(
            { name: '👤 Usuario',     value: `<@${ticketData.userId}>`, inline: true },
            { name: '🙋 Cerrado por', value: `${interaction.user}`,     inline: true },
            { name: '📂 Categoría',   value: ticketData.category,       inline: true },
            { name: '⏱️ Duración',   value: timeStr,                   inline: true },
            { name: '📝 Razón',       value: reason,                   inline: false },
          )
          .setFooter({ text: 'System 777 · Transcript adjunto' })
          .setTimestamp()],
        files: [attachment],
      }).catch(() => {});
    }
  }

  // DM transcript al usuario + solicitar rating
  if (cfg.dmTranscript !== false) {
    try {
      const user = await interaction.client.users.fetch(ticketData.userId);
      const ratingRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`tkt_rating_1_${interaction.channel.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`tkt_rating_2_${interaction.channel.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`tkt_rating_3_${interaction.channel.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`tkt_rating_4_${interaction.channel.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`tkt_rating_5_${interaction.channel.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Primary),
      );
      const dmEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Transcript de tu Ticket #${String(ticketData.number).padStart(4,'0')}`)
        .setDescription(`Tu ticket en **${interaction.guild.name}** ha sido cerrado.\n\n¿Cómo fue tu experiencia? Valora la atención del staff:`)
        .addFields({ name: '📝 Razón del cierre', value: reason })
        .setFooter({ text: 'System 777 · Tu valoración ayuda a mejorar el soporte' });
      await user.send({
        embeds: [dmEmbed],
        components: [ratingRow],
        files: attachment ? [new AttachmentBuilder(transcriptBuf, { name: `transcript-${interaction.channel.name}.html` })] : [],
      });
    } catch {}
  }

  await interaction.editReply({ content: '✅ Ticket cerrado. Transcript generado.' });
}

// ── REABRIR TICKET ────────────────────────────────────────────────────────────
async function reopenTicket(interaction) {
  const ticketData = db.get('tickets', interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  await interaction.channel.permissionOverwrites.edit(ticketData.userId, {
    SendMessages: true, ViewChannel: true,
  }).catch(() => {});

  ticketData.status   = 'open';
  ticketData.closedAt = null;
  db.set('tickets', interaction.channel.id, ticketData);

  try {
    const messages  = await interaction.channel.messages.fetch({ limit: 20 });
    const ticketMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.embeds[0].data?.author?.name?.includes('Ticket #'));
    if (ticketMsg) {
      const member = await interaction.guild.members.fetch(ticketData.userId).catch(() => interaction.member);
      await ticketMsg.edit({ embeds: [buildTicketEmbed(ticketData, member, interaction.guild)], components: buildControlPanel(ticketData) });
    }
  } catch {}

  return interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0x57F287)
      .setDescription(`🔓 **Ticket reabierto** por ${interaction.user}.`)
      .setTimestamp()],
  });
}

// ── RECLAMAR / LIBERAR TICKET ─────────────────────────────────────────────────
async function claimTicket(interaction) {
  const cfg = db.get('ticketConfig', interaction.guild.id, {});
  const isStaff = cfg.supportRole
    ? interaction.member.roles.cache.has(cfg.supportRole)
    : interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

  if (!isStaff) return interaction.reply({ content: '❌ Solo el staff puede reclamar tickets.', flags: MessageFlags.Ephemeral });

  const ticketData = db.get('tickets', interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  if (ticketData.claimedBy === interaction.user.id) {
    ticketData.claimedBy = null; ticketData.claimedByTag = null;
    db.set('tickets', interaction.channel.id, ticketData);
    const member = await interaction.guild.members.fetch(ticketData.userId).catch(() => interaction.member);
    try {
      const messages  = await interaction.channel.messages.fetch({ limit: 10 });
      const ticketMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.components.length > 0);
      if (ticketMsg) await ticketMsg.edit({ embeds: [buildTicketEmbed(ticketData, member, interaction.guild)], components: buildControlPanel(ticketData) });
    } catch {}
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x949ba4).setDescription(`🙋 ${interaction.user} liberó el ticket.`).setTimestamp()] });
  }

  if (ticketData.claimedBy && ticketData.claimedBy !== interaction.user.id) {
    return interaction.reply({ content: `❌ Ticket ya reclamado por <@${ticketData.claimedBy}>.`, flags: MessageFlags.Ephemeral });
  }

  ticketData.claimedBy    = interaction.user.id;
  ticketData.claimedByTag = interaction.user.tag;
  db.set('tickets', interaction.channel.id, ticketData);

  try {
    const messages  = await interaction.channel.messages.fetch({ limit: 10 });
    const ticketMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.components.length > 0);
    if (ticketMsg) {
      const member = await interaction.guild.members.fetch(ticketData.userId).catch(() => interaction.member);
      await ticketMsg.edit({ embeds: [buildTicketEmbed(ticketData, member, interaction.guild)], components: buildControlPanel(ticketData) });
    }
  } catch {}

  return interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0xFEE75C)
      .setDescription(`🙋 **${interaction.user}** reclamó el ticket.\nTe atenderá en breve. ¡Ten paciencia!`)
      .setTimestamp()],
  });
}

// ── CAMBIAR PRIORIDAD ─────────────────────────────────────────────────────────
async function setPriority(interaction) {
  const cfg     = db.get('ticketConfig', interaction.guild.id, {});
  const isStaff = cfg.supportRole
    ? interaction.member.roles.cache.has(cfg.supportRole)
    : interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

  if (!isStaff) return interaction.reply({ content: '❌ Solo el staff puede cambiar la prioridad.', flags: MessageFlags.Ephemeral });

  const ticketData = db.get('tickets', interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  const newPrio = interaction.values[0];
  const prioD   = PRIORITY[newPrio] || PRIORITY.low;

  ticketData.priority = newPrio;
  db.set('tickets', interaction.channel.id, ticketData);

  // Rename channel with priority prefix
  const nameParts = interaction.channel.name.split('-').slice(1); // drop old prefix
  await interaction.channel.setName(`${prioD.prefix}-${nameParts.join('-')}`.slice(0, 100)).catch(() => {});

  // Update embed
  try {
    const messages  = await interaction.channel.messages.fetch({ limit: 10 });
    const ticketMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.components.length > 0);
    if (ticketMsg) {
      const member = await interaction.guild.members.fetch(ticketData.userId).catch(() => interaction.member);
      await ticketMsg.edit({ embeds: [buildTicketEmbed(ticketData, member, interaction.guild)], components: buildControlPanel(ticketData) });
    }
  } catch {}

  return interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(prioD.color)
      .setDescription(`${prioD.emoji} Prioridad cambiada a **${prioD.label}** por ${interaction.user}.`)
      .setTimestamp()],
  });
}

// ── AÑADIR USUARIO ────────────────────────────────────────────────────────────
async function openAddUserModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('tkt_modal_add_user')
    .setTitle('➕ Añadir Usuario al Ticket');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('tkt_add_user_id')
      .setLabel('ID del usuario a añadir')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true)
      .setMinLength(17)
      .setMaxLength(20)
  ));
  await interaction.showModal(modal);
}

async function addUserToTicket(interaction) {
  const userId = interaction.fields.getTextInputValue('tkt_add_user_id').trim();
  try {
    const member = await interaction.guild.members.fetch(userId);
    await interaction.channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
    });
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`➕ ${member} fue añadido al ticket por ${interaction.user}.`)
        .setTimestamp()],
    });
  } catch {
    return interaction.reply({ content: '❌ Usuario no encontrado. Verifica el ID.', flags: MessageFlags.Ephemeral });
  }
}

// ── RATING ────────────────────────────────────────────────────────────────────
async function handleRating(interaction, stars, channelId) {
  const ticketData = db.get('tickets', channelId);
  if (!ticketData) return interaction.reply({ content: '❌ Ticket no encontrado.', flags: MessageFlags.Ephemeral });
  if (ticketData.userId !== interaction.user.id) return interaction.reply({ content: '❌ Esta valoración no es para ti.', flags: MessageFlags.Ephemeral });
  if (ticketData.rating) return interaction.reply({ content: '❌ Ya valoraste este ticket.', flags: MessageFlags.Ephemeral });

  ticketData.rating = stars;
  db.set('tickets', channelId, ticketData);

  const starsStr = '⭐'.repeat(stars);
  const msgs = ['😔 Gracias por tu feedback. Mejoraremos.', '😐 Gracias por tu valoración.', '🙂 Gracias por tu valoración.', '😊 ¡Gracias! Nos alegra haber ayudado.', '🎉 ¡Increíble! Gracias por tu excelente valoración.'];

  await interaction.update({
    embeds: [new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${starsStr} Gracias por valorar el soporte`)
      .setDescription(msgs[stars - 1])
      .setFooter({ text: 'System 777 · Tu opinión importa' })
      .setTimestamp()],
    components: [],
  });

  // Post rating in log channel
  const cfg   = db.get('ticketConfig', ticketData.guildId, {});
  const guild = interaction.client.guilds.cache.get(ticketData.guildId);
  if (cfg.logChannel && guild) {
    const logCh = guild.channels.cache.get(cfg.logChannel);
    if (logCh) {
      await logCh.send({
        embeds: [new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle(`${starsStr} Valoración recibida`)
          .addFields(
            { name: '👤 Usuario', value: `<@${ticketData.userId}>`, inline: true },
            { name: '🎫 Ticket',  value: `#${String(ticketData.number).padStart(4,'0')}`, inline: true },
            { name: '⭐ Nota',    value: `${stars}/5`, inline: true },
          )
          .setFooter({ text: 'System 777 · Rating system' })
          .setTimestamp()],
      }).catch(() => {});
    }
  }
}

// ── TRANSCRIPT MANUAL ─────────────────────────────────────────────────────────
async function sendTranscript(interaction) {
  const ticketData = db.get('tickets', interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const buf = await generateTranscript(interaction.channel, ticketData);
  if (!buf) return interaction.editReply('❌ No pude generar el transcript.');

  const file = new AttachmentBuilder(buf, { name: `transcript-${interaction.channel.name}.html` });
  await interaction.editReply({ content: '✅ Transcript generado:', files: [file] });

  try {
    const user = await interaction.client.users.fetch(ticketData.userId);
    await user.send({
      content: `📋 Transcript de tu ticket **#${String(ticketData.number).padStart(4,'0')}** en **${interaction.guild.name}**:`,
      files: [new AttachmentBuilder(buf, { name: `transcript-${interaction.channel.name}.html` })],
    });
  } catch {}
}

// ── ELIMINAR TICKET ───────────────────────────────────────────────────────────
async function deleteTicket(interaction) {
  const ticketData = db.get('tickets', interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  const cfg     = db.get('ticketConfig', interaction.guild.id, {});
  const isStaff = cfg.supportRole
    ? interaction.member.roles.cache.has(cfg.supportRole)
    : interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
  const isOwner = interaction.user.id === ticketData.userId;

  if (!isStaff && !isOwner) return interaction.reply({ content: '❌ Sin permisos.', flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setDescription(`🗑️ Este ticket será eliminado en **5 segundos**...\n*Solicitado por ${interaction.user}*`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  setTimeout(async () => {
    db.set('tickets', interaction.channel.id, null);
    await interaction.channel.delete(`Ticket eliminado por ${interaction.user.tag}`).catch(() => {});
  }, 5000);
}

module.exports = {
  buildPanel, buildControlPanel, buildTicketEmbed,
  openModal, createTicket,
  openCloseModal, closeTicket, reopenTicket,
  claimTicket, setPriority,
  openAddUserModal, addUserToTicket,
  handleRating,
  sendTranscript, deleteTicket,
  generateTranscript,
};
