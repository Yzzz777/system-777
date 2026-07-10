const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('spy')
    .setDescription('[OWNER] Info completa de un usuario')
    .addStringOption(o => o.setName('id').setDescription('ID del usuario').setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const userId = interaction.options.getString('id').trim();

    let user;
    try { user = await client.users.fetch(userId); }
    catch { return interaction.editReply({ content: '❌ Usuario no encontrado.' }); }

    const eco     = db.get('economy', userId, { coins: 0, bank: 0 });
    const warns   = db.get('warns', `warn_${interaction.guild?.id}_${userId}`, []);
    const lvlData = db.get('levels', `${interaction.guild?.id}_${userId}`, { level: 0, xp: 0, messages: 0 });
    const gbans   = db.get('globalbans', 'users', {});
    const bl      = db.get('blacklist', 'users', []);

    // Intentar obtener miembro en el servidor actual
    let member;
    try { member = await interaction.guild?.members.fetch(userId); } catch {}

    const embed = new EmbedBuilder()
      .setColor(0xFF6600)
      .setTitle(`🕵️ Spy — ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🆔 ID',          value: user.id,                                                    inline: true  },
        { name: '📅 Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp/1000)}:R>`,         inline: true  },
        { name: '🤖 Es bot',       value: user.bot ? 'Sí' : 'No',                                    inline: true  },
        { name: '💰 Bolsillo',     value: `${eco.coins.toLocaleString()} 🪙`,                         inline: true  },
        { name: '🏦 Banco',        value: `${eco.bank.toLocaleString()} 🪙`,                          inline: true  },
        { name: '📊 Nivel / XP',   value: `Nv.${lvlData.level} · ${lvlData.xp} XP`,                 inline: true  },
        { name: '💬 Mensajes',     value: `${lvlData.messages}`,                                     inline: true  },
        { name: '⚠️ Advertencias', value: `${warns.length}`,                                         inline: true  },
        { name: '🚫 GlobalBan',    value: gbans[userId] ? `Sí — ${gbans[userId].reason}` : 'No',     inline: true  },
        { name: '📋 Blacklist',    value: bl.includes(userId) ? '⚠️ Sí' : 'No',                      inline: true  },
      );

    if (member) {
      embed.addFields(
        { name: '📅 Entró al server', value: `<t:${Math.floor(member.joinedTimestamp/1000)}:R>`,     inline: true },
        { name: '🎭 Roles',            value: member.roles.cache.map(r => r.name).slice(0,8).join(', ') || 'Ninguno', inline: false },
      );
    }

    embed.setFooter({ text: 'System 777 · Owner Only 👑' }).setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
