const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marry')
    .setDescription('💍 Propone matrimonio a otro usuario')
    .addUserOption(o => o.setName('usuario').setDescription('A quien propones').setRequired(true)),

  async execute(interaction) {
    const target  = interaction.options.getUser('usuario');
    const userId  = interaction.user.id;
    const targetId = target.id;

    if (targetId === userId)      return interaction.reply({ content: '❌ No puedes casarte contigo mismo.', flags: MessageFlags.Ephemeral });
    if (target.bot)               return interaction.reply({ content: '❌ Los bots no se casan.', flags: MessageFlags.Ephemeral });

    const myMarr     = db.get('marriages', userId,   null);
    const theirMarr  = db.get('marriages', targetId, null);

    if (myMarr)    return interaction.reply({ content: `❌ Ya estás casado/a con <@${myMarr.partnerId}>.`, flags: MessageFlags.Ephemeral });
    if (theirMarr) return interaction.reply({ content: `❌ **${target.username}** ya está casado/a.`, flags: MessageFlags.Ephemeral });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`marry_yes_${userId}_${targetId}`).setLabel('💍 Acepto').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`marry_no_${userId}_${targetId}`).setLabel('💔 Rechazo').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle('💍 ¡Propuesta de Matrimonio!')
      .setDescription(`${interaction.user} le ha propuesto matrimonio a ${target}.\n\n${target}, ¿aceptas?`)
      .setFooter({ text: 'Tienes 30 segundos para responder · System 777' });

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async btn => {
      if (btn.user.id !== targetId) {
        return btn.reply({ content: '❌ Solo la persona propuesta puede responder.', flags: MessageFlags.Ephemeral });
      }

      if (btn.customId.startsWith('marry_yes')) {
        db.set('marriages', userId,   { partnerId: targetId, since: Date.now() });
        db.set('marriages', targetId, { partnerId: userId,   since: Date.now() });

        await btn.update({
          embeds: [new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🎊 ¡Se casaron!')
            .setDescription(`${interaction.user} 💍 ${target}\n\n¡Felicidades a los novios!`)
            .setFooter({ text: 'System 777 · Dev: 777 · IG: @yzz.yzx' })],
          components: []
        });
      } else {
        await btn.update({
          embeds: [new EmbedBuilder()
            .setColor(0xFF4444)
            .setTitle('💔 Propuesta Rechazada')
            .setDescription(`${target} rechazó la propuesta de ${interaction.user}.`)
            .setFooter({ text: 'System 777 · Dev: 777' })],
          components: []
        });
      }
      collector.stop();
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
  }
};
