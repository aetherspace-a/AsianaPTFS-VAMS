// ============================================================
//  commands/ecoadmin.js  –  Admin management of economy system
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ecoadmin")
    .setDescription("Administrator commands to manage the economy system.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName("give-cash")
        .setDescription("Give wallet cash to a user.")
        .addUserOption(opt => opt.setName("user").setDescription("The target user").setRequired(true))
        .addIntegerOption(opt => opt.setName("amount").setDescription("Amount of cash to give").setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName("take-cash")
        .setDescription("Take wallet cash from a user.")
        .addUserOption(opt => opt.setName("user").setDescription("The target user").setRequired(true))
        .addIntegerOption(opt => opt.setName("amount").setDescription("Amount of cash to take").setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName("set-bank")
        .setDescription("Set bank balance for a user.")
        .addUserOption(opt => opt.setName("user").setDescription("The target user").setRequired(true))
        .addIntegerOption(opt => opt.setName("amount").setDescription("New bank balance").setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName("add-item")
        .setDescription("Give an item to a user's backpack.")
        .addUserOption(opt => opt.setName("user").setDescription("The target user").setRequired(true))
        .addStringOption(opt => opt.setName("item_id").setDescription("The ID of the item").setRequired(true))
        .addIntegerOption(opt => opt.setName("quantity").setDescription("Quantity to add").setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription("Reset a user's economy profile completely.")
        .addUserOption(opt => opt.setName("user").setDescription("The target user to reset").setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser("user");
    const user = economy.getUser(targetUser.id, targetUser.username);

    if (subcommand === "give-cash") {
      const amount = interaction.options.getInteger("amount");
      if (amount <= 0) return interaction.reply({ content: "❌ Amount must be greater than 0.", ephemeral: true });

      user.wallet += amount;
      economy.saveEconomy();

      return interaction.reply({
        content: `✅ Added **$${amount.toLocaleString()}** to **${targetUser.username}**'s wallet.\n👛 New Wallet: **$${user.wallet.toLocaleString()}**`
      });
    }

    if (subcommand === "take-cash") {
      const amount = interaction.options.getInteger("amount");
      if (amount <= 0) return interaction.reply({ content: "❌ Amount must be greater than 0.", ephemeral: true });

      user.wallet = Math.max(0, user.wallet - amount);
      economy.saveEconomy();

      return interaction.reply({
        content: `✅ Took **$${amount.toLocaleString()}** from **${targetUser.username}**'s wallet.\n👛 New Wallet: **$${user.wallet.toLocaleString()}**`
      });
    }

    if (subcommand === "set-bank") {
      const amount = interaction.options.getInteger("amount");
      if (amount < 0) return interaction.reply({ content: "❌ Amount cannot be negative.", ephemeral: true });

      user.bank = amount;
      if (user.bank > user.bankSpace) {
        user.bankSpace = user.bank;
      }
      economy.saveEconomy();

      return interaction.reply({
        content: `✅ Set **${targetUser.username}**'s bank balance to **$${amount.toLocaleString()}**.\n🏦 New Bank: **$${user.bank.toLocaleString()}**`
      });
    }

    if (subcommand === "add-item") {
      const itemId = interaction.options.getString("item_id").toLowerCase();
      const qty = interaction.options.getInteger("quantity") || 1;

      if (qty <= 0) return interaction.reply({ content: "❌ Quantity must be greater than 0.", ephemeral: true });
      if (!economy.SHOP_ITEMS[itemId]) return interaction.reply({ content: "❌ Invalid Item ID.", ephemeral: true });

      economy.addItem(targetUser.id, itemId, qty);

      return interaction.reply({
        content: `✅ Added **${qty}x ${economy.SHOP_ITEMS[itemId].name}** to **${targetUser.username}**'s backpack.`
      });
    }

    if (subcommand === "reset") {
      delete economy.economyData[targetUser.id];
      economy.saveEconomy();

      return interaction.reply({
        content: `🧹 Completely reset **${targetUser.username}**'s economy profile to default values.`
      });
    }
  }
};
