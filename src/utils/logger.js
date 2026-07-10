const chalk = require('chalk');
const fs    = require('fs');
const path  = require('path');
const db    = require('./db');

const LEVELS = {
  INFO:    { label: 'INFO',  color: chalk.cyan,         icon: '◉' },
  WARN:    { label: 'WARN',  color: chalk.yellow,        icon: '⚠' },
  ERROR:   { label: 'ERROR', color: chalk.red,           icon: '✖' },
  SUCCESS: { label: 'OK',    color: chalk.green,         icon: '✔' },
  BOT:     { label: 'BOT',   color: chalk.magenta,       icon: '🤖' },
  RAID:    { label: 'RAID',  color: chalk.bgRed.white,   icon: '🚨' },
};

const LOGS_DIR = path.join(__dirname, '../../logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

function rotateIfBig(filePath) {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 5 * 1024 * 1024) {
      fs.renameSync(filePath, filePath + '.old');
    }
  } catch {}
}

function writeFile(level, message) {
  const ts   = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}\n`;
  const file = level === 'ERROR'
    ? path.join(LOGS_DIR, 'error.log')
    : path.join(LOGS_DIR, 'out.log');
  rotateIfBig(file);
  try { fs.appendFileSync(file, line, 'utf8'); } catch {}
}

function ts() {
  return new Date().toLocaleTimeString('es-DO', { hour12: false });
}

function log(level, message, meta = {}) {
  const L    = LEVELS[level] || LEVELS.INFO;
  const line = `${chalk.gray(ts())} ${L.color(`[${L.label}]`)} ${L.icon}  ${message}`;
  console.log(line);

  writeFile(level, message);

  const entry = { ts: Date.now(), level, message, ...meta };
  const logs  = db.get('logs', 'entries', []);
  logs.unshift(entry);
  if (logs.length > 500) logs.length = 500;
  db.set('logs', 'entries', logs);
}

const logger = {
  info:    (msg, m) => log('INFO',    msg, m),
  warn:    (msg, m) => log('WARN',    msg, m),
  error:   (msg, m) => log('ERROR',   msg, m),
  success: (msg, m) => log('SUCCESS', msg, m),
  bot:     (msg, m) => log('BOT',     msg, m),
  raid:    (msg, m) => log('RAID',    msg, m),

  async dmOwner(client, message, embed = null) {
    try {
      const owner = await client.users.fetch(process.env.OWNER_ID);
      const opts  = embed ? { embeds: [embed] } : { content: message };
      await owner.send(opts);
    } catch (e) {
      log('WARN', `No se pudo enviar DM al owner: ${e.message}`);
    }
  },
};

module.exports = logger;
