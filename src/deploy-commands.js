require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { readdirSync }  = require('fs');
const path = require('path');

const commands = [];
const cmdPath  = path.join(__dirname, 'commands');

for (const cat of readdirSync(cmdPath)) {
  for (const file of readdirSync(path.join(cmdPath, cat)).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(cmdPath, cat, file));
    if (cmd.data) commands.push(cmd.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`Registrando ${commands.length} comandos slash...`);
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Comandos registrados globalmente. (puede tardar hasta 1h en aparecer en Discord)');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
