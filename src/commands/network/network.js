const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const net  = require('net');
const tls  = require('tls');
const dns  = require('dns');
const https = require('https');
const http  = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const resolve4   = promisify(dns.resolve4);
const resolve6   = promisify(dns.resolve6);
const resolveMx  = promisify(dns.resolveMx);
const resolveNs  = promisify(dns.resolveNs);
const resolveTxt = promisify(dns.resolveTxt);
const dnsReverse = promisify(dns.reverse);

// ── helpers ────────────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 8000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('Bad JSON')); } });
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

function checkPort(host, port, timeout = 3000) {
  return new Promise(resolve => {
    const s = new net.Socket();
    s.setTimeout(timeout);
    s.connect(port, host, () => { s.destroy(); resolve(true); });
    s.on('error', () => { s.destroy(); resolve(false); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
  });
}

function checkSSL(hostname, port = 443) {
  return new Promise((resolve, reject) => {
    const s = tls.connect(port, hostname, { servername: hostname, rejectUnauthorized: false, timeout: 10000 }, () => {
      const cert = s.getPeerCertificate(true);
      s.destroy();
      if (!cert?.subject) return reject(new Error('No cert'));
      resolve({ subject: cert.subject?.CN || 'N/A', issuer: cert.issuer?.O || 'N/A', validFrom: cert.valid_from, validTo: cert.valid_to, authorized: s.authorized, authError: s.authorizationError, sans: cert.subjectaltname?.split(', ').slice(0, 5) || [], protocol: s.getProtocol() });
    });
    s.on('error', reject);
    s.on('timeout', () => { s.destroy(); reject(new Error('Timeout')); });
  });
}

const COMMON_PORTS = { 21:'FTP',22:'SSH',25:'SMTP',53:'DNS',80:'HTTP',443:'HTTPS',3000:'Node',3306:'MySQL',5432:'PostgreSQL',6379:'Redis',8080:'HTTP Alt',27017:'MongoDB' };

// ── module ─────────────────────────────────────────────────────────────────
module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('network')
    .setDescription('[OWNER] Herramientas de red y diagnóstico')
    .addSubcommand(s => s.setName('ping').setDescription('Ping a un host').addStringOption(o => o.setName('host').setDescription('Host o IP').setRequired(true)))
    .addSubcommand(s => s.setName('traceroute').setDescription('Traza ruta a un host').addStringOption(o => o.setName('host').setDescription('Host o IP').setRequired(true)).addIntegerOption(o => o.setName('maxhops').setMinValue(1).setMaxValue(30).setDescription('Max saltos (def: 15)')))
    .addSubcommand(s => s.setName('nslookup').setDescription('DNS lookup').addStringOption(o => o.setName('dominio').setDescription('Dominio o IP').setRequired(true)).addStringOption(o => o.setName('tipo').setDescription('Tipo registro').addChoices({name:'ALL',value:'all'},{name:'A',value:'A'},{name:'MX',value:'MX'},{name:'NS',value:'NS'},{name:'TXT',value:'TXT'})))
    .addSubcommand(s => s.setName('iplookup').setDescription('Info de una IP').addStringOption(o => o.setName('ip').setDescription('IP o dominio').setRequired(true)))
    .addSubcommand(s => s.setName('portscan').setDescription('Escanea puertos').addStringOption(o => o.setName('host').setDescription('Host o IP').setRequired(true)).addStringOption(o => o.setName('puertos').setDescription('Puertos por comas o "common"')))
    .addSubcommand(s => s.setName('webstatus').setDescription('Estado de sitios web').addStringOption(o => o.setName('urls').setDescription('URLs separadas por espacio (max 5)').setRequired(true)))
    .addSubcommand(s => s.setName('ssl').setDescription('Verifica certificado SSL').addStringOption(o => o.setName('dominio').setDescription('Dominio').setRequired(true)).addIntegerOption(o => o.setName('puerto').setMinValue(1).setMaxValue(65535).setDescription('Puerto (def: 443)')))
    .addSubcommand(s => s.setName('myip').setDescription('Muestra la IP pública real del VPS (router IP)')),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();

    // ── ping ──────────────────────────────────────────────────────────────
    if (sub === 'ping') {
      const host = interaction.options.getString('host').replace(/[;&|`$]/g,'').trim();
      if (!/^[a-zA-Z0-9.\-]+$/.test(host)) return interaction.editReply({ content: '❌ Host inválido.' });
      try {
        const { stdout } = await execAsync(`ping -c 4 -W 2 ${host} 2>&1`, { timeout: 15000, shell: '/bin/bash' });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00FF88).setTitle(`🏓 Ping → ${host}`).setDescription(`\`\`\`\n${stdout.slice(0,1500)}\n\`\`\``).setTimestamp()] });
      } catch (e) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setTitle(`❌ Ping fallido`).setDescription(`\`\`\`\n${e.stdout?.slice(0,500) || e.message.slice(0,300)}\n\`\`\``)] });
      }
    }

    // ── traceroute ────────────────────────────────────────────────────────
    if (sub === 'traceroute') {
      const host = interaction.options.getString('host').replace(/[;&|`$]/g,'').trim();
      const hops = interaction.options.getInteger('maxhops') || 15;
      if (!/^[a-zA-Z0-9.\-]+$/.test(host)) return interaction.editReply({ content: '❌ Host inválido.' });
      try {
        const { stdout } = await execAsync(`traceroute -m ${hops} -w 2 -q 1 ${host} 2>&1 | head -30`, { timeout: 45000, shell: '/bin/bash' });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x6366f1).setTitle(`🌐 Traceroute → ${host}`).setDescription(`\`\`\`\n${stdout.slice(0,1800)}\n\`\`\``).setTimestamp()] });
      } catch (e) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF4444).setTitle('❌ Traceroute fallido').setDescription(`\`${e.message.slice(0,200)}\``)] });
      }
    }

    // ── nslookup ──────────────────────────────────────────────────────────
    if (sub === 'nslookup') {
      const domain = interaction.options.getString('dominio').toLowerCase().trim();
      const tipo   = interaction.options.getString('tipo') || 'all';
      if (!/^[a-zA-Z0-9.\-]+$/.test(domain)) return interaction.editReply({ content: '❌ Dominio inválido.' });
      async function tryR(fn, ...args) { try { return await fn(...args); } catch { return null; } }
      const embed = new EmbedBuilder().setColor(0x6366f1).setTitle(`🔍 NSLookup — ${domain}`).setTimestamp();
      const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);
      if (isIP) {
        const ptr = await tryR(dnsReverse, domain);
        embed.addFields({ name: '🔄 PTR', value: ptr ? ptr.join('\n') : 'No encontrado' });
      } else {
        const tasks = [];
        if (tipo==='all'||tipo==='A')  tasks.push(tryR(resolve4,domain).then(r=>r&&embed.addFields({name:'📍 A',value:r.slice(0,5).join('\n'),inline:true})));
        if (tipo==='all'||tipo==='AAAA') tasks.push(tryR(resolve6,domain).then(r=>r&&embed.addFields({name:'📍 AAAA',value:r.slice(0,3).join('\n'),inline:true})));
        if (tipo==='all'||tipo==='MX')  tasks.push(tryR(resolveMx,domain).then(r=>r&&embed.addFields({name:'📧 MX',value:r.slice(0,5).map(m=>`${m.exchange}(${m.priority})`).join('\n'),inline:false})));
        if (tipo==='all'||tipo==='NS')  tasks.push(tryR(resolveNs,domain).then(r=>r&&embed.addFields({name:'🌐 NS',value:r.slice(0,5).join('\n'),inline:true})));
        if (tipo==='all'||tipo==='TXT') tasks.push(tryR(resolveTxt,domain).then(r=>r&&embed.addFields({name:'📄 TXT',value:r.slice(0,3).map(t=>t.join(' ')).join('\n').slice(0,400),inline:false})));
        await Promise.all(tasks);
      }
      if (!embed.data.fields?.length) embed.setDescription('Sin registros encontrados.');
      return interaction.editReply({ embeds: [embed] });
    }

    // ── iplookup ──────────────────────────────────────────────────────────
    if (sub === 'iplookup') {
      const input = interaction.options.getString('ip').trim();
      if (!/^[a-zA-Z0-9.\-:]+$/.test(input)) return interaction.editReply({ content: '❌ Input inválido.' });
      try {
        const d = await fetchJSON(`https://ipapi.co/${encodeURIComponent(input)}/json/`);
        if (d.error) return interaction.editReply({ content: `❌ ${d.reason || 'IP inválida'}` });
        const flag = d.country_code ? String.fromCodePoint(...[...d.country_code].map(c=>0x1F1E6+c.charCodeAt(0)-65)) : '';
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x6366f1).setTitle(`🌍 IP Lookup — ${d.ip}`)
          .addFields(
            { name:'📍 Ubicación', value:`${flag} ${d.city||'?'}, ${d.region||'?'}, ${d.country_name||'?'}`, inline:false },
            { name:'🌐 Red', value:`ASN: \`${d.asn||'N/A'}\`\nOrg: \`${d.org||'N/A'}\``, inline:true },
            { name:'📡 Info', value:`TZ: \`${d.timezone||'N/A'}\`\nPostal: \`${d.postal||'N/A'}\``, inline:true }
          ).setTimestamp()] });
      } catch (e) {
        return interaction.editReply({ content: `❌ ${e.message.slice(0,100)}` });
      }
    }

    // ── portscan ──────────────────────────────────────────────────────────
    if (sub === 'portscan') {
      const host  = interaction.options.getString('host').replace(/[;&|`$]/g,'').trim();
      const input = interaction.options.getString('puertos') || 'common';
      if (!/^[a-zA-Z0-9.\-]+$/.test(host)) return interaction.editReply({ content: '❌ Host inválido.' });
      const ports = input === 'common'
        ? Object.keys(COMMON_PORTS).map(Number)
        : input.split(',').map(p=>parseInt(p.trim())).filter(p=>p>0&&p<=65535).slice(0,50);
      if (!ports.length) return interaction.editReply({ content: '❌ Puertos inválidos.' });
      await interaction.editReply({ content: `🔍 Escaneando ${ports.length} puertos en \`${host}\`...` });
      const results = await Promise.all(ports.map(p=>checkPort(host,p).then(open=>({port:p,open}))));
      const open = results.filter(r=>r.open);
      const closed = results.filter(r=>!r.open);
      const embed = new EmbedBuilder().setColor(open.length?0x00FF88:0x888888).setTitle(`🔍 Port Scan — ${host}`)
        .addFields(
          { name:`✅ Abiertos (${open.length})`, value:open.map(r=>`\`${r.port}\` ${COMMON_PORTS[r.port]||''}`).join('\n')||'Ninguno', inline:true },
          { name:`❌ Cerrados (${closed.length})`, value:closed.slice(0,10).map(r=>`\`${r.port}\` ${COMMON_PORTS[r.port]||''}`).join('\n')||'Ninguno', inline:true }
        ).setTimestamp();
      return interaction.editReply({ content:null, embeds:[embed] });
    }

    // ── webstatus ─────────────────────────────────────────────────────────
    if (sub === 'webstatus') {
      const urls = interaction.options.getString('urls').split(/\s+/).slice(0,5).map(u=>u.startsWith('http')?u:`https://${u}`);
      function chkWeb(url) {
        return new Promise(resolve => {
          const start = Date.now(); const proto = url.startsWith('https')?https:http;
          const req = proto.get(url,{timeout:10000},res=>{const l=Date.now()-start;res.destroy();resolve({url,status:res.statusCode,latency:l,server:res.headers?.server||'N/A'});});
          req.on('error',e=>resolve({url,status:0,error:e.message,latency:Date.now()-start}));
          req.on('timeout',()=>{req.destroy();resolve({url,status:0,error:'Timeout',latency:10000});});
        });
      }
      const results = await Promise.all(urls.map(chkWeb));
      const embed = new EmbedBuilder().setColor(results.every(r=>r.status>=200&&r.status<300)?0x00FF88:0xFF9900).setTitle(`🌐 Web Status`).setTimestamp();
      for (const r of results) {
        const domain = (() => { try { return new URL(r.url).hostname; } catch { return r.url; } })();
        const icon = r.error?'🔴':r.status<300?'🟢':r.status<400?'🟡':'🔴';
        embed.addFields({ name:domain, value:`${icon} **${r.status||r.error?.slice(0,30)}** · ${r.latency}ms · \`${r.server?.slice(0,30)}\``, inline:true });
      }
      return interaction.editReply({ embeds:[embed] });
    }

    // ── myip ──────────────────────────────────────────────────────────────
    if (sub === 'myip') {
      try {
        // Fetch public IP from multiple sources in parallel for reliability
        const [ipv4, ipv6, geoRaw] = await Promise.allSettled([
          new Promise((res, rej) => {
            https.get('https://api.ipify.org?format=json', { timeout: 8000 }, r => {
              let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d).ip); } catch { rej(); } });
            }).on('error', rej).on('timeout', rej);
          }),
          new Promise((res, rej) => {
            https.get('https://api6.ipify.org?format=json', { timeout: 8000 }, r => {
              let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d).ip); } catch { rej(); } });
            }).on('error', rej).on('timeout', rej);
          }),
          new Promise((res, rej) => {
            https.get('https://ipinfo.io/json', { timeout: 8000 }, r => {
              let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch { rej(); } });
            }).on('error', rej).on('timeout', rej);
          }),
        ]);

        const pub4 = ipv4.status === 'fulfilled' ? ipv4.value : null;
        const pub6 = ipv6.status === 'fulfilled' ? ipv6.value : null;
        const geo  = geoRaw.status === 'fulfilled' ? geoRaw.value : {};

        // Also get network interfaces from OS
        let ifaces = 'N/A';
        try {
          const { stdout } = await execAsync("ip addr show | grep 'inet ' | awk '{print $2, $NF}' | head -10", { timeout: 5000, shell: '/bin/bash' });
          ifaces = stdout.trim() || 'N/A';
        } catch {}

        const mainIp = pub4 || geo.ip || 'No detectada';
        const embed  = new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('🌐 IP Pública del VPS — System 777')
          .addFields(
            { name: '📡 IPv4 Pública (Router IP)', value: `\`${pub4 || 'No detectada'}\``,             inline: false },
            { name: '📡 IPv6 Pública',             value: `\`${pub6 || 'No disponible'}\``,            inline: false },
            { name: '🌍 Ubicación',                value: `${geo.city || '?'}, ${geo.region || '?'}, ${geo.country || '?'}`, inline: true },
            { name: '📶 ISP / AS',                 value: geo.org || 'N/A',                             inline: true },
            { name: '🖧 Interfaces de red',        value: `\`\`\`\n${ifaces.slice(0, 300)}\n\`\`\``,   inline: false },
          )
          .setFooter({ text: 'System 777 · Solo para el Owner · VPS Public IP' })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (e) {
        return interaction.editReply({ content: `❌ Error obteniendo IP: ${e.message.slice(0, 100)}` });
      }
    }

    // ── ssl ───────────────────────────────────────────────────────────────
    if (sub === 'ssl') {
      const domain = interaction.options.getString('dominio').toLowerCase().trim().replace(/^https?:\/\//,'').split('/')[0];
      const port   = interaction.options.getInteger('puerto') || 443;
      if (!/^[a-zA-Z0-9.\-]+$/.test(domain)) return interaction.editReply({ content: '❌ Dominio inválido.' });
      try {
        const ssl = await checkSSL(domain, port);
        const validTo = new Date(ssl.validTo); const now = new Date();
        const days = Math.floor((validTo-now)/(1000*60*60*24));
        const color = days<0?0xFF4444:days<=30?0xFF9900:0x00FF88;
        const icon  = days<0?'🔴':days<=30?'🟡':'🟢';
        return interaction.editReply({ embeds:[new EmbedBuilder().setColor(color).setTitle(`🔒 SSL — ${domain}:${port}`)
          .addFields(
            { name:'📜 Cert', value:`Subject: \`${ssl.subject}\`\nIssuer: \`${ssl.issuer}\`\nProtocol: \`${ssl.protocol}\``, inline:false },
            { name:'📅 Validez', value:`${icon} **${days<0?'EXPIRADO':`${days} días`}**\nHasta: \`${ssl.validTo}\``, inline:true },
            { name:'✅ Estado', value:ssl.authorized?'✅ Válido':`⚠️ ${ssl.authError||'Untrusted'}`, inline:true },
            { name:'🌐 SANs', value:ssl.sans.slice(0,5).join('\n')||'N/A', inline:false }
          ).setTimestamp()] });
      } catch (e) {
        return interaction.editReply({ embeds:[new EmbedBuilder().setColor(0xFF4444).setTitle('❌ SSL fallido').setDescription(`\`${e.message.slice(0,200)}\``)] });
      }
    }
  }
};
