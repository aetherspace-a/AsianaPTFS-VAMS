// ============================================================
//  commands/balance.js  –  Check user wallet and bank balances
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your wallet cash and bank balance.")
    .addUserOption(option => 
      option.setName("user")
        .setDescription("The user to check balance for (Optional)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") || interaction.user;
    const user = economy.getUser(target.id, target.username);
    const netWorth = user.wallet + user.bank;

    const embed = new EmbedBuilder()
      .setTitle(`💵 Balance for ${target.username}`)
      .setColor(0x00b0f4)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }) || null)
      .addFields(
        { name: "👛 Wallet Cash", value: `**$${user.wallet.toLocaleString()}**`, inline: true },
        { name: "🏦 Safe Bank", value: `**$${user.bank.toLocaleString()}** / $${user.bankSpace.toLocaleString()}`, inline: true },
        { name: "💰 Net Wealth", value: `**$${netWorth.toLocaleString()}**`, inline: false }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
