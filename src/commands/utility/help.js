const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const categories = [
  { name: '🛡️ Moderación', cmds: ['ban','kick','warn','timeout','clear','nuke','lock','unlock','slowmode','tempban','softban','cases','announce','role','modlogs','modnote','unban'] },
  { name: '🔒 Protección', cmds: ['antiraid','antinuke','automod','whitelist','logs'] },
  { name: '🎵 Música', cmds: ['play','queue','controls'] },
  { name: '💰 Economía', cmds: ['eco'] },
  { name: '⭐ Niveles', cmds: ['levels'] },
  { name: '🎮 Diversión', cmds: ['trivia','8ball','meme','ship','coinflip','dice','rps','blackjack','roulette','hack','poll','tictactoe','truth','dare','say','pat','slap','hug','kiss','marry','divorce','love','roast','compliment','rate','ascii','urban','hangman','wordle','riddles','connect4'] },
  { name: '💬 Social', cmds: ['profile'] },
  { name: '🔧 Utilidad', cmds: ['util'] },
  { name: '🌐 Network', cmds: ['network'] },
  { name: '🎫 Tickets', cmds: ['ticket'] },
  { name: '🎉 Sorteos', cmds: ['giveaway'] },
  { name: '👑 Owner', cmds: ['globalban','servers','broadcast','eval','shell','status','admin','analytics','backup','blacklist','debug','givecoins','givexp','premiummgr','reload','serverblacklist','spy','vps','maintenance'] },
];

function mainEmbed(botUser) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 Lista de Comandos — System 777')
    .setDescription('Usa los botones para navegar por categorías.\nEscribe `/<comando>` para usar.')
    .setThumbnail(botUser?.displayAvatarURL({ dynamic: true }))
    .addFields(categories.map(c => ({ name: c.name, value: c.cmds.map(c => `\`/${c}\``).join(', '), inline: false })))
    .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });
}

function buildRows() {
  const chunks = [];
  for (let i = 0; i < categories.length; i += 5) {
    const row = new ActionRowBuilder().addComponents(
      categories.slice(i, i + 5).map(c =>
        new ButtonBuilder()
          .setCustomId(`help_${c.name.replace(/[^a-zA-Z]/g, '').toLowerCase()}`)
          .setLabel(c.name)
          .setStyle(ButtonStyle.Secondary)
      )
    );
    chunks.push(row);
  }
  return chunks;
}

module.exports = {
  mainEmbed,
  buildRows,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📋 Lista de comandos'),
  async execute(interaction) {
    await interaction.reply({ embeds: [mainEmbed(interaction.client.user)], components: buildRows() });
  }
};
