// ============================================================
//  commands/deposit.js  –  Deposit cash into safe bank
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Deposit cash from your wallet into the safe bank.")
    .addStringOption(opt =>
      opt.setName("amount")
        .setDescription("Amount of cash to deposit (number, 'all' or 'max')")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);
    const amountStr = interaction.options.getString("amount").toLowerCase();

    let amount = 0;
    const availableSpace = user.bankSpace - user.bank;

    if (availableSpace <= 0) {
      return interaction.reply({
        content: "⚠️ Your bank is already full! Use bank cards to increase capacity or level up.",
        ephemeral: true
      });
    }

    if (amountStr === "all" || amountStr === "max") {
      amount = Math.min(user.wallet, availableSpace);
    } else {
      amount = parseInt(amountStr, 10);
      if (isNaN(amount) || amount <= 0) {
        return interaction.reply({
          content: "❌ Please enter a valid positive number, or use 'all' / 'max'.",
          ephemeral: true
        });
      }
    }

    if (amount === 0) {
      return interaction.reply({
        content: "⚠️ You don't have any cash in your wallet to deposit!",
        ephemeral: true
      });
    }

    if (amount > user.wallet) {
      return interaction.reply({
        content: `❌ Insufficient cash in wallet. You only have **$${user.wallet.toLocaleString()}**.`,
        ephemeral: true
      });
    }

    if (amount > availableSpace) {
      return interaction.reply({
        content: `⚠️ You can only deposit up to **$${availableSpace.toLocaleString()}** before your bank fills up.`,
        ephemeral: true
      });
    }

    user.wallet -= amount;
    user.bank += amount;
    economy.saveEconomy();

    return interaction.reply({
      content: `🏛️ Successfully deposited **$${amount.toLocaleString()}** into your safe bank account!\n👛 Wallet: **$${user.wallet.toLocaleString()}** | 🏦 Bank: **$${user.bank.toLocaleString()}** / **$${user.bankSpace.toLocaleString()}**`
    });
  }
};
