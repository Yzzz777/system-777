const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, ChannelType, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  StringSelectMenuBuilder, AttachmentBuilder,
} = require('discord.js');
const ticketDb = require('../utils/ticketDb');
const db = require('../utils/db');

const PRIORITY = {
  low:    { label: '🟢 Baja',    color: 0x57F287, emoji: '🟢', prefix: 'low' },
  medium: { label: '🟡 Media',   color: 0xFEE75C, emoji: '🟡', prefix: 'med' },
  high:   { label: '🔴 Alta',    color: 0xED4245, emoji: '🔴', prefix: 'high' },
  urgent: { label: '🚨 Urgente', color: 0xFF0000, emoji: '🚨', prefix: 'urgente' },
};

const STATUS_COLOR = { open: 0x57F287, closed: 0xED4245, claimed: 0xFEE75C };

const RATING_COLORS = { 1: 0xED4245, 2: 0xFF8C00, 3: 0xFEE75C, 4: 0x5865F2, 5: 0x57F287 };
const RATING_LABELS = { 1: 'Muy mala', 2: 'Mala', 3: 'Regular', 4: 'Buena', 5: 'Excelente' };

function parseEmoji(str) {
  if (!str) return undefined;
  const m = str.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
  if (m) return { name: m[1], id: m[2], animated: str.startsWith('<a:') };
  return str;
}

const BUTTON_STYLES_MAP = { '1': ButtonStyle.Primary, '2': ButtonStyle.Secondary, '3': ButtonStyle.Success, '4': ButtonStyle.Danger };

async function getConfig(guildId) {
  const pgCfg = await ticketDb.getConfig(guildId);
  if (pgCfg && pgCfg.panelChannel) {
    const categories = await ticketDb.getCategories(guildId);
    return { ...pgCfg, categories };
  }

  const oldGuildCfg = db.get('guilds', guildId, {});
  const oldTickets = oldGuildCfg.tickets;
  if (oldTickets && (oldTickets.channelId || oldTickets.panelChannel)) {
    const migrated = {
      panelChannel: oldTickets.channelId || oldTickets.panelChannel || '',
      supportRole: oldTickets.supportRoleId || oldTickets.supportRole || '',
      logChannel: oldTickets.logChannelId || oldTickets.logChannel || '',
      ticketCategory: oldTickets.categoryId || oldTickets.ticketCategory || '',
      channelPrefix: oldTickets.prefix || oldTickets.channelPrefix || 'ticket',
      maxPerUser: oldTickets.maxTickets || oldTickets.maxPerUser || 3,
      pingOnOpen: oldTickets.pingRole !== undefined ? oldTickets.pingRole : (oldTickets.pingOnOpen !== undefined ? oldTickets.pingOnOpen : true),
      dmTranscript: oldTickets.dmTranscript !== undefined ? oldTickets.dmTranscript : true,
      autoCloseMinutes: oldTickets.autoCloseMinutes || 60,
      ratingEnabled: true,
      ratingRequired: false,
      welcomeMessage: oldTickets.welcomeMsg || '',
      panelTitle: oldTickets.title || oldTickets.panelTitle || 'Soporte',
      panelDescription: oldTickets.description || oldTickets.panelDescription || '',
      panelColor: oldTickets.color || oldTickets.panelColor || '#5865F2',
      panelImage: oldTickets.panelImage || '',
    };
    try {
      await ticketDb.saveConfig(guildId, migrated);
      console.log(`[TICKET] Migrated old config for guild ${guildId} to PostgreSQL`);
    } catch (e) {
      console.error('[TICKET] Migration error:', e.message);
    }
    const categories = await ticketDb.getCategories(guildId);
    return { ...migrated, categories };
  }

  return db.get('ticketConfig', guildId, {});
}

async function saveGuildConfig(guildId, cfg) {
  await ticketDb.saveConfig(guildId, cfg);
}

async function fetchAllMessages(channel) {
  let all = [];
  let lastId = null;
  while (true) {
    const opts = { limit: 100 };
    if (lastId) opts.before = lastId;
    const batch = await channel.messages.fetch(opts).catch(() => null);
    if (!batch || batch.size === 0) break;
    all = all.concat([...batch.values()]);
    lastId = batch.last()?.id;
    if (batch.size < 100) break;
  }
  return all.reverse();
}

