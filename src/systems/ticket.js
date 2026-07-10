const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const db = require('../utils/db');

async function handleOpen(interaction) {
  const cfg = db.get('guilds', interaction.guild.id, {});
  if (!cfg.ticketCategory) return interaction.reply({ content: '❌ Tickets no configurados. Usa `/ticket setup`.', flags: MessageFlags.Ephemeral });

  // Check existing ticket
  const existing = interaction.guild.channels.cache.find(
    c => c.name === `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}` && c.parentId === cfg.ticketCategory
  );
  if (existing) return interaction.reply({ content: `❌ Ya tienes un ticket abierto: ${existing}`, flags: MessageFlags.Ephemeral });

  // Create channel
  const perms = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];
  if (cfg.ticketRole) {
    perms.push({ id: cfg.ticketRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] });
  }

  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}`,
    type: ChannelType.GuildText,
    parent: cfg.ticketCategory,
    permissionOverwrites: perms,
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 Ticket Abierto')
    .setDescription(`Hola ${interaction.user}!\nDescribe tu problema o pregunta y el equipo de soporte te ayudará pronto.\n\n*Para cerrar el ticket usa el botón de abajo.*`)
    .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
    .setFooter({ text: `System 777 · Ticket de ${interaction.user.tag}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Cerrar Ticket').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_delete').setLabel('🗑️ Eliminar').setStyle(ButtonStyle.Danger),
  );

  const mention = cfg.ticketRole ? `<@&${cfg.ticketRole}> ` : '';
  await channel.send({ content: `${mention}${interaction.user}`, embeds: [embed], components: [row] });

  await interaction.reply({ content: `✅ Ticket creado: ${channel}`, flags: MessageFlags.Ephemeral });
}

async function handleClose(interaction) {
  const ch = interaction.channel;
  if (!ch.name.startsWith('ticket-')) return interaction.reply({ content: '❌ No estás en un canal de ticket.', flags: MessageFlags.Ephemeral });

  await ch.permissionOverwrites.cache.forEach(overwrite => {
    if (overwrite.type === 1) { // 1 = member
      ch.permissionOverwrites.edit(overwrite.id, { SendMessages: false, ViewChannel: false }).catch(() => {});
    }
  });

  await ch.send({
    embeds: [new EmbedBuilder()
      .setColor(0xFF6600)
      .setDescription(`🔒 Ticket cerrado por ${interaction.user}. Usa **Eliminar** para borrar el canal.`)
      .setTimestamp()],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_delete').setLabel('🗑️ Eliminar Canal').setStyle(ButtonStyle.Danger),
    )],
  });

  await interaction.reply({ content: '✅ Ticket cerrado.', flags: MessageFlags.Ephemeral });
}

async function handleDelete(interaction) {
  const ch = interaction.channel;
  if (!ch.name.startsWith('ticket-')) return interaction.reply({ content: '❌ No estás en un canal de ticket.', flags: MessageFlags.Ephemeral });
  await interaction.reply({ content: '🗑️ Eliminando canal en 3 segundos...', flags: MessageFlags.Ephemeral });
  setTimeout(() => ch.delete('Ticket eliminado').catch(() => {}), 3000);
}

module.exports = { handleOpen, handleClose, handleDelete };
