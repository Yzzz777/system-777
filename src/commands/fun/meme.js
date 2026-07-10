const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const SUBREDDITS = ['memes', 'dankmemes', 'me_irl', 'AdviceAnimals', 'funny'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('😂 Meme aleatorio de Reddit'),

  async execute(interaction) {
    await interaction.deferReply();

    const sub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];

    try {
      const res  = await fetch(`https://www.reddit.com/r/${sub}/random.json?limit=1`, {
        headers: { 'User-Agent': 'System777Bot/1.0' }
      });
      const json = await res.json();
      const post = json[0]?.data?.children[0]?.data;

      if (!post || post.over_18) {
        return interaction.editReply({ content: '❌ No se pudo obtener meme. Intenta de nuevo.' });
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle(post.title.slice(0, 256))
        .setImage(post.url)
        .addFields(
          { name: '⬆️ Upvotes', value: `${post.ups.toLocaleString()}`, inline: true },
          { name: '💬 Comentarios', value: `${post.num_comments.toLocaleString()}`, inline: true },
          { name: '📌 Subreddit', value: `r/${sub}`, inline: true },
        )
        .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' });

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ content: '❌ Error al conectar con Reddit. Intenta más tarde.' });
    }
  }
};
