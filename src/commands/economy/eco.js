const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('💰 Sistema de economía')
    .addSubcommand(s => s.setName('balance').setDescription('Ver tu dinero').addUserOption(o => o.setName('usuario').setDescription('Usuario')))
    .addSubcommand(s => s.setName('daily').setDescription('Recoge tu recompensa diaria'))
    .addSubcommand(s => s.setName('work').setDescription('Trabaja para ganar dinero'))
    .addSubcommand(s => s.setName('pay').setDescription('Pagar a otro usuario').addUserOption(o => o.setName('usuario').setDescription('Receptor').setRequired(true)).addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad').setRequired(true)))
    .addSubcommand(s => s.setName('bank').setDescription('Banco').addStringOption(o => o.setName('accion').setDescription('deposit/withdraw').addChoices({name:'Depositar',value:'deposit'},{name:'Retirar',value:'withdraw'}).setRequired(true)).addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad').setRequired(true)))
    .addSubcommand(s => s.setName('rich').setDescription('Top ricos del servidor'))
    .addSubcommand(s => s.setName('rob').setDescription('Intenta robar').addUserOption(o => o.setName('usuario').setDescription('Objetivo').setRequired(true)))
    .addSubcommand(s => s.setName('slots').setDescription('Tragamonedas').addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const eco = db.get('economy', userId, { coins: 0, bank: 0, lastDaily: 0, lastWork: 0 });

    if (sub === 'balance') {
      const target = interaction.options.getUser('usuario') || interaction.user;
      const tEco = db.get('economy', target.id, { coins: 0, bank: 0 });
      const embed = new EmbedBuilder().setColor(0xFEE75C).setTitle('💰 Balance')
        .addFields({name:'💵 Efectivo',value:`$${tEco.coins.toLocaleString()}`,inline:true},{name:'🏦 Banco',value:`$${tEco.bank.toLocaleString()}`,inline:true},{name:'💎 Total',value:`$${(tEco.coins+tEco.bank).toLocaleString()}`,inline:true})
        .setFooter({text:'System 777 · Dev: 777'});
      await interaction.reply({embeds:[embed]});
    } else if (sub === 'daily') {
      const now = Date.now();
      if (now - eco.lastDaily < 86400000) {
        const wait = 86400000 - (now - eco.lastDaily);
        const h = Math.floor(wait/3600000), m = Math.floor((wait%3600000)/60000);
        return interaction.reply({content:`⏰ Ya recolectaste tu daily. Espera ${h}h ${m}m.`, flags:MessageFlags.Ephemeral});
      }
      const amt = Math.floor(Math.random()*500)+200;
      eco.coins += amt; eco.lastDaily = now;
      db.set('economy', userId, eco);
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('🎁 Daily').setDescription(`Recibiste **$${amt}**`).setFooter({text:'System 777 · Dev: 777'})]});
    } else if (sub === 'work') {
      const now = Date.now();
      if (now - eco.lastWork < 1800000) {
        const wait = 1800000 - (now - eco.lastWork);
        const m = Math.floor(wait/60000), s = Math.floor((wait%60000)/1000);
        return interaction.reply({content:`⏰ Trabajaste recientemente. Espera ${m}m ${s}s.`, flags:MessageFlags.Ephemeral});
      }
      const jobs = ['programador','diseñador','hacker','miner','chef','piloto','doctor'];
      const amt = Math.floor(Math.random()*800)+100;
      eco.coins += amt; eco.lastWork = now;
      db.set('economy', userId, eco);
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('💼 Work').setDescription(`Trabajaste de **${jobs[Math.floor(Math.random()*jobs.length)]}** y ganaste **$${amt}**`).setFooter({text:'System 777 · Dev: 777'})]});
    } else if (sub === 'pay') {
      const target = interaction.options.getUser('usuario');
      const amt = interaction.options.getInteger('cantidad');
      if (target.id === userId) return interaction.reply({content:'❌ No te puedes pagar a ti mismo.',flags:MessageFlags.Ephemeral});
      if (amt <= 0) return interaction.reply({content:'❌ Cantidad inválida.',flags:MessageFlags.Ephemeral});
      if (eco.coins < amt) return interaction.reply({content:`❌ No tienes suficiente. Tienes $${eco.coins}.`,flags:MessageFlags.Ephemeral});
      eco.coins -= amt; db.set('economy', userId, eco);
      const tEco = db.get('economy', target.id, {coins:0,bank:0,lastDaily:0,lastWork:0});
      tEco.coins += amt; db.set('economy', target.id, tEco);
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('💸 Payment').setDescription(`**${interaction.user.tag}** pagó **$${amt}** a **${target.tag}**`).setFooter({text:'System 777 · Dev: 777'})]});
    } else if (sub === 'bank') {
      const acc = interaction.options.getString('accion');
      const amt = interaction.options.getInteger('cantidad');
      if (amt <= 0) return interaction.reply({content:'❌ Cantidad inválida.',flags:MessageFlags.Ephemeral});
      if (acc === 'deposit') {
        if (eco.coins < amt) return interaction.reply({content:`❌ Solo tienes $${eco.coins} en efectivo.`,flags:MessageFlags.Ephemeral});
        eco.coins -= amt; eco.bank += amt;
      } else {
        if (eco.bank < amt) return interaction.reply({content:`❌ Solo tienes $${eco.bank} en el banco.`,flags:MessageFlags.Ephemeral});
        eco.bank -= amt; eco.coins += amt;
      }
      db.set('economy', userId, eco);
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('🏦 Banco').setDescription(`${acc==='deposit'?'Depositado':'Retirado'} **$${amt}**\n💵 Efectivo: $${eco.coins.toLocaleString()}\n🏦 Banco: $${eco.bank.toLocaleString()}`).setFooter({text:'System 777 · Dev: 777'})]});
    } else if (sub === 'rich') {
      const all = db.getAll ? db.getAll('economy') : {};
      const sorted = Object.entries(all).sort(([,a],[,b])=>((b.coins||0)+(b.bank||0))-((a.coins||0)+(a.bank||0))).slice(0,10);
      const desc = sorted.length ? sorted.map(([id,v],i)=>`${['🥇','🥈','🥉'][i]||`**${i+1}.**`} <@${id}> — $${((v.coins||0)+(v.bank||0)).toLocaleString()}`).join('\n') : 'Nadie tiene dinero aún.';
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0xFEE75C).setTitle('🏆 Top Ricos').setDescription(desc).setFooter({text:'System 777 · Dev: 777'})]});
    } else if (sub === 'rob') {
      const target = interaction.options.getUser('usuario');
      if (target.id === userId) return interaction.reply({content:'❌ No te puedes robar a ti mismo.',flags:MessageFlags.Ephemeral});
      const tEco = db.get('economy', target.id, {coins:0,bank:0});
      if (tEco.coins < 50) return interaction.reply({content:'❌ Esa persona no tiene suficiente para robar.',flags:MessageFlags.Ephemeral});
      if (Math.random() < 0.5) {
        const stolen = Math.floor(Math.random()*Math.min(tEco.coins,200))+10;
        tEco.coins -= stolen; eco.coins += stolen;
        db.set('economy', target.id, tEco); db.set('economy', userId, eco);
        await interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('🦹 Rob').setDescription(`Robaste **$${stolen}** de **${target.tag}**!`).setFooter({text:'System 777 · Dev: 777'})]});
      } else {
        const fine = Math.floor(Math.random()*100)+20;
        eco.coins = Math.max(0, eco.coins - fine);
        db.set('economy', userId, eco);
        await interaction.reply({embeds:[new EmbedBuilder().setColor(0xFF4444).setTitle('🚔 Caught!').setDescription(`Te atraparon! Multa de **$${fine}**.`).setFooter({text:'System 777 · Dev: 777'})]});
      }
    } else if (sub === 'slots') {
      const bet = interaction.options.getInteger('apuesta');
      if (bet <= 0) return interaction.reply({content:'❌ Cantidad inválida.',flags:MessageFlags.Ephemeral});
      if (eco.coins < bet) return interaction.reply({content:`❌ Solo tienes $${eco.coins}.`,flags:MessageFlags.Ephemeral});
      const icons = ['🍒','🍋','🍊','🍇','💎','7️⃣'];
      const r = [0,1,2].map(()=>Math.floor(Math.random()*icons.length));
      const s = r.map(i=>icons[i]).join(' | ');
      let win = 0;
      if (r[0]===r[1]&&r[1]===r[2]) win = bet * (r[0]===5?10:r[0]===4?5:3);
      else if (r[0]===r[1]||r[1]===r[2]||r[0]===r[2]) win = Math.floor(bet*1.5);
      else win = -bet;
      eco.coins += win;
      db.set('economy', userId, eco);
      await interaction.reply({embeds:[new EmbedBuilder().setColor(win>0?0x57F287:0xFF4444).setTitle('🎰 Slots').setDescription(`**${s}**\n\n${win>0?`Ganaste **$${win}**!`:`Perdiste **$${Math.abs(win)}**.`}\nBalance: $${eco.coins.toLocaleString()}`).setFooter({text:'System 777 · Dev: 777'})]});
    }
  }
};