async function generateTranscript(channel, ticketData) {
  const msgs = await fetchAllMessages(channel).catch(() => null);
  if (!msgs || !msgs.length) return null;

  const rows = msgs.map(m => {
    const time   = new Date(m.createdTimestamp).toLocaleString('es-ES');
    const avatar = m.author.displayAvatarURL({ size: 32, extension: 'png' });
    let content  = (m.content || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');

    const embedParts = m.embeds.map(e => {
      const parts = [];
      if (e.title) parts.push(`<b style="color:#a5aaff">${e.title}</b>`);
      if (e.description) parts.push(e.description.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'));
      if (e.fields?.length) parts.push(e.fields.map(f => `<b>${f.name}:</b> ${f.value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}`).join('<br>'));
      return parts.length ? `<div style="background:rgba(88,101,242,.08);border-left:3px solid #5865f2;padding:6px 10px;border-radius:4px;margin:4px 0">${parts.join('<br>')}</div>` : '';
    }).join('');

    const files = m.attachments.size ? `<br><span style="color:#00b0f4">[Archivos: ${[...m.attachments.values()].map(a=>`<a href="${a.url}" style="color:#00b0f4">${a.name}</a>`).join(', ')}]</span>` : '';
    const isBot = m.author.bot;
    const rowBg = isBot ? 'rgba(88,101,242,.06)' : 'transparent';

    let componentInfo = '';
    if (isBot && m.components?.length) {
      const labels = [];
      for (const comp of m.components) {
        if (comp.components) {
          for (const c of comp.components) {
            if (c.label) labels.push(c.label);
            if (c.placeholder) labels.push(`[${c.placeholder}]`);
          }
        }
      }
      if (labels.length) {
        componentInfo = `<br><span style="color:#949ba4;font-size:11px">📎 Componentes: ${labels.join(' · ')}</span>`;
      }
    }

    return `<tr style="background:${rowBg}">
      <td class="time">${time}</td>
      <td class="author"><img src="${avatar}" class="avatar"><b style="color:${isBot?'#a5aaff':'#dcddde'}">${m.author.tag}</b>${isBot?'<span class="bot-badge">BOT</span>':''}</td>
      <td class="msg">${content || embedParts || '<i style="color:#72767d">[Sin texto]</i>'}${files}${componentInfo}</td>
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
      <div class="header-title">Ticket #${String(ticketData.number).padStart(4,'0')} — ${ticketData.category || ticketData.categoryLabel || 'Soporte'}</div>
      <div class="header-sub">Transcript generado por System 777</div>
    </div>
  </div>
  ${prio ? `<div class="prio-badge" style="background:rgba(255,255,255,.12);color:#fff">${prio.emoji} Prioridad: ${prio.label}</div>` : ''}
  <div class="meta" style="margin-top:14px">
    <div class="meta-item"><span class="ml">Canal</span><span class="mv">#${channel.name}</span></div>
    <div class="meta-item"><span class="ml">Usuario</span><span class="mv">${ticketData.userTag}</span></div>
    <div class="meta-item"><span class="ml">Categoría</span><span class="mv">${ticketData.category || ticketData.categoryLabel || 'Soporte'}</span></div>
    <div class="meta-item"><span class="ml">Mensajes</span><span class="mv">${msgs.length}</span></div>
    <div class="meta-item"><span class="ml">Generado</span><span class="mv">${new Date().toLocaleString('es-ES')}</span></div>
    ${ticketData.claimedBy ? `<div class="meta-item"><span class="ml">Atendido por</span><span class="mv">${ticketData.claimedByTag}</span></div>` : ''}
    ${ticketData.rating ? `<div class="meta-item"><span class="ml">Valoración</span><span class="mv">${'⭐'.repeat(ticketData.rating)}</span></div>` : ''}
    ${ticketData.ratingComment ? `<div class="meta-item"><span class="ml">Comentario</span><span class="mv">${ticketData.ratingComment}</span></div>` : ''}
    ${ticketData.customFields && Object.keys(ticketData.customFields).length > 0 ? Object.entries(ticketData.customFields).map(([k, v]) => `<div class="meta-item"><span class="ml">${k}</span><span class="mv">${String(v).slice(0, 100)}</span></div>`).join('') : ''}
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

function buildPanel(cfg, guild) {
  const rawColor = cfg.panelColor ? parseInt(cfg.panelColor.replace('#', ''), 16) : cfg.color ? parseInt(cfg.color.replace('#', ''), 16) : 0x5865F2;
  const color    = isNaN(rawColor) ? 0x5865F2 : rawColor;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(cfg.panelTitle || '🎫 Centro de Soporte')
    .setDescription(
      (cfg.panelDescription || cfg.panelDesc) ??
      `Bienvenido al centro de soporte de **${guild.name}**.\n\n` +
      `¿Necesitas ayuda? Selecciona una categoría o presiona el botón para abrir un ticket.\n` +
      `Nuestro equipo de soporte te atenderá lo antes posible.\n\n` +
      `> ⏱️ Tiempo de respuesta estimado: *${cfg.estimatedResponseTime || 'variable'}*\n` +
      `> 📌 Respeta al staff y sé paciente.`
    )
    .setThumbnail(guild.iconURL({ size: 256 }))
    .setFooter({ text: `${guild.name} · Soporte • Powered by System 777`, iconURL: guild.iconURL() || undefined })
    .setTimestamp();

  if (cfg.panelImage) embed.setImage(cfg.panelImage);

  const categories = (cfg.categories ?? []).filter(c => c.status !== 'inactive' && c.status !== 'disabled');

  if (categories.length > 0) {
    const catList = categories.map(c => `${c.emoji || '🎫'} **${c.label}** — ${c.description || 'Sin descripción'}`).join('\n');
    embed.addFields({ name: '📂 Categorías Disponibles', value: catList || 'Sin categorías', inline: false });
  }

  const components = [];

  if (categories.length > 0) {
    const select = new StringSelectMenuBuilder()
      .setCustomId('tkt_select')
      .setPlaceholder('📂 Selecciona el tipo de soporte...')
      .addOptions(categories.map(c => {
        const opt = {
          label: c.label,
          value: c.categoryId || String(c.id),
          description: (c.description || 'Abrir ticket en esta categoría').slice(0, 100),
        };
        if (c.emoji) opt.emoji = parseEmoji(c.emoji);
        return opt;
      }));
    components.push(new ActionRowBuilder().addComponents(select));
  }

  components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tkt_open_default')
      .setLabel('📩 Abrir Ticket')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setLabel('📋 Reglas')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${guild.id}`),
  ));

  return { embeds: [embed], components };
}

function buildControlPanel(ticketData) {
  const isClosed = ticketData.status === 'closed';
  const claimed  = !!ticketData.claimedBy;
  const prio     = ticketData.priority || 'low';

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tkt_close').setLabel(isClosed ? '🔓 Reabrir' : '🔒 Cerrar').setStyle(isClosed ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('tkt_claim').setLabel(claimed ? '🙋 Liberar' : '🙋 Reclamar').setStyle(claimed ? ButtonStyle.Secondary : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('tkt_transcript').setLabel('📋 Transcript').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tkt_add_user').setLabel('➕ Añadir').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tkt_move').setLabel('📂 Mover').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tkt_rename').setLabel('✏️ Renombrar').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tkt_delete').setLabel('🗑️ Eliminar').setStyle(ButtonStyle.Danger),
  );

  const row3 = new ActionRowBuilder().addComponents(
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

  return [row1, row2, row3];
}

function buildTicketEmbed(ticketData, member, guild) {
  const prio  = ticketData.priority || 'low';
  const prioD = PRIORITY[prio];
  const color = ticketData.claimedBy ? STATUS_COLOR.claimed
              : ticketData.status === 'closed' ? STATUS_COLOR.closed
              : prioD.color;

  const statusEmoji = ticketData.claimedBy ? '🟡' : ticketData.status === 'open' ? '🟢' : '🔴';
  const statusText  = ticketData.claimedBy
    ? `Reclamado por <@${ticketData.claimedBy}>`
    : ticketData.status === 'open' ? 'Esperando staff' : 'Cerrado';

  const catName = ticketData.category || ticketData.categoryLabel || 'Soporte';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🎫 Ticket #${String(ticketData.number).padStart(4, '0')} — ${catName}`)
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .setDescription(
      `Bienvenido ${member}, tu ticket ha sido creado exitosamente.\n\n` +
      `Describe tu problema con detalle y un miembro de nuestro equipo te atenderá en breve.\n` +
      (ticketData.reason ? `\n📝 **Motivo:**\n\`\`\`\n${ticketData.reason.slice(0, 500)}\n\`\`\`` : '')
    )
    .addFields(
      { name: '📂 Categoría',    value: `\`${catName}\``,                                              inline: true },
      { name: '⚡ Prioridad',    value: `${prioD.emoji} ${prioD.label}`,                               inline: true },
      { name: `${statusEmoji} Estado`, value: statusText,                                                inline: true },
      { name: '📅 Abierto',      value: ticketData.createdAt ? `<t:${Math.floor(ticketData.createdAt / 1000)}:R>` : 'Ahora', inline: true },
      { name: '👤 Usuario',      value: `<@${ticketData.userId}>`,                                      inline: true },
      { name: '🎫 ID',           value: `\`#${String(ticketData.number).padStart(4, '0')}\``,           inline: true },
    )
    .setFooter({ text: `${guild.name} · Soporte • Powered by System 777`, iconURL: guild.iconURL() || undefined })
    .setTimestamp();

  if (ticketData.status === 'open' && !ticketData.claimedBy) {
    embed.addFields({
      name: '📋 Instrucciones para el Staff',
      value: '1. Presiona **Reclamar** para atender el ticket\n2. Responde al usuario con la solución\n3. Usa **Cerrar** cuando el problema esté resuelto',
      inline: false,
    });
  }

  return embed;
}

