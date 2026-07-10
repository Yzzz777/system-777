const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('[OWNER] Envía un mensaje a todos los servidores')
    .addStringOption(o => o.setName('mensaje').setDescription('Mensaje a enviar').setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const msg = interaction.options.getString('mensaje');

    const embed = new EmbedBuilder()
      .setColor(0xF5C518)
      .setTitle('📢 Anuncio de System 777')
      .setDescription(msg)
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: 'System 777 · Developer 777' });

    let ok = 0, fail = 0;
    for (const guild of client.guilds.cache.values()) {
      const ch = guild.systemChannel
        || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages'));
      if (ch) {
        await ch.send({ embeds: [embed] }).then(() => ok++).catch(() => fail++);
      } else fail++;
    }

    await interaction.editReply({ content: `✅ Broadcast enviado: **${ok}** servidores · ❌ **${fail}** fallaron.` });
  }
};
