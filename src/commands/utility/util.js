const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('util')
    .setDescription('🔧 Utilidades del bot')
    .addSubcommand(s => s.setName('avatar').setDescription('Ver avatar de un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario')))
    .addSubcommand(s => s.setName('userinfo').setDescription('Info de un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario')))
    .addSubcommand(s => s.setName('serverinfo').setDescription('Info del servidor'))
    .addSubcommand(s => s.setName('botinfo').setDescription('Info del bot'))
    .addSubcommand(s => s.setName('ping').setDescription('Latencia del bot'))
    .addSubcommand(s => s.setName('calc').setDescription('Calculadora').addStringOption(o => o.setName('expresion').setDescription('Ej: 25 * 4').setRequired(true)))
    .addSubcommand(s => s.setName('password').setDescription('Genera contraseña').addIntegerOption(o => o.setName('longitud').setDescription('Longitud (8-64)').setMinValue(8).setMaxValue(64)))
    .addSubcommand(s => s.setName('remind').setDescription('Recordatorio').addStringOption(o => o.setName('tiempo').setDescription('Ej: 10m, 1h, 1d').setRequired(true)).addStringOption(o => o.setName('mensaje').setDescription('Mensaje').setRequired(true)))
    .addSubcommand(s => s.setName('afk').setDescription('Modo AFK').addStringOption(o => o.setName('razon').setDescription('Razón')))
    .addSubcommand(s => s.setName('stats').setDescription('Estadísticas de un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario')))
    .addSubcommand(s => s.setName('rolelist').setDescription('Lista de roles del servidor'))
    .addSubcommand(s => s.setName('invite').setDescription('Link de invitación del bot'))
    .addSubcommand(s => s.setName('snipe').setDescription('Mensaje eliminado reciente'))
    .addSubcommand(s => s.setName('weather').setDescription('Clima de una ciudad').addStringOption(o => o.setName('ciudad').setDescription('Ciudad').setRequired(true)))
    .addSubcommand(s => s.setName('translate').setDescription('Traducir texto').addStringOption(o => o.setName('texto').setDescription('Texto').setRequired(true)).addStringOption(o => o.setName('idioma').setDescription('Idioma destino (default: en)')))
    .addSubcommand(s => s.setName('suggest').setDescription('Enviar sugerencia').addStringOption(o => o.setName('sugerencia').setDescription('Tu sugerencia').setRequired(true)))
    .addSubcommand(s => s.setName('starboard').setDescription('Ver mensajes destacados'))
    .addSubcommand(s => s.setName('welcome').setDescription('Config bienvenida').addStringOption(o => o.setName('canal').setDescription('Canal'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const client = interaction.client;

    if (sub === 'avatar') {
      const user = interaction.options.getUser('usuario') || interaction.user;
      const embed = new EmbedBuilder().setColor(0x5865F2).setTitle(`🖼️ Avatar de ${user.tag}`)
        .setImage(user.displayAvatarURL({ size: 512, dynamic: true }))
        .setFooter({text:'System 777 · Dev: 777'});
      await interaction.reply({embeds:[embed]});

    } else if (sub === 'userinfo') {
      const user = interaction.options.getUser('usuario') || interaction.user;
      const member = interaction.guild?.members?.cache.get(user.id);
      const embed = new EmbedBuilder().setColor(0x5865F2).setTitle(`👤 ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({dynamic:true}))
        .addFields(
          {name:'ID',value:user.id,inline:true},
          {name:'Creado',value:`<t:${Math.floor(user.createdTimestamp/1000)}:R>`,inline:true},
          {name:'Se unió',value:member?`<t:${Math.floor(member.joinedTimestamp/1000)}:R>`:'N/A',inline:true},
          {name:'Roles',value:member?member.roles.cache.map(r=>r.toString()).slice(0,15).join(', ')||'Ninguno':'N/A',inline:false}
        ).setFooter({text:'System 777 · Dev: 777'});
      await interaction.reply({embeds:[embed]});

    } else if (sub === 'serverinfo') {
      const g = interaction.guild;
      const embed = new EmbedBuilder().setColor(0x5865F2).setTitle(`🏠 ${g.name}`)
        .setThumbnail(g.iconURL({dynamic:true}))
        .addFields(
          {name:'Miembros',value:`${g.memberCount}`,inline:true},
          {name:'Canales',value:`${g.channels.cache.size}`,inline:true},
          {name:'Roles',value:`${g.roles.cache.size}`,inline:true},
          {name:'Emojis',value:`${g.emojis.cache.size}`,inline:true},
          {name:'Creado',value:`<t:${Math.floor(g.createdTimestamp/1000)}:R>`,inline:true},
          {name:'Owner',value:`<@${g.ownerId}>`,inline:true}
        ).setFooter({text:'System 777 · Dev: 777'});
      await interaction.reply({embeds:[embed]});

    } else if (sub === 'botinfo') {
      const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('🤖 System 777 Bot')
        .addFields(
          {name:'Servidores',value:`${client.guilds.cache.size}`,inline:true},
          {name:'Usuarios',value:`${client.guilds.cache.reduce((a,g)=>a+g.memberCount,0)}`,inline:true},
          {name:'Comandos',value:`${client.commands?.size||0}`,inline:true},
          {name:'Uptime',value:`${Math.floor(client.uptime/1000/60)}m`,inline:true},
          {name:'Ping',value:`${client.ws.ping}ms`,inline:true},
          {name:'Node',value:process.version,inline:true}
        ).setFooter({text:'System 777 · Dev: 777'});
      await interaction.reply({embeds:[embed]});

    } else if (sub === 'ping') {
      const sent = await interaction.reply({content:'🏓 Pinging...',fetchReply:true});
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      await sent.edit({content:`🏓 **Pong!**\nLatencia: **${latency}ms** · API: **${client.ws.ping}ms**`});

    } else if (sub === 'calc') {
      const expr = interaction.options.getString('expresion');
      if (!/^[\d\s\+\-\*\/\(\)\.\%\^]+$/.test(expr)) {
        return interaction.reply({content:'❌ Expresión inválida.',flags:MessageFlags.Ephemeral});
      }
      let resultado;
      try { resultado = Function(`"use strict"; return (${expr.replace(/\^/g,'**')})`)(); }
      catch { return interaction.reply({content:'❌ Error en la expresión.',flags:MessageFlags.Ephemeral}); }
      if (!isFinite(resultado)) return interaction.reply({content:'❌ Resultado no válido.',flags:MessageFlags.Ephemeral});
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0x00FF88).setTitle('🧮 Calculadora').addFields({name:'Expresión',value:`\`${expr}\``,inline:true},{name:'Resultado',value:`\`${resultado.toLocaleString()}\``,inline:true}).setFooter({text:'System 777 · Dev: 777'})]});

    } else if (sub === 'password') {
      const len = interaction.options.getInteger('longitud') ?? 16;
      const crypto = require('crypto');
      const pass = crypto.randomBytes(len).toString('base64url').slice(0,len);
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0x00FF88).setTitle('🔑 Contraseña').setDescription(`\`${pass}\``).addFields({name:'Longitud',value:`${len} chars`,inline:true}).setFooter({text:'System 777 · Dev: 777'})],flags:MessageFlags.Ephemeral});

    } else if (sub === 'remind') {
      const time = interaction.options.getString('tiempo');
      const msg = interaction.options.getString('mensaje');
      const match = time.match(/^(\d+)(m|h|d)$/);
      if (!match) return interaction.reply({content:'❌ Formato: `10m`, `1h`, `1d`',flags:MessageFlags.Ephemeral});
      const ms = {m:60000,h:3600000,d:86400000}[match[2]] * parseInt(match[1]);
      await interaction.reply({content:`✅ Te recordaré en **${time}**: ${msg}`});
      setTimeout(async () => {
        try { await interaction.user.send(`⏰ **Recordatorio:** ${msg}`); } catch {}
      }, ms);

    } else if (sub === 'afk') {
      const razon = interaction.options.getString('razon') || 'AFK';
      db.set('afk', interaction.user.id, { reason: razon, ts: Date.now() });
      await interaction.reply({content:`✅ Modo AFK activado: **${razon}**`});

    } else if (sub === 'stats') {
      const user = interaction.options.getUser('usuario') || interaction.user;
      const eco = db.get('economy', user.id, {coins:0,bank:0});
      const lvl = db.get('levels', user.id, {xp:0,level:1});
      const warns = db.get('warns', user.id, []);
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle(`📊 Stats de ${user.tag}`).setThumbnail(user.displayAvatarURL({dynamic:true})).addFields(
        {name:'💰 Economía',value:`Efectivo: $${eco.coins}\nBanco: $${eco.bank}`,inline:true},
        {name:'⭐ Niveles',value:`Nivel: ${lvl.level}\nXP: ${lvl.xp}`,inline:true},
        {name:'⚠️ Warns',value:`${Array.isArray(warns)?warns.length:0}`,inline:true}
      ).setFooter({text:'System 777 · Dev: 777'})]});

    } else if (sub === 'rolelist') {
      const roles = interaction.guild.roles.cache.sort((a,b)=>b.position-a.position).map(r=>`${r} (${r.members.size})`).slice(0,30);
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('📋 Roles').setDescription(roles.join('\n')).setFooter({text:'System 777 · Dev: 777'})]});

    } else if (sub === 'invite') {
      const BOT_CLIENT_ID = process.env.CLIENT_ID || '1502804306125132057';
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('🔗 Invitar Bot').setDescription(`[Click aquí para invitar](https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=applications.commands+bot)`).setFooter({text:'System 777 · Dev: 777'})]});

    } else if (sub === 'snipe') {
      const sniped = db.get('snipe', interaction.channel?.id, null);
      if (!sniped) return interaction.reply({content:'❌ No hay mensajes eliminados recientes.',flags:MessageFlags.Ephemeral});
      await interaction.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle('👻 Snipe').setDescription(`**${sniped.author}**: ${sniped.content}`).setFooter({text:'System 777 · Dev: 777'})]});

    } else if (sub === 'weather') {
      const city = interaction.options.getString('ciudad');
      await interaction.reply({content:`🌤️ Clima de **${city}**: Disponible pronto (necesita API key).`});

    } else if (sub === 'translate') {
      const text = interaction.options.getString('texto');
      const lang = interaction.options.getString('idioma') || 'en';
      await interaction.reply({content:`🌍 Traducción a **${lang}**: Próximamente (necesita API).`});

    } else if (sub === 'suggest') {
      const sug = interaction.options.getString('sugerencia');
      const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('💡 Sugerencia').setDescription(sug).addFields({name:'De',value:interaction.user.tag,inline:true}).setFooter({text:'System 777 · Dev: 777'});
      await interaction.reply({embeds:[embed]});

    } else if (sub === 'starboard') {
      await interaction.reply({content:'⭐ Starboard: Los mensajes con suficientes reacciones aparecerán aquí.'});

    } else if (sub === 'welcome') {
      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({content:'❌ Necesitas permisos de administrador.',flags:MessageFlags.Ephemeral});
      }
      await interaction.reply({content:'✅ Configuración de bienvenida actualizada.'});
    }
  }
};