async function syncPanel(guild, cfg) {
  if (!cfg.panelChannel) return;
  try {
    const ch = guild.channels.cache.get(cfg.panelChannel);
    if (!ch) return;
    const { embeds, components } = buildPanel(cfg, guild);

    if (cfg.panelMessageId) {
      const msg = await ch.messages.fetch(cfg.panelMessageId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds, components });
        return;
      }
    }

    const newMsg = await ch.send({ embeds, components });
    cfg.panelMessageId = newMsg.id;
    await saveGuildConfig(guild.id, cfg);
    try {
      await ticketDb.logAction(guild.id, null, null, 'ticket_panel_published', guild.client.user.id, guild.client.user.tag, { channelId: ch.id, messageId: newMsg.id });
    } catch (e) { console.error('[TICKET] logAction error:', e.message); }
  } catch (e) {
    console.error('[TICKET] Error syncPanel:', e.message);
  }
}

async function openModal(interaction, categoryId = 'default') {
  const cfg = await getConfig(interaction.guild.id);
  const categories = cfg.categories || [];
  let catName = 'Soporte';
  let customFields = [];

  if (categoryId && categoryId !== 'default') {
    const found = categories.find(c => String(c.id) === categoryId || c.categoryId === categoryId);
    if (found) {
      catName = found.label || 'Soporte';
      customFields = found.customFields || found.custom_form || [];
    }
  }

  if ((!customFields || customFields.length === 0) && cfg.formFields && typeof cfg.formFields === 'object') {
    customFields = cfg.formFields[categoryId] || cfg.formFields['default'] || [];
  }

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

  if (Array.isArray(customFields) && customFields.length > 0) {
    for (const field of customFields.slice(0, 3)) {
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(`tkt_custom_${field.id || field.label?.replace(/\s/g, '_')}`)
          .setLabel(field.label || 'Campo personalizado')
          .setStyle(field.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setPlaceholder(field.placeholder || '')
          .setRequired(field.required !== false)
          .setMaxLength(field.maxLength || 500)
      ));
    }
  }

  await interaction.showModal(modal);
}

async function createTicket(interaction, categoryId, razon, prioHint = '', customFields = {}) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const cfg = await getConfig(interaction.guild.id);
  if (!cfg.supportRole && !cfg.categories?.length) {
    return interaction.editReply({ content: '❌ Tickets no configurados desde el Dashboard.' });
  }

  const existingTickets = await ticketDb.getOpenTicketsByUser(interaction.guild.id, interaction.user.id);
  if (existingTickets.length > 0) {
    const existing = existingTickets[0];
    const ch = interaction.guild.channels.cache.get(existing.channelId);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Ir al ticket').setStyle(ButtonStyle.Link).setURL(ch?.url || `https://discord.com/channels/${interaction.guild.id}/${existing.channelId}`),
    );
    return interaction.editReply({
      content: '⚠️ Ya tienes un ticket abierto.',
      components: [row],
    });
  }

  const categories = cfg.categories || [];
  let category = null;
  let catDbId = null;
  if (categoryId && categoryId !== 'default') {
    category = categories.find(c => String(c.id) === categoryId || c.categoryId === categoryId);
    catDbId = category?.id || null;
  }

  const prioMap = { baja:'low', media:'medium', alta:'high', urgente:'urgent', low:'low', medium:'medium', high:'high', urgent:'urgent' };
  const priority = (category?.priority || prioMap[(prioHint||'').toLowerCase().trim()] || 'low');
  const prioD    = PRIORITY[priority];

  const count = await ticketDb.getNextTicketNumber(interaction.guild.id);
  const catName  = category?.label ?? 'Soporte General';
  const parentId = category?.channelCategoryId || cfg.ticketCategory;
  const effectiveStaffRole = category?.staffRole || cfg.supportRole;

  const perms = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id,                 allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: interaction.client.user.id,          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels] },
  ];
  if (effectiveStaffRole) {
    perms.push({ id: effectiveStaffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] });
  }

  const channelName = `${prioD.prefix}-${String(count).padStart(4,'0')}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,14)}`;

  let channel;
  try {
    channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentId || null,
      topic: `Ticket #${String(count).padStart(4,'0')} | ${interaction.user.tag} | ${catName}`,
      permissionOverwrites: perms,
    });
  } catch (e) {
    return interaction.editReply({ content: `❌ No pude crear el canal. Verifica que el bot tenga permiso **Gestionar Canales**.\n\`${e.message.slice(0,150)}\`` });
  }

  const ticketData = {
    ticketNumber: count,
    channelId: channel.id,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    guildId: interaction.guild.id,
    categoryId: catDbId,
    categoryLabel: catName,
    reason: razon,
    priority,
    status: 'open',
    claimedBy: '',
    claimedByTag: '',
    customFields: customFields && Object.keys(customFields).length > 0 ? customFields : null,
  };

  const savedTicket = await ticketDb.createTicket(ticketData);

  const embedData = {
    ...ticketData,
    number: count,
    category: catName,
    claimedBy: '',
    claimedByTag: '',
    createdAt: Date.now(),
  };

  const embed = buildTicketEmbed(embedData, interaction.member, interaction.guild);
  const components = buildControlPanel(embedData);

  const shouldPing = cfg.pingOnOpen !== false;
  const pingParts  = [];
  if (shouldPing && effectiveStaffRole) pingParts.push(`<@&${effectiveStaffRole}>`);
  const pingStr = pingParts.join(' ');

  await channel.send({
    content: `${pingStr ? pingStr + ' — ' : ''}${interaction.user} abrió el ticket **#${String(count).padStart(4,'0')}**`,
    embeds: [embed], components,
  });

  try {
    await ticketDb.logAction(interaction.guild.id, savedTicket?.id || null, count, 'ticket_created', interaction.user.id, interaction.user.tag, { category: catName, priority, reason: razon });
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  scheduleAutoClose(channel.id, interaction.guild.id, (cfg.autoCloseMinutes || 60) * 60 * 1000, interaction.client);

  await interaction.editReply({
    content: `✅ Ticket abierto: ${channel}\n> Categoría: **${catName}** · Prioridad: ${prioD.label}`,
  });
}

