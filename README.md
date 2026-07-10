System 777 — Discord Bot
Bot de Discord profesional con moderación, economía, niveles, música, tickets y más.

Dev: 777 · IG/TikTok: @yzz.yzx


Características


Instalación
Requisitos
Node.js v18+
FFmpeg (para música)
PM2 (para producción)
Pasos
git clone https://github.com/nenito1345-commits/system-777.git

cd system-777

npm install

Crea .env basado en .env.example:

cp .env.example .env

Rellena los valores en .env y despliega los comandos:

node src/deploy-commands.js

npm start
Con PM2 (recomendado)
pm2 start ecosystem.config.js

pm2 save

pm2 startup


Dashboard Web
El dashboard está disponible en http://localhost:3000 después de iniciar el bot.

Para acceso desde el móvil (misma red WiFi): http://IP_LOCAL:3000

La IP local se muestra en el log de inicio del bot.


Configurar Tickets
/ticket setup  panel-canal: #soporte  rol-soporte: @Staff  log-canal: #ticket-logs

/ticket categoria  id: soporte  nombre: Soporte General  emoji: 🛠️  descripcion: Problemas generales

/ticket categoria  id: reportes  nombre: Reportar Usuario  emoji: ⚠️  descripcion: Reportar conducta

/ticket config  opcion: max-tickets  valor: 2

/ticket config  opcion: ping  valor: true


Variables de entorno (.env)
BOT_TOKEN=tu_token_aqui

CLIENT_ID=tu_client_id

GUILD_ID=tu_guild_id_para_pruebas

OWNER_ID=tu_discord_id

DASHBOARD_PORT=3000

DASHBOARD_SECRET=tu_contraseña_dashboard

ANTHROPIC_API_KEY=tu_api_key_claude


Licencia
Privado — Dev: 777 · IG: @yzz.yzx

Categoría
Comandos
🔨 Moderación
ban, kick, warn, clear, timeout, mute, tempban, announce, modnotes
🛡️ Protección
anti-raid, anti-nuke, automod, whitelist, logs por categoría
💰 Economía
balance, daily, work, pay, bank, slots, roulette, blackjack
📊 Niveles
rank, leaderboard, give XP
🎵 Música
play, queue, skip, pause, volume, loop, shuffle
🎫 Tickets
panel con select menu, categorías, transcript HTML, claim, reabrir
🎉 Sorteos
giveaway con botones, reroll, múltiples ganadores
🎮 Juegos
blackjack, ruleta, tres en raya, trivia
ℹ️ Utilidad
welcome, starboard, sugerencias, autorole, stats channels, botton roles
👑 Owner
eval, spy, broadcast, globalban, givexp, givecoins