// ============================================================
//  commands/withdraw.js  –  Withdraw cash from safe bank
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Withdraw cash from the safe bank into your wallet.")
    .addStringOption(opt =>
      opt.setName("amount")
        .setDescription("Amount of cash to withdraw (number or 'all')")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);
    const amountStr = interaction.options.getString("amount").toLowerCase();

    let amount = 0;

    if (user.bank <= 0) {
      return interaction.reply({
        content: "⚠️ You don't have any cash in your bank to withdraw!",
        ephemeral: true
      });
    }

    if (amountStr === "all") {
      amount = user.bank;
    } else {
      amount = parseInt(amountStr, 10);
      if (isNaN(amount) || amount <= 0) {
        return interaction.reply({
          content: "❌ Please enter a valid positive number, or use 'all'.",
          ephemeral: true
        });
      }
    }

    if (amount > user.bank) {
      return interaction.reply({
        content: `❌ You only have **$${user.bank.toLocaleString()}** in your bank account.`,
        ephemeral: true
      });
    }

    user.bank -= amount;
    user.wallet += amount;
    economy.saveEconomy();

    return interaction.reply({
      content: `💸 Successfully withdrew **$${amount.toLocaleString()}** from your safe bank account!\n👛 Wallet: **$${user.wallet.toLocaleString()}** | 🏦 Bank: **$${user.bank.toLocaleString()}** / **$${user.bankSpace.toLocaleString()}**`
    });
  }
};