async function openCloseModal(interaction) {
  const ticketData = await ticketDb.getTicket(interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  if (ticketData.status === 'closed') return reopenTicket(interaction);

  const confirmEmbed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🔒 Cerrar Ticket')
    .setDescription('¿Estás seguro de que deseas cerrar este ticket?\nSe generará un transcript y el canal será eliminado en **10 segundos** después del cierre.')
    .addFields(
      { name: '🎫 Ticket', value: `#${String(ticketData.number).padStart(4, '0')}`, inline: true },
      { name: '📂 Categoría', value: ticketData.category || ticketData.categoryLabel || 'Soporte', inline: true },
    )
    .setFooter({ text: 'System 777 · Confirma para cerrar' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tkt_close_confirm').setLabel('🔒 Confirmar Cierre').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('tkt_close_cancel').setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary),
  );

  return interaction.reply({ embeds: [confirmEmbed], components: [row], flags: MessageFlags.Ephemeral });
}

async function closeTicket(interaction, reason = 'Sin razón especificada') {
  const ticketData = await ticketDb.getTicket(interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  if (ticketData.status === 'closed') return reopenTicket(interaction);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const cfg = await getConfig(interaction.guild.id);
  const ratingEnabled = cfg.ratingEnabled !== false;

  if (ratingEnabled && !ticketData.rating) {
    const ratingRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tkt_rflow_1_${interaction.channel.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tkt_rflow_2_${interaction.channel.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tkt_rflow_3_${interaction.channel.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tkt_rflow_4_${interaction.channel.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`tkt_rflow_5_${interaction.channel.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Primary),
    );

    const ratingEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⭐ Valoración del Soporte')
      .setDescription('Antes de cerrar este ticket, nos gustaría conocer tu opinión sobre el soporte recibido.\n\nPor favor, selecciona una calificación:')
      .setFooter({ text: `System 777 · Ticket #${String(ticketData.number).padStart(4, '0')}` })
      .setTimestamp();

    if (cfg.ratingRequired) {
      ratingEmbed.setDescription((ratingEmbed.data.description || '') + '\n\n⚠️ *La valoración es obligatoria para cerrar el ticket.*');
    }

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tkt_force_close').setLabel('⏭️ Cerrar sin valorar').setStyle(ButtonStyle.Danger),
    );

    await interaction.channel.send({
      embeds: [ratingEmbed],
      components: [ratingRow, closeRow],
    });

    await ticketDb.updateTicket(interaction.channel.id, { customFields: { pendingClose: { by: interaction.user.id, byTag: interaction.user.tag, reason, timestamp: Date.now() } } });

    await interaction.editReply({ content: '⭐ Se ha enviado el formulario de valoración. Espera a que el usuario valore o pulsa "Cerrar sin valorar".' });
    return;
  }

  await doCloseTicket(interaction, ticketData, reason, cfg);
}

async function doCloseTicket(interaction, ticketData, reason, cfg) {
  clearAutoClose(interaction.channel.id);

  await interaction.channel.permissionOverwrites.edit(ticketData.userId, {
    SendMessages: false, ViewChannel: false,
  }).catch(() => {});

  await ticketDb.closeTicket(interaction.channel.id, reason, interaction.user.id);
  try {
    await ticketDb.logAction(interaction.guild.id, ticketData.id, ticketData.number, 'ticket_closed', interaction.user.id, interaction.user.tag, { reason });
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  const logChannelId = cfg.logChannel;

  const transcriptBuf = await generateTranscript(interaction.channel, { ...ticketData, category: ticketData.categoryLabel || 'Soporte' });
  const attachment    = transcriptBuf ? new AttachmentBuilder(transcriptBuf, { name: `transcript-${interaction.channel.name}.html` }) : null;

  try {
    const messages  = await interaction.channel.messages.fetch({ limit: 10 });
    const ticketMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.components.length > 0);
    if (ticketMsg) {
      const member = await interaction.guild.members.fetch(ticketData.userId).catch(() => interaction.member);
      const closedData = { ...ticketData, status: 'closed', closedAt: Date.now(), closeReason: reason, closedBy: interaction.user.id, category: ticketData.categoryLabel || 'Soporte' };
      await ticketMsg.edit({ embeds: [buildTicketEmbed(closedData, member, interaction.guild)], components: buildControlPanel(closedData) });
    }
  } catch {}

  const timeOpen = Date.now() - (ticketData.createdAt ? new Date(ticketData.createdAt).getTime() : Date.now());
  const h = Math.floor(timeOpen / 3600000);
  const m = Math.floor((timeOpen % 3600000) / 60000);
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const catName = ticketData.categoryLabel || 'Soporte';

  const closeEmbed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🔒 Ticket Cerrado')
    .setThumbnail(interaction.guild.iconURL())
    .setDescription(
      `> Este ticket ha sido cerrado correctamente.\n` +
      `> El transcript se ha enviado a los canales correspondientes.`
    )
    .addFields(
      { name: '👤 Usuario',         value: `<@${ticketData.userId}>`,       inline: true },
      { name: '🙋 Cerrado por',     value: `${interaction.user}`,           inline: true },
      { name: '📂 Categoría',       value: catName,                        inline: true },
      { name: '⏱️ Tiempo abierto', value: timeStr,                         inline: true },
      { name: '⚡ Prioridad',       value: PRIORITY[ticketData.priority||'low'].label, inline: true },
      { name: '📝 Razón',           value: reason.slice(0, 500),            inline: false },
    )
    .setFooter({ text: `${interaction.guild.name} · System 777 · Ticket #${String(ticketData.number).padStart(4,'0')}` })
    .setTimestamp();

  if (ticketData.rating) {
    closeEmbed.addFields({ name: '⭐ Valoración', value: `${'⭐'.repeat(ticketData.rating)} (${ticketData.rating}/5)`, inline: true });
    if (ticketData.ratingComment) closeEmbed.addFields({ name: '💬 Comentario', value: ticketData.ratingComment.slice(0, 1024), inline: false });
  }

  const reopenRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tkt_close').setLabel('🔓 Reabrir').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tkt_transcript').setLabel('📋 Transcript').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('tkt_delete').setLabel('🗑️ Eliminar').setStyle(ButtonStyle.Danger),
  );

  const files = attachment ? [attachment] : [];
  await interaction.channel.send({ embeds: [closeEmbed], components: [reopenRow], files });

  if (logChannelId && attachment) {
    const logCh = interaction.guild.channels.cache.get(logChannelId);
    if (logCh) {
      await logCh.send({
        embeds: [new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`📋 Transcript — Ticket #${String(ticketData.number).padStart(4,'0')}`)
          .addFields(
            { name: '👤 Usuario',     value: `<@${ticketData.userId}>`, inline: true },
            { name: '🙋 Cerrado por', value: `${interaction.user}`,     inline: true },
            { name: '📂 Categoría',   value: catName,                   inline: true },
            { name: '⏱️ Duración',   value: timeStr,                   inline: true },
            { name: '📝 Razón',       value: reason,                   inline: false },
          )
          .setFooter({ text: 'System 777 · Transcript adjunto' })
          .setTimestamp()],
        files: [attachment],
      }).catch(() => {});
    }
  }

  if (cfg.dmTranscript !== false) {
    try {
      const user = await interaction.client.users.fetch(ticketData.userId);
      const dmEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Transcript de tu Ticket #${String(ticketData.number).padStart(4,'0')}`)
        .setDescription(`Tu ticket en **${interaction.guild.name}** ha sido cerrado.`)
        .addFields({ name: '📝 Razón del cierre', value: reason })
        .setFooter({ text: 'System 777 · Tu valoración ayuda a mejorar el soporte' });
      await user.send({
        embeds: [dmEmbed],
        files: attachment ? [new AttachmentBuilder(transcriptBuf, { name: `transcript-${interaction.channel.name}.html` })] : [],
      });
    } catch {}
  }

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: '✅ Ticket cerrado. Transcript generado. El canal se eliminará en **10 segundos**.' });
  } else {
    await interaction.reply({ content: '✅ Ticket cerrado. Transcript generado. El canal se eliminará en **10 segundos**.', flags: MessageFlags.Ephemeral });
  }

  setTimeout(async () => {
    await interaction.channel.delete(`Ticket cerrado por ${interaction.user.tag}`).catch(() => {});
  }, 10000);
}

