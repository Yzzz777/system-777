const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Gestiona la whitelist/blacklist global')
    .addSubcommand(s => s
      .setName('add')
      .setDescription('Añadir a whitelist')
      .addStringOption(o => o.setName('tipo').setDescription('Tipo').setRequired(true).addChoices(
        { name: 'Usuario', value: 'users' },
        { name: 'Bot',     value: 'bots'  }
      ))
      .addStringOption(o => o.setName('id').setDescription('ID del usuario/bot').setRequired(true)))
    .addSubcommand(s => s
      .setName('remove')
      .setDescription('Remover de whitelist')
      .addStringOption(o => o.setName('tipo').setDescription('Tipo').setRequired(true).addChoices(
        { name: 'Usuario', value: 'users' },
        { name: 'Bot',     value: 'bots'  }
      ))
      .addStringOption(o => o.setName('id').setDescription('ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('blacklist-add')
      .setDescription('Añadir a blacklist global (será baneado en todos los servidores)')
      .addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true))
      .addStringOption(o => o.setName('razon').setDescription('Razón')))
    .addSubcommand(s => s
      .setName('blacklist-remove')
      .setDescription('Remover de blacklist global')
      .addStringOption(o => o.setName('id').setDescription('User ID').setRequired(true)))
    .addSubcommand(s => s
      .setName('list')
      .setDescription('Ver listas'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const tipo = interaction.options.getString('tipo');
      const id   = interaction.options.getString('id');
      const list = db.get('whitelist', tipo, []);
      if (!list.includes(id)) { list.push(id); db.set('whitelist', tipo, list); }
      await interaction.reply({ content: `✅ ID \`${id}\` añadido a la whitelist de **${tipo}**.`, flags: MessageFlags.Ephemeral });

    } else if (sub === 'remove') {
      const tipo = interaction.options.getString('tipo');
      const id   = interaction.options.getString('id');
      const list = db.get('whitelist', tipo, []).filter(x => x !== id);
      db.set('whitelist', tipo, list);
      await interaction.reply({ content: `✅ ID \`${id}\` removido de whitelist.`, flags: MessageFlags.Ephemeral });

    } else if (sub === 'blacklist-add') {
      const id     = interaction.options.getString('id');
      const reason = interaction.options.getString('razon') || 'Sin razón';
      const list   = db.get('blacklist', 'users', []);
      if (!list.includes(id)) { list.push(id); db.set('blacklist', 'users', list); }
      await interaction.reply({ content: `🚫 ID \`${id}\` añadido a la blacklist global.\nRazón: ${reason}`, flags: MessageFlags.Ephemeral });

    } else if (sub === 'blacklist-remove') {
      const id   = interaction.options.getString('id');
      const list = db.get('blacklist', 'users', []).filter(x => x !== id);
      db.set('blacklist', 'users', list);
      await interaction.reply({ content: `✅ ID \`${id}\` removido de blacklist.`, flags: MessageFlags.Ephemeral });

    } else if (sub === 'list') {
      const wlU = db.get('whitelist', 'users', []);
      const wlB = db.get('whitelist', 'bots',  []);
      const bl  = db.get('blacklist', 'users', []);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('📋 Listas de System 777')
          .addFields(
            { name: `✅ Whitelist usuarios (${wlU.length})`, value: wlU.length ? wlU.map(id=>`\`${id}\``).join(', ').slice(0,512) : 'Vacía' },
            { name: `🤖 Whitelist bots (${wlB.length})`,     value: wlB.length ? wlB.map(id=>`\`${id}\``).join(', ').slice(0,512) : 'Vacía' },
            { name: `🚫 Blacklist (${bl.length})`,            value: bl.length  ? bl.map(id=>`\`${id}\``).join(', ').slice(0,512)  : 'Vacía' },
          )
          .setFooter({ text: 'System 777 · Developer 777' })],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
