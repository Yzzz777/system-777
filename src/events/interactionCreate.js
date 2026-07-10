const {
  EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} = require('discord.js');
const db        = require('../utils/db');
const { buildEmbed, buildRow } = require('../systems/giveaway');
const helpCmd   = require('../commands/utility/help');
const tkt       = require('../systems/ticketSystem');
const prem      = require('../systems/premium');
const cooldown  = require('../utils/cooldown');
const missions  = require('../systems/missions');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // ── BOTONES ────────────────────────────────────────────────────
    if (interaction.isButton()) {
      // Verify button
      if (interaction.customId === 'verify_button') {
        const cfg = db.get('guilds', interaction.guild.id, {});
        const verifyCfg = cfg.verification || {};
        if (!verifyCfg.active || !verifyCfg.roleId) {
          return interaction.reply({ content: '❌ Verificación no configurada.', flags: MessageFlags.Ephemeral });
        }
        try {
          await interaction.member.roles.add(verifyCfg.roleId);
          await interaction.reply({ content: '✅ ¡Verificado! Ahora tienes acceso al servidor.', flags: MessageFlags.Ephemeral });
        } catch (e) {
          await interaction.reply({ content: '❌ No pude darte el rol. Contacta al staff.', flags: MessageFlags.Ephemeral });
        }
        return;
      }

      // Giveaway: gw_enter_<messageId>
      if (interaction.customId.startsWith('gw_enter_')) {
        const gwId = interaction.customId.replace('gw_enter_', '');
        const gw   = db.get('giveaways', gwId);

        if (!gw || gw.ended) {
          return interaction.reply({ content: '❌ Este sorteo ya terminó.', flags: MessageFlags.Ephemeral });
        }

        const userId = interaction.user.id;

        // Verificar rol requerido
        if (gw.requiredRole) {
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          if (!member?.roles.cache.has(gw.requiredRole)) {
            return interaction.reply({
              content: `❌ Necesitas el rol <@&${gw.requiredRole}> para participar.`,
              flags: MessageFlags.Ephemeral
            });
          }
        }

        // Verificar nivel mínimo
        if (gw.minLevel) {
          const lvlData = db.get('levels', `${interaction.guild.id}_${userId}`, { level: 0 });
          if (lvlData.level < gw.minLevel) {
            return interaction.reply({
              content: `❌ Necesitas nivel **${gw.minLevel}** para participar. Tu nivel actual: **${lvlData.level}**.`,
              flags: MessageFlags.Ephemeral
            });
          }
        }

        const entries = gw.entries ?? [];
        const yaEntra = entries.includes(userId);

        if (yaEntra) {
          // Toggle: salir del sorteo
          gw.entries = entries.filter(id => id !== userId);
          db.set('giveaways', gwId, gw);
          await interaction.reply({ content: '🚪 Saliste del sorteo.', flags: MessageFlags.Ephemeral });
        } else {
          // Entrar
          entries.push(userId);
          gw.entries = entries;
          db.set('giveaways', gwId, gw);
          await interaction.reply({ content: '✅ ¡Entraste al sorteo! Buena suerte 🎉', flags: MessageFlags.Ephemeral });
        }

        // Actualizar embed con el nuevo conteo
        try {
          await interaction.message.edit({
            embeds: [buildEmbed(gw, gw.entries.length)],
            components: [buildRow(gwId, false)],
          });
        } catch {}

        return;
      }

      // ── Botones de matrimonio ─────────────────────────────────
      if (interaction.customId.startsWith('marry_')) {
        return interaction.reply({ content: '💍 Esta propuesta ya expiró.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }

      // ── Botones Premium: prem_buy_<plan> ─────────────────────
      if (interaction.customId.startsWith('prem_buy_')) {
        const planKey  = interaction.customId.replace('prem_buy_', '');
        const planInfo = prem.planInfo(planKey);
        if (!planInfo) return interaction.reply({ content: '❌ Plan inválido.', flags: MessageFlags.Ephemeral });

        const modal = new ModalBuilder()
          .setCustomId(`prem_modal_${planKey}`)
          .setTitle(`${planInfo.emoji} Comprar Premium ${planInfo.name}`);

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('prem_nombre')
              .setLabel('Tu nombre o apodo')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('¿Cómo te llamas?')
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('prem_metodo')
              .setLabel('Método de pago que usarás')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Ej: Zelle, PayPal, transferencia bancaria, efectivo...')
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('prem_referencia')
              .setLabel('Referencia / confirmación de pago')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Número de referencia, captura, o "pagaré hoy"')
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('prem_nota')
              .setLabel('Nota adicional para el dueño (opcional)')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Cualquier cosa que quieras decirle al dueño...')
              .setRequired(false)
          ),
        );

        return interaction.showModal(modal);
      }

      // ── Botones del panel DM del owner ────────────────────────
      if (interaction.customId.startsWith('dm_')) {
        const ownerId = process.env.OWNER_ID || client.application?.owner?.id;
        if (interaction.user.id !== ownerId) return interaction.reply({ content: '❌ Solo para el dueño.', flags: MessageFlags.Ephemeral });

        const id = interaction.customId;

        if (id === 'dm_estado') {
          const uptime = process.uptime();
          const d = Math.floor(uptime/86400), h = Math.floor((uptime%86400)/3600), m = Math.floor((uptime%3600)/60);
          const mem = process.memoryUsage();
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xF5C518)
              .setTitle('📊 Estado Completo — System 777')
              .addFields(
                { name: '🤖 Bot',       value: client.user.tag,                              inline: true },
                { name: '🏠 Servers',   value: `${client.guilds.cache.size}`,                inline: true },
                { name: '📡 Ping',      value: `${client.ws.ping}ms`,                        inline: true },
                { name: '⏱️ Uptime',   value: `${d}d ${h}h ${m}m`,                          inline: true },
                { name: '💾 Heap',      value: `${(mem.heapUsed/1024/1024).toFixed(1)} MB`,  inline: true },
                { name: '🧠 RSS',       value: `${(mem.rss/1024/1024).toFixed(1)} MB`,       inline: true },
                { name: '🌐 Node',      value: process.version,                              inline: true },
              ).setTimestamp().setFooter({ text: 'System 777 · Solo para mr 777 👑' })],
            flags: MessageFlags.Ephemeral
          });
        }

        if (id === 'dm_servidores') {
          await client.guilds.fetch().catch(() => {});
          const lines = client.guilds.cache.map(g => `• **${g.name}** · ${g.memberCount} miembros`).slice(0, 15);
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle(`🏠 Servidores (${client.guilds.cache.size})`)
              .setDescription(lines.join('\n') || 'Ninguno')
              .setFooter({ text: 'System 777 · Dev: 777' })],
            flags: MessageFlags.Ephemeral
          });
        }

        if (id === 'dm_sorteos') {
          const all = db.all('giveaways');
          const activos = Object.values(all).filter(g => !g.ended);
          const lines = activos.map(g => `🎁 **${g.prize}** · ${g.winners} gana. · <t:${Math.floor(g.endTime/1000)}:R>`);
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xF5C518)
              .setTitle(`🎉 Sorteos Activos (${activos.length})`)
              .setDescription(lines.join('\n') || 'Sin sorteos activos')
              .setFooter({ text: 'System 777 · Dev: 777' })],
            flags: MessageFlags.Ephemeral
          });
        }

        if (id === 'dm_economia') {
          const ecoData = db.all('economy');
          const total   = Object.values(ecoData).reduce((a, u) => a + (u.coins || 0) + (u.bank || 0), 0);
          const users   = Object.keys(ecoData).length;
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor(0x00FF88)
              .setTitle('💰 Stats de Economía Global')
              .addFields(
                { name: '👥 Usuarios con economía', value: `${users}`,                 inline: true },
                { name: '🪙 Monedas totales',        value: total.toLocaleString(),    inline: true },
              ).setFooter({ text: 'System 777 · Dev: 777' })],
            flags: MessageFlags.Ephemeral
          });
        }

        if (id === 'dm_lockdown') {
          let count = 0;
          for (const guild of client.guilds.cache.values()) {
            for (const channel of guild.channels.cache.values()) {
              if (channel.isTextBased()) {
                await channel.permissionOverwrites.edit(guild.roles.everyone, {
                  SendMessages: false
                }).catch(() => {});
                count++;
              }
            }
          }
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('🔒 Lockdown Global Activado')
              .setDescription(`Bloqueados **${count}** canales en **${client.guilds.cache.size}** servidores.`)
              .setFooter({ text: 'System 777 · Usa /antiraid lockdown para desbloquear' })],
            flags: MessageFlags.Ephemeral
          });
        }

        if (id === 'dm_comandos') {
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('📋 Todos los Comandos — System 777')
              .addFields(
                { name: '🎵 Música',       value: '`/play` `/queue` `/music skip/stop/pause/resume/volume/loop/shuffle/nowplaying`' },
                { name: '🔨 Moderación',   value: '`/ban` `/kick` `/warn` `/clear` `/timeout` `/softban` `/unban` `/slowmode` `/nuke` `/lock` `/unlock` `/role`' },
                { name: '🛡️ Protección',  value: '`/antiraid` `/whitelist` `/automod`' },
                { name: '📊 Niveles',      value: '`/rank` `/top` `/givexp`' },
                { name: '💰 Economía',     value: '`/balance` `/daily` `/work` `/pay` `/bank` `/rich` `/slots` `/rob` `/givecoins`' },
                { name: '🎮 Diversión',    value: '`/coinflip` `/8ball` `/rps` `/dice` `/ship` `/hack` `/pp` `/meme` `/poll` `/truth` `/dare`' },
                { name: '🎉 Sorteos',      value: '`/giveaway start/end/reroll/list/cancel`' },
                { name: 'ℹ️ Utilidad',    value: '`/userinfo` `/serverinfo` `/avatar` `/ping` `/botinfo` `/invite` `/snipe` `/calc` `/remind` `/rolelist` `/weather` `/translate` `/profile`' },
                { name: '🎭 Social',       value: '`/marry` `/divorce` `/hug` `/slap` `/pat` `/kiss`' },
                { name: '🎲 Juegos',       value: '`/tictactoe` `/trivia`' },
                { name: '👑 Owner',        value: '`/status` `/servers` `/globalban` `/broadcast` `/eval` `/spy` `/givexp` `/givecoins`' },
              ).setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })],
            flags: MessageFlags.Ephemeral
          });
        }

        if (id === 'dm_dashboard') {
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('🌐 Dashboard — System 777')
              .setDescription('Accede al dashboard oficial e inicia sesión con tu cuenta de Discord.')
              .addFields(
                { name: '🔗 Dashboard', value: '[Abrir Dashboard](https://jrsystem7777.com)', inline: false },
              ).setFooter({ text: 'System 777 · Inicia sesión con Discord' })],
            flags: MessageFlags.Ephemeral
          });
        }

        return;
      }

      // ── Blackjack hit/stand ───────────────────────────────────
      if (interaction.customId.startsWith('bj_')) {
        const blackjack = require('../commands/fun/blackjack');
        return blackjack.handleButton(interaction, client);
      }

      // ── Help paginado ─────────────────────────────────────────
      if (interaction.customId.startsWith('help_')) {
        const id = interaction.customId;
        if (id === 'help_home') {
          return interaction.update({
            embeds: [helpCmd.mainEmbed(interaction.client.user)],
            components: helpCmd.buildRows(),
          });
        }
        if (id.startsWith('help_cat_')) {
          const key = id.replace('help_cat_', '');
          if (!helpCmd.CATS[key]) return;
          return interaction.update({
            embeds: [helpCmd.catEmbed(interaction.client.user, key)],
            components: helpCmd.buildRows(key),
          });
        }
      }

      // ── Ticket profesional buttons ────────────────────────────
      if (interaction.customId.startsWith('tkt_')) {
        const id = interaction.customId;
        try {
          if (id.startsWith('tkt_open_'))   return await tkt.openModal(interaction, id.slice(9) || 'default');
          if (id === 'tkt_close')           return await tkt.openCloseModal(interaction);
          if (id === 'tkt_claim')           return await tkt.claimTicket(interaction);
          if (id === 'tkt_transcript')      return await tkt.sendTranscript(interaction);
          if (id === 'tkt_delete')          return await tkt.deleteTicket(interaction);
          if (id === 'tkt_add_user')        return await tkt.openAddUserModal(interaction);
          if (id === 'tkt_rating') {
            const { StringSelectMenuBuilder: SSMB, ActionRowBuilder: ARB } = require('discord.js');
            const select = new SSMB()
              .setCustomId('tkt_rating_select')
              .setPlaceholder('⭐ ¿Cómo fue tu experiencia?')
              .addOptions([
                { label: '⭐', value: '1', description: 'Mala experiencia' },
                { label: '⭐⭐', value: '2', description: 'Regular' },
                { label: '⭐⭐⭐', value: '3', description: 'Buena' },
                { label: '⭐⭐⭐⭐', value: '4', description: 'Muy buena' },
                { label: '⭐⭐⭐⭐⭐', value: '5', description: 'Excelente' },
              ]);
            return interaction.reply({ components: [new ARB().addComponents(select)], flags: MessageFlags.Ephemeral });
          }
          if (id === 'tkt_move') {
            const db2 = require('../utils/db');
            const cfg2 = db2.get('ticketConfig', interaction.guild.id, {});
            const cats = (cfg2.categories || []).map(c => ({ label: c.label, value: c.id, emoji: c.emoji || '📂' }));
            if (!cats.length) return interaction.reply({ content: '❌ No hay categorías configuradas.', flags: MessageFlags.Ephemeral });
            const { StringSelectMenuBuilder: SSMB, ActionRowBuilder: ARB } = require('discord.js');
            const select = new SSMB().setCustomId('tkt_move_select').setPlaceholder('📂 Mover a categoría...')
              .addOptions(cats.slice(0, 25));
            return interaction.reply({ components: [new ARB().addComponents(select)], flags: MessageFlags.Ephemeral });
          }
          if (id.startsWith('tkt_rating_')) {
            const parts = id.split('_'); // tkt_rating_STARS_CHANNELID
            const stars  = parseInt(parts[2]);
            const chId   = parts.slice(3).join('_');
            return await tkt.handleRating(interaction, stars, chId);
          }
        } catch (e) {
          console.error('[TICKET] Error en botón:', e.message);
          const msg = { content: '❌ Error en el sistema de tickets. Inténtalo de nuevo.', flags: MessageFlags.Ephemeral };
          if (interaction.replied || interaction.deferred) interaction.followUp(msg).catch(() => {});
          else interaction.reply(msg).catch(() => {});
        }
        return;
      }

      // ── Button roles ──────────────────────────────────────────
      if (interaction.customId.startsWith('role_toggle_')) {
        const roleId = interaction.customId.replace('role_toggle_', '');
        const member = interaction.member;
        if (!member) return interaction.reply({ content: '❌ Solo en servidores.', flags: MessageFlags.Ephemeral });
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: '❌ Rol no encontrado.', flags: MessageFlags.Ephemeral });
        try {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(role);
            return interaction.reply({ content: `✅ Rol **${role.name}** removido.`, flags: MessageFlags.Ephemeral });
          } else {
            await member.roles.add(role);
            return interaction.reply({ content: `✅ Rol **${role.name}** asignado.`, flags: MessageFlags.Ephemeral });
          }
        } catch (e) {
          return interaction.reply({ content: `❌ No pude modificar el rol: ${e.message}`, flags: MessageFlags.Ephemeral });
        }
      }

      // ── Suggest votes ─────────────────────────────────────────
      if (interaction.customId === 'suggest_up' || interaction.customId === 'suggest_down') {
        const msgId = interaction.message.id;
        const sug   = db.get('suggestions', msgId);
        if (!sug) return interaction.reply({ content: '❌ Sugerencia no encontrada.', flags: MessageFlags.Ephemeral });

        const uid   = interaction.user.id;
        const isUp  = interaction.customId === 'suggest_up';

        if (isUp) {
          sug.down = sug.down.filter(id => id !== uid);
          if (sug.up.includes(uid)) { sug.up = sug.up.filter(id => id !== uid); }
          else { sug.up.push(uid); }
        } else {
          sug.up = sug.up.filter(id => id !== uid);
          if (sug.down.includes(uid)) { sug.down = sug.down.filter(id => id !== uid); }
          else { sug.down.push(uid); }
        }
        db.set('suggestions', msgId, sug);

        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        const fields = embed.data.fields.map(f => {
          if (f.name === '👍 A favor')   return { ...f, value: `${sug.up.length}` };
          if (f.name === '👎 En contra') return { ...f, value: `${sug.down.length}` };
          return f;
        });
        embed.setFields(fields);

        await interaction.update({ embeds: [embed], components: interaction.message.components });
        return;
      }

      return; // Otros botones no manejados
    }

    // ── SELECT MENUS ───────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.customId === 'tkt_select')   return await tkt.openModal(interaction, interaction.values[0]);
        if (interaction.customId === 'tkt_priority') return await tkt.setPriority(interaction);
        if (interaction.customId === 'tkt_rating_select') {
          const stars = parseInt(interaction.values[0]);
          const ticketData = db.get('tickets', interaction.channel.id);
          if (ticketData) {
            ticketData.rating = stars;
            ticketData.ratedAt = Date.now();
            db.set('tickets', interaction.channel.id, ticketData);
          }
          const starsEmoji = '⭐'.repeat(stars);
          return interaction.update({ content: `${starsEmoji} ¡Gracias por tu valoración!`, components: [] });
        }
        if (interaction.customId === 'tkt_move_select') {
          const newCatId = interaction.values[0];
          const ticketData2 = db.get('tickets', interaction.channel.id);
          if (!ticketData2) return interaction.reply({ content: '❌ Ticket no encontrado.', flags: MessageFlags.Ephemeral });
          const cfg3 = db.get('ticketConfig', interaction.guild.id, {});
          const newCat = cfg3.categories?.find(c => c.id === newCatId);
          ticketData2.category = newCat?.label || newCatId;
          ticketData2.categoryId = newCatId;
          db.set('tickets', interaction.channel.id, ticketData2);
          await interaction.channel.setName(`${newCat?.emoji || '🎫'}-${newCat?.label || newCatId}-${ticketData2.number}`).catch(() => {});
          return interaction.reply({ content: `✅ Ticket movido a **${newCat?.label || newCatId}**.`, flags: MessageFlags.Ephemeral });
        }
      } catch (e) {
        console.error('[TICKET] Error en select menu:', e.message);
        interaction.reply({ content: '❌ Error procesando selección de ticket.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }

    // ── MODALES ────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      // Ticket: rating modal
      if (interaction.customId === 'tkt_rating_modal') {
        const stars = parseInt(interaction.fields.getTextInputValue('tkt_rating_stars'));
        const comment = interaction.fields.getTextInputValue('tkt_rating_comment') || '';
        if (isNaN(stars) || stars < 1 || stars > 5) {
          return interaction.reply({ content: '❌ Ingresa un número del 1 al 5.', flags: MessageFlags.Ephemeral });
        }
        const ticketData3 = db.get('tickets', interaction.channel.id);
        if (ticketData3) {
          ticketData3.rating = stars;
          ticketData3.ratingComment = comment;
          ticketData3.ratedAt = Date.now();
          db.set('tickets', interaction.channel.id, ticketData3);
        }
        const starsEmoji = '⭐'.repeat(stars);
        return interaction.reply({ embeds: [new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('⭐ Valoración Enviada')
          .setDescription(`${starsEmoji}\n${comment ? `**Comentario:** ${comment}` : 'Sin comentario'}`)
          .setFooter({ text: 'System 777 · Gracias por tu valoración' })] });
      }
      // Ticket: modal de apertura
      if (interaction.customId.startsWith('tkt_modal_') && interaction.customId !== 'tkt_modal_close' && interaction.customId !== 'tkt_modal_add_user') {
        const categoryId = interaction.customId.replace('tkt_modal_', '');
        const razon      = interaction.fields.getTextInputValue('tkt_razon');
        const prioHint   = interaction.fields.getTextInputValue('tkt_prio_hint') || '';
        try {
          return await tkt.createTicket(interaction, categoryId, razon, prioHint);
        } catch (e) {
          console.error('[TICKET] Error creando ticket:', e.message);
          const msg = { content: '❌ No pude crear el ticket. Verifica que el bot tenga permisos en la categoría.', flags: MessageFlags.Ephemeral };
          if (interaction.replied || interaction.deferred) interaction.followUp(msg).catch(() => {});
          else interaction.reply(msg).catch(() => {});
          return;
        }
      }
      // Ticket: añadir usuario modal
      if (interaction.customId === 'tkt_modal_add_user') {
        try {
          return await tkt.addUserToTicket(interaction);
        } catch (e) {
          console.error('[TICKET] Error añadiendo usuario:', e.message);
          interaction.reply({ content: '❌ No pude añadir el usuario al ticket.', flags: MessageFlags.Ephemeral }).catch(() => {});
          return;
        }
      }
      // Ticket: modal de cierre
      if (interaction.customId === 'tkt_modal_close') {
        const reason = interaction.fields.getTextInputValue('tkt_close_reason') || 'Sin razón especificada';
        try {
          return await tkt.closeTicket(interaction, reason);
        } catch (e) {
          console.error('[TICKET] Error cerrando ticket:', e.message);
          const msg = { content: '❌ No pude cerrar el ticket. Revisa permisos del bot.', flags: MessageFlags.Ephemeral };
          if (interaction.replied || interaction.deferred) interaction.followUp(msg).catch(() => {});
          else interaction.reply(msg).catch(() => {});
          return;
        }
      }

      // ── Premium: formulario de compra ────────────────────────
      if (interaction.customId.startsWith('prem_modal_')) {
        const planKey  = interaction.customId.replace('prem_modal_', '');
        const planInfo = prem.planInfo(planKey);
        if (!planInfo) return;

        const nombre     = interaction.fields.getTextInputValue('prem_nombre');
        const metodo     = interaction.fields.getTextInputValue('prem_metodo');
        const referencia = interaction.fields.getTextInputValue('prem_referencia') || 'No especificada';
        const nota       = interaction.fields.getTextInputValue('prem_nota')       || 'Sin nota';

        // Guardar solicitud pendiente en DB
        const solicitudId = `${interaction.user.id}_${Date.now()}`;
        db.set('prem_requests', solicitudId, {
          userId:    interaction.user.id,
          userTag:   interaction.user.tag,
          plan:      planKey,
          nombre, metodo, referencia, nota,
          ts:        Date.now(),
          status:    'pending',
        });

        // DM al owner con botón de acción rápida
        const ownerId = process.env.OWNER_ID;
        if (ownerId) {
          try {
            const owner = await client.users.fetch(ownerId);
            const embed = new EmbedBuilder()
              .setColor(planInfo.color)
              .setTitle(`💰 Nueva Solicitud Premium — ${planInfo.emoji} ${planInfo.name}`)
              .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
              .addFields(
                { name: '👤 Usuario',       value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                { name: '📦 Plan',          value: `${planInfo.emoji} ${planInfo.name} — **${planInfo.price}**`, inline: true },
                { name: '💳 Método pago',   value: metodo,     inline: true },
                { name: '🏷️ Nombre/Apodo', value: nombre,     inline: true },
                { name: '🔖 Referencia',    value: referencia, inline: true },
                { name: '📝 Nota',          value: nota,       inline: false },
              )
              .setDescription(
                `Cuando confirmes el pago, usa:\n` +
                `\`\`\`\n/premiummgr grant usuario:${interaction.user.id} plan:${planKey} dias:30\n\`\`\``
              )
              .setFooter({ text: `ID solicitud: ${solicitudId}` })
              .setTimestamp();

            await owner.send({ embeds: [embed] });
          } catch (e) {
            console.warn('[PREMIUM] No pude DM al owner:', e.message);
          }
        }

        // Confirmación al usuario
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(planInfo.color)
            .setTitle(`${planInfo.emoji} ¡Solicitud enviada!`)
            .setDescription(
              `Tu solicitud de **${planInfo.name}** fue enviada al dueño.\n\n` +
              `Ahora procede con el pago usando el método que indicaste:\n**${metodo}**\n\n` +
              `El dueño revisará el pago y activará tu premium. ` +
              `Recibirás un DM cuando esté activado. 🎉`
            )
            .addFields({ name: '📋 Resumen', value: `Plan: ${planInfo.emoji} ${planInfo.name}\nPrecio: **${planInfo.price}**\nMétodo: ${metodo}` })
            .setFooter({ text: 'System 777 · Premium · Gracias por tu apoyo' })],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }
    }

    // ── SLASH COMMANDS ─────────────────────────────────────────────
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const ownerId = process.env.OWNER_ID || client.application?.owner?.id;
    const isOwner = interaction.user.id === ownerId;

    // Blacklist check
    if (!isOwner) {
      const bl = db.get('blacklist', 'users') || {};
      if (bl[interaction.user.id]) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🚫 Bloqueado')
            .setDescription(`No puedes usar System 777.\nRazón: ${bl[interaction.user.id].reason || 'Sin razón'}`)
            .setFooter({ text: 'System 777 · Blacklist' })],
          flags: MessageFlags.Ephemeral
        });
      }

      // Server blacklist check
      if (interaction.guildId) {
        const sbl = db.get('blacklist', 'servers') || {};
        if (sbl[interaction.guildId]) {
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('🚫 Servidor Bloqueado')
              .setDescription('Este servidor está bloqueado de usar System 777.')],
            flags: MessageFlags.Ephemeral
          });
        }
      }
    }

    // Maintenance mode check (skip ownerOnly commands)
    if (!isOwner && !command.ownerOnly) {
      const maint = db.get('bot_config', 'maintenance') || { active: false };
      if (maint.active) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF9900)
            .setTitle('🔧 Modo Mantenimiento')
            .setDescription(maint.message || 'El bot está en mantenimiento. Vuelve pronto.')
            .setFooter({ text: 'System 777 · Maintenance' })],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // Track analytics + mission progress
    try {
      const stats = db.get('analytics', 'commands_used') || {};
      stats[interaction.commandName] = (stats[interaction.commandName] || 0) + 1;
      db.set('analytics', 'commands_used', stats);
      if (interaction.guildId) missions.progress(interaction.user.id, interaction.guildId, 'commands');
    } catch {}

    // Global cooldown check
    if (command.cooldown && !isOwner) {
      const cd = cooldown.check(interaction.user.id, interaction.commandName, command.cooldown * 1000);
      if (!cd.ok) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF9900)
            .setDescription(`⏳ Espera **${cd.remaining}s** antes de usar este comando de nuevo.`)
            .setFooter({ text: 'System 777 · Cooldown' })],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (command.ownerOnly && !isOwner) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔒 Acceso Denegado')
          .setDescription('Este comando es exclusivo del **dueño de System 777**.')
          .setFooter({ text: 'System 777 · Developer 777' })],
        flags: MessageFlags.Ephemeral
      });
    }

    if (command.userPermissions) {
      const missing = interaction.member?.permissions.missing(command.userPermissions);
      if (missing?.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF6600)
            .setDescription(`❌ Te faltan permisos: \`${missing.join(', ')}\``)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`Error en /${interaction.commandName}:`, err);
      const msg = {
        embeds: [new EmbedBuilder()
          .setColor(0xFF0000)
          .setDescription('❌ Ocurrió un error al ejecutar el comando.')],
        flags: MessageFlags.Ephemeral
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  }
};