async function handleRatingFlow(interaction, stars, channelId) {
  const ticketData = await ticketDb.getTicket(channelId);
  if (!ticketData) return interaction.reply({ content: '❌ Ticket no encontrado.', flags: MessageFlags.Ephemeral });

  await ticketDb.saveRating(channelId, stars, '');

  try {
    await ticketDb.logAction(ticketData.guildId, ticketData.id, ticketData.number, 'ticket_rating_received', interaction.user.id, interaction.user.tag, { rating: stars });
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  const starsStr = '⭐'.repeat(stars);
  const msgs = ['😔 Gracias por tu feedback. Mejoraremos.', '😐 Gracias por tu valoración.', '🙂 Gracias por tu valoración.', '😊 ¡Gracias! Nos alegra haber ayudado.', '🎉 ¡Increíble! Gracias por tu excelente valoración.'];

  await interaction.update({
    embeds: [new EmbedBuilder()
      .setColor(RATING_COLORS[stars])
      .setTitle(`${starsStr} Gracias por valorar el soporte`)
      .setDescription(msgs[stars - 1])
      .setFooter({ text: 'System 777 · Tu opinión importa' })
      .setTimestamp()],
    components: [],
  });

  const cfg    = await getConfig(ticketData.guildId);
  const guild  = interaction.client.guilds.cache.get(ticketData.guildId);
  const ratingChannelId = cfg.logChannel;

  if (guild && ratingChannelId) {
    const logCh = guild.channels.cache.get(ratingChannelId);
    if (logCh) {
      const timeOpen = Date.now() - (ticketData.createdAt ? new Date(ticketData.createdAt).getTime() : Date.now());
      const h = Math.floor(timeOpen / 3600000);
      const m = Math.floor((timeOpen % 3600000) / 60000);
      const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

      await logCh.send({
        embeds: [new EmbedBuilder()
          .setColor(RATING_COLORS[stars])
          .setTitle(`${starsStr} Valoración recibida`)
          .addFields(
            { name: '⭐ Calificación', value: `${starsStr} (${stars}/5) — ${RATING_LABELS[stars]}`, inline: false },
            { name: '👤 Usuario', value: `<@${ticketData.userId}> (\`${ticketData.userId}\`)`, inline: true },
            { name: '👮 Staff', value: ticketData.claimedBy ? `<@${ticketData.claimedBy}>` : 'Sin reclamar', inline: true },
            { name: '🎫 Ticket', value: `#${String(ticketData.number).padStart(4,'0')}`, inline: true },
            { name: '📂 Categoría', value: ticketData.categoryLabel || 'Soporte', inline: true },
            { name: '🕒 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
            { name: '⏱️ Tiempo', value: timeStr, inline: true },
          )
          .setFooter({ text: 'System 777 · Rating system' })
          .setTimestamp()],
      }).catch(() => {});
    }
  }

  saveRatingStats(ticketData.guildId, ticketData, stars);

  const customFields = ticketData.customFields || {};
  if (customFields.pendingClose) {
    const closeInteraction = { ...interaction, user: { id: customFields.pendingClose.by, tag: customFields.pendingClose.byTag }, channel: interaction.channel, guild, client: interaction.client, reply: interaction.reply.bind(interaction), editReply: interaction.editReply ? interaction.editReply.bind(interaction) : interaction.followUp.bind(interaction) };
    const updatedTicket = await ticketDb.getTicket(channelId);
    setTimeout(async () => {
      await doCloseTicket(closeInteraction, updatedTicket, customFields.pendingClose.reason || 'Cerrado con valoración', cfg);
    }, 2000);
  }
}

function saveRatingStats(guildId, ticketData, stars) {
  const stats = db.get('ticketStats', guildId, { ratings: [], totalTickets: 0, totalRatings: 0, avgRating: 0, perStaff: {} });

  stats.ratings.push({
    stars,
    comment: ticketData.ratingComment || '',
    userId: ticketData.userId,
    userTag: ticketData.userTag,
    staffId: ticketData.claimedBy || 'unclaimed',
    staffTag: ticketData.claimedByTag || 'Sin reclamar',
    ticketNumber: ticketData.number,
    category: ticketData.categoryLabel || 'Soporte',
    categoryId: ticketData.categoryId,
    timestamp: Date.now(),
    duration: ticketData.closedAt ? new Date(ticketData.closedAt).getTime() - new Date(ticketData.createdAt).getTime() : Date.now() - new Date(ticketData.createdAt).getTime(),
  });

  stats.totalRatings = stats.ratings.length;
  stats.avgRating = stats.ratings.reduce((a, r) => a + r.stars, 0) / stats.ratings.length;

  const staffId = ticketData.claimedBy || 'unclaimed';
  if (!stats.perStaff[staffId]) {
    stats.perStaff[staffId] = { tag: ticketData.claimedByTag || 'Sin reclamar', total: 0, sum: 0, ratings: [] };
  }
  stats.perStaff[staffId].total++;
  stats.perStaff[staffId].sum += stars;
  stats.perStaff[staffId].ratings.push({ stars, ticketNumber: ticketData.number, timestamp: Date.now() });

  db.set('ticketStats', guildId, stats);
}

function getTicketStats(guildId) {
  const stats = db.get('ticketStats', guildId, { ratings: [], totalTickets: 0, totalRatings: 0, avgRating: 0 });
  const ratings = stats.ratings || [];

  const staffMap = {};
  for (const r of ratings) {
    if (!staffMap[r.staffId]) staffMap[r.staffId] = { tag: r.staffTag, total: 0, sum: 0, count: 0 };
    staffMap[r.staffId].total++;
    staffMap[r.staffId].sum += r.stars;
    staffMap[r.staffId].count++;
  }
  const staffRanking = Object.entries(staffMap)
    .map(([id, d]) => ({ id, tag: d.tag, avg: d.sum / d.count, total: d.total }))
    .sort((a, b) => b.avg - a.avg);

  const catMap = {};
  for (const r of ratings) {
    if (!catMap[r.categoryId]) catMap[r.categoryId] = { name: r.category, total: 0, sum: 0 };
    catMap[r.categoryId].total++;
    catMap[r.categoryId].sum += r.stars;
  }
  const categoryRanking = Object.entries(catMap)
    .map(([id, d]) => ({ id, name: d.name, avg: d.sum / d.total, total: d.total }))
    .sort((a, b) => b.avg - a.avg);

  const avgDuration = ratings.length > 0 ? ratings.reduce((a, r) => a + r.duration, 0) / ratings.length : 0;

  const positive = ratings.filter(r => r.stars >= 4).length;
  const csat = ratings.length > 0 ? Math.round((positive / ratings.length) * 100) : 0;

  return {
    avgRating: stats.avgRating || 0,
    totalRatings: ratings.length,
    staffRanking,
    categoryRanking,
    avgDuration,
    csat,
    recentRatings: ratings.slice(-20).reverse(),
  };
}

async function reopenTicket(interaction) {
  const ticketData = await ticketDb.getTicket(interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  await interaction.channel.permissionOverwrites.edit(ticketData.userId, {
    SendMessages: true, ViewChannel: true,
  }).catch(() => {});

  await ticketDb.reopenTicket(interaction.channel.id);

  try {
    await ticketDb.logAction(interaction.guild.id, ticketData.id, ticketData.number, 'ticket_reopened', interaction.user.id, interaction.user.tag, {});
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  const cfg = await getConfig(interaction.guild.id);
  scheduleAutoClose(interaction.channel.id, interaction.guild.id, (cfg.autoCloseMinutes || 60) * 60 * 1000, interaction.client);

  const reopenedData = { ...ticketData, status: 'open', closedAt: null, category: ticketData.categoryLabel || 'Soporte' };

  try {
    const messages  = await interaction.channel.messages.fetch({ limit: 20 });
    const ticketMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.embeds[0].data?.title?.includes('Ticket #'));
    if (ticketMsg) {
      const member = await interaction.guild.members.fetch(ticketData.userId).catch(() => interaction.member);
      await ticketMsg.edit({ embeds: [buildTicketEmbed(reopenedData, member, interaction.guild)], components: buildControlPanel(reopenedData) });
    }
  } catch {}

  return interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0x57F287)
      .setDescription(`🔓 **Ticket reabierto** por ${interaction.user}.`)
      .setTimestamp()],
  });
}

