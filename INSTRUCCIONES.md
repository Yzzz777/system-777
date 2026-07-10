⚡ Sisten 777 — Instrucciones de Activación
🔧 PASO 1 — Crear el bot en Discord
Ve a → https://discord.com/developers/applications
"New Application" → nombre: Sisten 777
Pestaña Bot → "Add Bot"
Activa los 3 Privileged Gateway Intents:
✅ PRESENCE INTENT
✅ SERVER MEMBERS INTENT
✅ MESSAGE CONTENT INTENT
Copia el Token (Bot → Reset Token)
🆔 PASO 2 — Conseguir tus IDs
Tu User ID: Discord → Ajustes → Avanzado → Modo desarrollador ON → clic derecho en tu nombre → Copiar ID
Client ID / Application ID: Developer Portal → General Information → Application ID
📝 PASO 3 — Rellenar el .env
Abre el archivo .env y ponlo así:

BOT_TOKEN=aqui_va_el_token_del_bot

OWNER_ID=aqui_va_tu_user_id

CLIENT_ID=aqui_va_el_application_id

DASHBOARD_SECRET=cualquier_contraseña_larga_123

RAID_JOIN_THRESHOLD=10

RAID_JOIN_WINDOW_MS=10000

MIN_ACCOUNT_AGE_DAYS=7

DASHBOARD_PORT=3000
🚀 PASO 4 — Instalar y arrancar
Abre PowerShell en esta carpeta y ejecuta:

# Solo la primera vez:

npm install

# Registrar los comandos slash (solo una vez):

node src/deploy-commands.js

# Arrancar el bot:

npm start
🔗 PASO 5 — Invitar el bot a tu servidor
En Discord Developer Portal:

OAuth2 → URL Generator
Scopes: ✅ bot + ✅ applications.commands
Bot Permissions: ✅ Administrator
Copia el link e invite el bot
🌐 Dashboard Web (Panel de Control)
Con el bot corriendo, abre en tu navegador: 👉 http://localhost:3000

Usa la contraseña que pusiste en DASHBOARD_SECRET
24/7 — Mantener el bot corriendo siempre
Instala PM2 y úsalo para que se reinicie solo:

npm install -g pm2

pm2 start ecosystem.config.js

pm2 save

pm2 startup


📋 Todos los comandos
🎵 Música
🔨 Moderación
🛡️ Protección
ℹ️ Utilidad
🎮 Diversión
👑 Solo Dueño (tú)

Comando
Función
/play [cancion]
Reproduce una canción/playlist
/music skip
Salta la canción
/music stop
Para la música
/music pause
Pausa
/music resume
Reanuda
/music volume [1-100]
Volumen
/music loop [modo]
Repetición
/music shuffle
Mezclar cola
/music nowplaying
Canción actual
/queue
Ver cola
Comando
Función
/ban [usuario]
Banear
/unban [id]
Desbanear
/kick [usuario]
Expulsar
/softban [usuario]
Ban + desban (limpiar mensajes)
/timeout [usuario] [tiempo]
Silenciar temporalmente
/warn add/list/clear
Advertencias
/clear [cantidad]
Borrar mensajes
/slowmode [segundos]
Modo lento
/nuke
Recrear canal limpio
Comando
Función
/antiraid setup
Configurar anti-raid
/antiraid status
Ver configuración
/antiraid lockdown
Lockdown manual
/whitelist add/remove/list
Whitelist / Blacklist
/automod setup
AutoMod de Discord
Comando
Función
/userinfo [usuario]
Info de usuario
/serverinfo
Info del servidor
/avatar [usuario]
Ver avatar
/ping
Latencia del bot
/help
Lista de comandos
Comando
Función
/coinflip
Lanzar moneda
/8ball [pregunta]
Bola mágica
/rps
Piedra papel tijeras
/say [mensaje]
Hacer hablar al bot
Comando
Función
/status
Estado completo del bot
/servers
Ver todos los servidores
/globalban add/remove/list
Ban en todos los servers
/broadcast [mensaje]
Mensaje a todos los servers