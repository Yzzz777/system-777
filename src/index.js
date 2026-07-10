require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { readdirSync } = require('fs');
const path   = require('path');
const logger = require('./utils/logger');
const { verifyIntegrity } = require('./utils/integrity');

// ── COMPROBACIÓN DE INTEGRIDAD ────────────────────────────────
{
  const result = verifyIntegrity();
  if (result.firstRun) {
    logger.success(`[INTEGRITY] Primera ejecución — ${result.files} archivos protegidos.`);
  } else if (!result.ok) {
    logger.error('');
    logger.error('╔══════════════════════════════════════════════════════╗');
    logger.error('║         ⚠️  INTEGRIDAD COMPROMETIDA ⚠️               ║');
    logger.error('╠══════════════════════════════════════════════════════╣');
    logger.error(`║  Razón: ${result.reason.padEnd(44)}║`);
    for (const f of result.files) {
      logger.error(`║  • ${f.substring(0, 48).padEnd(48)}║`);
    }
    logger.error('╠══════════════════════════════════════════════════════╣');
    logger.error('║  Para restaurar: node src/utils/integrity.js --update║');
    logger.error('╚══════════════════════════════════════════════════════╝');
    logger.error('');
    process.exit(1);
  } else {
    logger.success('[INTEGRITY] ✅ Archivos verificados, sin modificaciones.');
  }
}

// ── CLIENTE ──────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,          // Privileged — enable in dev portal
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,        // Privileged — enable in dev portal
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions, // Para starboard
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User, Partials.Reaction],
});

client.commands = new Collection();

// ── DISCORD PLAYER (música) ───────────────────────────────────
client.player = new Player(client, {
  skipFFmpeg: false,
  useLegacyFFmpeg: false,
});

client.player.events.on('playerStart', (queue, track) => {
  const ch = queue.metadata?.channel;
  if (ch) ch.send({
    content: `🎵 Ahora reproduciendo: **${track.title}** — \`${track.duration}\``
  }).catch(() => {});
});

client.player.events.on('emptyQueue', (queue) => {
  const ch = queue.metadata?.channel;
  if (ch) ch.send('✅ Cola terminada. ¡Hasta la próxima!').catch(() => {});
});

client.player.events.on('error', (queue, err) => {
  logger.error(`Player error: ${err.message}`);
});

// ── CARGAR COMANDOS ───────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
const categories   = readdirSync(commandsPath);
let cmdCount = 0;
for (const cat of categories) {
  const files = readdirSync(path.join(commandsPath, cat)).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const cmd = require(path.join(commandsPath, cat, file));
    if (!cmd.data?.name) continue;
    client.commands.set(cmd.data.name, cmd);
    cmdCount++;
  }
}
logger.info(`${cmdCount} comandos cargados.`);

// ── CARGAR EVENTOS ────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  const handler = (...args) => event.execute(...args, client);
  if (event.once) {
    client.once(event.name, handler);
  } else {
    client.on(event.name, handler);
  }
}
logger.info(`${eventFiles.length} eventos registrados.`);

// ── MANEJO DE ERRORES & ANTI-CRASH ───────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error(`UnhandledRejection: ${reason?.message || reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`UncaughtException: ${err?.message}`);
  logger.error(err.stack || '');
  // Errores de red no son críticos
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|EPIPE/.test(err.message)) {
    logger.warn('Error de red — continuando...');
    return;
  }
  logger.error('Error crítico — reiniciando en 5s...');
  setTimeout(() => process.exit(1), 5000);
});

// ── SEÑALES DE SISTEMA ────────────────────────────────────────
async function gracefulShutdown(signal) {
  logger.warn(`${signal} recibido — apagando gracefully...`);
  try {
    const OWNER_ID = process.env.OWNER_ID;
    if (OWNER_ID) {
      const owner = await client.users.fetch(OWNER_ID).catch(() => null);
      if (owner) {
        const { EmbedBuilder } = require('discord.js');
        await owner.send({
          embeds: [new EmbedBuilder()
            .setColor(0xFF4444)
            .setTitle('🔴 Bot Reiniciado / Apagado')
            .setDescription(`**System 777** se ha ${signal === 'SIGTERM' ? 'reiniciado' : 'apagado'}.\n\n> Señal: \`${signal}\`\n> Hora: <t:${Math.floor(Date.now()/1000)}:T>\n\nVolverá a estar online en unos segundos.`)
            .setFooter({ text: 'System 777 · Dev: 777' })
            .setTimestamp()]
        }).catch(() => {});
      }
    }
  } catch {}
  await client.destroy();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── EVENTOS DE CLIENTE DISCORD ───────────────────────────────
client.on('error', err => logger.error(`Client Error: ${err.message}`));
client.on('warn',  msg => logger.warn(`Client Warning: ${msg}`));
client.on('shardDisconnect', (e, id) => logger.warn(`Shard ${id} desconectado (${e.code})`));
client.on('shardReconnecting', id  => logger.info(`Shard ${id} reconectando...`));
client.on('shardResume', (id, n)   => logger.success(`Shard ${id} reconectado — ${n} eventos reproducidos`));

// Monitor de memoria cada 30 min
setInterval(() => {
  const mb = (b) => (b / 1024 / 1024).toFixed(1);
  const used = process.memoryUsage().heapUsed;
  if (parseFloat(mb(used)) > 400) {
    logger.warn(`Memoria alta: ${mb(used)} MB`);
  }
}, 30 * 60 * 1000);

// ── DASHBOARD WEB ─────────────────────────────────────────────
try {
  require('../dashboard/server')(client);
  logger.info(`Dashboard → http://localhost:${process.env.DASHBOARD_PORT || 3000}`);
} catch (e) {
  logger.warn(`Dashboard no pudo iniciarse: ${e.message}`);
}

// ── NOTIFICACIONES DE STREAMERS ──────────────────────────────
try {
  const notifications = require('./systems/notifications');
  client.once('ready', () => {
    notifications.startChecker(client);
    logger.success('Notificaciones de streamers activadas (YouTube/Kick/TikTok)');
  });
} catch (e) {
  logger.warn(`Notificaciones no pudieron iniciarse: ${e.message}`);
}


// ── CARGAR EXTRACTORES DE MÚSICA ──────────────────────────────
(async () => {
  try {
    // loadDefault returns [context, extractor] — ignore verbose output
    const result = await client.player.extractors.loadDefault();
    const loaded = client.player.extractors.store.size;
    logger.success(`Extractores de música cargados: ${loaded} disponibles`);
  } catch (e) {
    logger.warn(`Extractores: ${e.message}`);
  }
})();

// ── LOGIN ─────────────────────────────────────────────────────
if (!process.env.BOT_TOKEN) {
  logger.error('BOT_TOKEN no está definido en el archivo .env');
  process.exit(1);
}

client.login(process.env.BOT_TOKEN);