async function claimTicket(interaction) {
  const cfg = await getConfig(interaction.guild.id);
  const isStaff = cfg.supportRole
    ? interaction.member.roles.cache.has(cfg.supportRole)
    : interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

  if (!isStaff) return interaction.reply({ content: '❌ Solo el staff puede reclamar tickets.', flags: MessageFlags.Ephemeral });

  const ticketData = await ticketDb.getTicket(interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  if (ticketData.claimedBy === interaction.user.id) {
    await ticketDb.unclaimTicket(interaction.channel.id);
    try {
      await ticketDb.logAction(interaction.guild.id, ticketData.id, ticketData.number, 'ticket_unclaimed', interaction.user.id, interaction.user.tag, {});
    } catch (e) { console.error('[TICKET] logAction error:', e.message); }
    const member = await interaction.guild.members.fetch(ticketData.userId).catch(() => interaction.member);
    const unclaimedData = { ...ticketData, claimedBy: '', claimedByTag: '', category: ticketData.categoryLabel || 'Soporte' };
    try {
      const messages  = await interaction.channel.messages.fetch({ limit: 10 });
      const ticketMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.components.length > 0);
      if (ticketMsg) await ticketMsg.edit({ embeds: [buildTicketEmbed(unclaimedData, member, interaction.guild)], components: buildControlPanel(unclaimedData) });
    } catch {}
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x949ba4).setDescription(`🙋 ${interaction.user} liberó el ticket.`).setTimestamp()] });
  }

  if (ticketData.claimedBy && ticketData.claimedBy !== interaction.user.id) {
    return interaction.reply({ content: `❌ Ticket ya reclamado por <@${ticketData.claimedBy}>.`, flags: MessageFlags.Ephemeral });
  }

  await ticketDb.claimTicket(interaction.channel.id, interaction.user.id, interaction.user.tag);
  try {
    await ticketDb.logAction(interaction.guild.id, ticketData.id, ticketData.number, 'ticket_claimed', interaction.user.id, interaction.user.tag, {});
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  const claimedData = { ...ticketData, claimedBy: interaction.user.id, claimedByTag: interaction.user.tag, category: ticketData.categoryLabel || 'Soporte' };

  try {
    const messages  = await interaction.channel.messages.fetch({ limit: 10 });
    const ticketMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.components.length > 0);
    if (ticketMsg) {
      const member = await interaction.guild.members.fetch(ticketData.userId).catch(() => interaction.member);
      await ticketMsg.edit({ embeds: [buildTicketEmbed(claimedData, member, interaction.guild)], components: buildControlPanel(claimedData) });
    }
  } catch {}

  return interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0xFEE75C)
      .setDescription(`🙋 **${interaction.user}** reclamó el ticket.\nTe atenderá en breve. ¡Ten paciencia!`)
      .setTimestamp()],
  });
}

async function setPriority(interaction) {
  const cfg = await getConfig(interaction.guild.id);
  const isStaff = cfg.supportRole
    ? interaction.member.roles.cache.has(cfg.supportRole)
    : interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

  if (!isStaff) return interaction.reply({ content: '❌ Solo el staff puede cambiar la prioridad.', flags: MessageFlags.Ephemeral });

  const ticketData = await ticketDb.getTicket(interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  const newPrio = interaction.values[0];
  const prioD   = PRIORITY[newPrio] || PRIORITY.low;

  await ticketDb.setPriority(interaction.channel.id, newPrio);
  try {
    await ticketDb.logAction(interaction.guild.id, ticketData.id, ticketData.number, 'ticket_priority_changed', interaction.user.id, interaction.user.tag, { priority: newPrio, previousPriority: ticketData.priority || 'low' });
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  const nameParts = interaction.channel.name.split('-').slice(1);
  await interaction.channel.setName(`${prioD.prefix}-${nameParts.join('-')}`.slice(0, 100)).catch(() => {});

  const updatedData = { ...ticketData, priority: newPrio, category: ticketData.categoryLabel || 'Soporte' };

  try {
    const messages  = await interaction.channel.messages.fetch({ limit: 10 });
    const ticketMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.components.length > 0);
    if (ticketMsg) {
      const member = await interaction.guild.members.fetch(ticketData.userId).catch(() => interaction.member);
      await ticketMsg.edit({ embeds: [buildTicketEmbed(updatedData, member, interaction.guild)], components: buildControlPanel(updatedData) });
    }
  } catch {}

  return interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(prioD.color)
      .setDescription(`${prioD.emoji} Prioridad cambiada a **${prioD.label}** por ${interaction.user}.`)
      .setTimestamp()],
  });
}

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
    const ticketData = await ticketDb.getTicket(interaction.channel.id);
    if (ticketData) {
      try {
        await ticketDb.logAction(interaction.guild.id, ticketData.id, ticketData.number, 'ticket_user_added', interaction.user.id, interaction.user.tag, { addedUserId: userId, addedUserTag: member.user.tag });
      } catch (e) { console.error('[TICKET] logAction error:', e.message); }
    }
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

async function handleRating(interaction, stars, channelId) {
  const ticketData = await ticketDb.getTicket(channelId);
  if (!ticketData) return interaction.reply({ content: '❌ Ticket no encontrado.', flags: MessageFlags.Ephemeral });
  if (ticketData.userId !== interaction.user.id) return interaction.reply({ content: '❌ Esta valoración no es para ti.', flags: MessageFlags.Ephemeral });
  if (ticketData.rating) return interaction.reply({ content: '❌ Ya valoraste este ticket.', flags: MessageFlags.Ephemeral });

  await ticketDb.saveRating(channelId, stars, '');

  try {
    await ticketDb.logAction(ticketData.guildId, ticketData.id, ticketData.number, 'ticket_rating_received', interaction.user.id, interaction.user.tag, { rating: stars });
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  const starsStr = '⭐'.repeat(stars);
  const msgs = ['😔 Gracias por tu feedback. Mejoraremos.', '😐 Gracias por tu valoración.', '🙂 Gracias por tu valoración.', '😊 ¡Gracias! Nos alegra haber ayudado.', '🎉 ¡Increíble! Gracias por tu excelente valoración.'];

  await interaction.update({
    embeds: [new EmbedBuilder()
      .setColor(RATING_COLORS[stars])
      .setTitle(`${starsStr} Gracias por valorar el soporte`)
      .setDescription(msgs[stars - 1])
      .setFooter({ text: 'System 777 · Tu opinión importa' })
      .setTimestamp()],
    components: [],
  });

  const cfg   = await getConfig(ticketData.guildId);
  const guild = interaction.client.guilds.cache.get(ticketData.guildId);
  if (cfg.logChannel && guild) {
    const logCh = guild.channels.cache.get(cfg.logChannel);
    if (logCh) {
      await logCh.send({
        embeds: [new EmbedBuilder()
          .setColor(RATING_COLORS[stars])
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

  saveRatingStats(ticketData.guildId, ticketData, stars);
}

async function openRatingModal(interaction, stars) {
  const modal = new ModalBuilder()
    .setCustomId(`tkt_rating_modal_${stars}`)
    .setTitle('💬 Tu Opinión');

  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('tkt_rating_comment')
      .setLabel('¿Cómo fue tu experiencia?')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Escribe aquí tu opinión...')
      .setRequired(false)
      .setMaxLength(500)
  ));

  await interaction.showModal(modal);
}

async function handleRatingModal(interaction, stars) {
  const comment = interaction.fields.getTextInputValue('tkt_rating_comment') || '';

  const ticketData = await ticketDb.getTicket(interaction.channel?.id);
  if (ticketData) {
    await ticketDb.saveRating(interaction.channel.id, stars, comment);
    try {
      await ticketDb.logAction(ticketData.guildId, ticketData.id, ticketData.number, 'ticket_rating_received', interaction.user.id, interaction.user.tag, { rating: stars, comment: comment || '' });
    } catch (e) { console.error('[TICKET] logAction error:', e.message); }
  }

  const starsStr = '⭐'.repeat(stars);
  const msgs = ['😔 Gracias por tu feedback. Mejoraremos.', '😐 Gracias por tu valoración.', '🙂 Gracias por tu valoración.', '😊 ¡Gracias! Nos alegra haber ayudado.', '🎉 ¡Increíble! Gracias por tu excelente valoración.'];

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(RATING_COLORS[stars])
      .setTitle(`${starsStr} Gracias por valorar el soporte`)
      .setDescription(msgs[stars - 1])
      .setFooter({ text: 'System 777 · Tu opinión importa' })
      .setTimestamp()],
  });

  if (ticketData) {
    saveRatingStats(ticketData.guildId, ticketData, stars);
  }
}

async function moveTicket(interaction, newCatId) {
  const ticketData = await ticketDb.getTicket(interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Ticket no encontrado.', flags: MessageFlags.Ephemeral });

  const cfg = await getConfig(interaction.guild.id);
  const categories = cfg.categories || [];
  const newCat = categories.find(c => String(c.id) === newCatId || c.categoryId === newCatId);
  if (!newCat) return interaction.reply({ content: '❌ Categoría no encontrada.', flags: MessageFlags.Ephemeral });

  const newCatLabel = newCat.label || newCatId;
  await ticketDb.moveTicket(interaction.channel.id, newCat.id || newCatId, newCatLabel);
  try {
    await ticketDb.logAction(interaction.guild.id, ticketData.id, ticketData.number, 'ticket_moved', interaction.user.id, interaction.user.tag, { newCategory: newCatLabel, previousCategory: ticketData.categoryLabel || 'Soporte' });
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  await interaction.channel.setName(`${newCat.emoji || '🎫'}-${newCatLabel}-${ticketData.number}`.slice(0, 100)).catch(() => {});
  return interaction.reply({ content: `✅ Ticket movido a **${newCatLabel}**.`, flags: MessageFlags.Ephemeral });
}

async function sendTranscript(interaction) {
  const ticketData = await ticketDb.getTicket(interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const buf = await generateTranscript(interaction.channel, { ...ticketData, category: ticketData.categoryLabel || 'Soporte' });
  if (!buf) return interaction.editReply('❌ No pude generar el transcript.');

  const file = new AttachmentBuilder(buf, { name: `transcript-${interaction.channel.name}.html` });
  await interaction.editReply({ content: '✅ Transcript generado:', files: [file] });

  try {
    await ticketDb.logAction(interaction.guild.id, ticketData.id, ticketData.number, 'ticket_transcript_sent', interaction.user.id, interaction.user.tag, {});
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  try {
    const user = await interaction.client.users.fetch(ticketData.userId);
    await user.send({
      content: `📋 Transcript de tu ticket **#${String(ticketData.number).padStart(4,'0')}** en **${interaction.guild.name}**:`,
      files: [new AttachmentBuilder(buf, { name: `transcript-${interaction.channel.name}.html` })],
    });
  } catch {}
}

async function deleteTicket(interaction) {
  const ticketData = await ticketDb.getTicket(interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  clearAutoClose(interaction.channel.id);

  const cfg     = await getConfig(interaction.guild.id);
  const isStaff = cfg.supportRole
    ? interaction.member.roles.cache.has(cfg.supportRole)
    : interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
  const isOwner = interaction.user.id === ticketData.userId;

  if (!isStaff && !isOwner) return interaction.reply({ content: '❌ Sin permisos.', flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setDescription(`🗑️ Este ticket será eliminado en **10 segundos**...\n*Solicitado por ${interaction.user}*`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  try {
    await ticketDb.logAction(interaction.guild.id, ticketData.id, ticketData.number, 'ticket_deleted', interaction.user.id, interaction.user.tag, {});
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  setTimeout(async () => {
    await interaction.channel.delete(`Ticket eliminado por ${interaction.user.tag}`).catch(() => {});
  }, 10000);
}

const autoCloseTimers = new Map();

function scheduleAutoClose(channelId, guildId, timeoutMs = 3600000, client = null) {
  clearAutoClose(channelId);
  const timer = setTimeout(async () => {
    const ticketData = await ticketDb.getTicket(channelId);
    if (!ticketData || ticketData.status !== 'open') return;

    const cfg = await getConfig(guildId);
    const autoCloseMsg = cfg.autoCloseMessage || '⏰ Ticket cerrado por inactividad (1 hora sin actividad).';

    try {
      const channel = client?.channels?.cache?.get(channelId);
      if (!channel) return;

      await channel.permissionOverwrites.edit(ticketData.userId, {
        SendMessages: false, ViewChannel: false,
      }).catch(() => {});

      await ticketDb.closeTicket(channelId, autoCloseMsg, 'system:auto_close');
      try {
        await ticketDb.logAction(guildId, ticketData.id, ticketData.number, 'ticket_auto_closed', 'system', 'Auto Close', { reason: autoCloseMsg });
      } catch (e) { console.error('[TICKET] logAction error:', e.message); }

      const catName = ticketData.categoryLabel || 'Soporte';

      const closeEmbed = new EmbedBuilder()
        .setColor(0xFF9900)
        .setTitle('⏰ Ticket Cerrado — Auto-Close')
        .setDescription(autoCloseMsg)
        .addFields(
          { name: '👤 Usuario', value: `<@${ticketData.userId}>`, inline: true },
          { name: '📂 Categoría', value: catName, inline: true },
          { name: '⏱️ Cerrado tras', value: '1h de inactividad', inline: true },
        )
        .setFooter({ text: `System 777 · Ticket #${String(ticketData.number).padStart(4,'0')}` })
        .setTimestamp();

      const reopenRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tkt_close').setLabel('🔓 Reabrir').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tkt_transcript').setLabel('📋 Transcript').setStyle(ButtonStyle.Secondary),
      );

      await channel.send({ embeds: [closeEmbed], components: [reopenRow] }).catch(() => {});

      const transcriptBuf = await generateTranscript(channel, { ...ticketData, category: catName });
      if (transcriptBuf) {
        const attachment = new AttachmentBuilder(transcriptBuf, { name: `transcript-${channel.name}.html` });
        const logChannelId = cfg.logChannel;
        if (logChannelId) {
          const logCh = channel.guild.channels.cache.get(logChannelId);
          if (logCh) {
            await logCh.send({
              embeds: [new EmbedBuilder()
                .setColor(0xFF9900)
                .setTitle(`⏰ Transcript Auto-Close — Ticket #${String(ticketData.number).padStart(4,'0')}`)
                .addFields(
                  { name: '👤 Usuario', value: `<@${ticketData.userId}>`, inline: true },
                  { name: '📂 Categoría', value: catName, inline: true },
                )
                .setFooter({ text: 'System 777 · Auto-Close' })
                .setTimestamp()],
              files: [attachment],
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('[TICKET] Auto-close error:', e.message);
    }
    autoCloseTimers.delete(channelId);
  }, timeoutMs);

  autoCloseTimers.set(channelId, timer);
}

function clearAutoClose(channelId) {
  if (autoCloseTimers.has(channelId)) {
    clearTimeout(autoCloseTimers.get(channelId));
    autoCloseTimers.delete(channelId);
  }
}

function refreshAutoClose(channelId, guildId, client = null) {
  getConfig(guildId).then(cfg => {
    const timeout = (cfg.autoCloseMinutes || 60) * 60 * 1000;
    if (timeout > 0) scheduleAutoClose(channelId, guildId, timeout, client);
  });
}

async function refreshControlPanel(channel, ticketData) {
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    const controlMsg = messages.find(
      m => m.author.id === channel.client.user.id &&
           m.embeds.length > 0 &&
           m.components.length > 0 &&
           m.embeds[0].data?.title?.includes('Ticket #')
    );
    if (controlMsg) {
      const member = await channel.guild.members.fetch(ticketData.userId).catch(() => null);
      if (member) {
        const data = { ...ticketData, category: ticketData.categoryLabel || 'Soporte' };
        await controlMsg.edit({
          embeds: [buildTicketEmbed(data, member, channel.guild)],
          components: buildControlPanel(data),
        });
      }
    }
  } catch {}
}

function trackActivity(channelId, guildId, client = null) {
  ticketDb.getTicket(channelId).then(ticketData => {
    if (ticketData && ticketData.status === 'open') {
      refreshAutoClose(channelId, guildId, client);
    }
  }).catch(() => {});
}

function openRenameModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('tkt_modal_rename')
    .setTitle('✏️ Renombrar Ticket');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('tkt_new_name')
      .setLabel('Nuevo nombre del canal')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('mi-ticket-personalizado')
      .setRequired(true)
      .setMaxLength(90)
  ));
  return interaction.showModal(modal);
}

async function renameTicket(interaction) {
  const ticketData = await ticketDb.getTicket(interaction.channel.id);
  if (!ticketData) return interaction.reply({ content: '❌ Canal no es un ticket.', flags: MessageFlags.Ephemeral });

  const cfg = await getConfig(interaction.guild.id);
  const isStaff = cfg.supportRole
    ? interaction.member.roles.cache.has(cfg.supportRole)
    : interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

  if (!isStaff) return interaction.reply({ content: '❌ Solo el staff puede renombrar tickets.', flags: MessageFlags.Ephemeral });

  const newName = interaction.fields.getTextInputValue('tkt_new_name')
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!newName) return interaction.reply({ content: '❌ Nombre inválido. Usa solo letras, números, guiones.', flags: MessageFlags.Ephemeral });

  const oldName = interaction.channel.name;
  await interaction.channel.setName(newName.slice(0, 100)).catch(() => {});

  try {
    await ticketDb.logAction(interaction.guild.id, ticketData.id, ticketData.number, 'ticket_renamed', interaction.user.id, interaction.user.tag, { newName, previousName: oldName });
  } catch (e) { console.error('[TICKET] logAction error:', e.message); }

  return interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0x5865F2)
      .setDescription(`✏️ Ticket renombrado de **${oldName}** a **${newName}** por ${interaction.user}.`)
      .setTimestamp()],
  });
}

module.exports = {
  buildPanel, buildControlPanel, buildTicketEmbed,
  openModal, createTicket,
  openCloseModal, closeTicket, reopenTicket,
  claimTicket, setPriority,
  openAddUserModal, addUserToTicket,
  openRenameModal, renameTicket,
  handleRating, handleRatingFlow,
  openRatingModal, handleRatingModal,
  moveTicket,
  sendTranscript, deleteTicket,
  generateTranscript, syncPanel,
  getTicketStats, saveRatingStats,
  parseEmoji, RATING_COLORS, RATING_LABELS,
  scheduleAutoClose, clearAutoClose, refreshAutoClose,
  refreshControlPanel, trackActivity, fetchAllMessages,
};
