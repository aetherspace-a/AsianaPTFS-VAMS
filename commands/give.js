// ============================================================
//  commands/give.js  –  Transfer cash or items to other users
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("Transfer cash or items to another user.")
    .addSubcommand(sub =>
      sub
        .setName("cash")
        .setDescription("Send money to another user's wallet.")
        .addUserOption(opt => opt.setName("user").setDescription("The recipient of the cash").setRequired(true))
        .addIntegerOption(opt => opt.setName("amount").setDescription("Amount of cash to send").setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName("item")
        .setDescription("Gift an item to another user.")
        .addUserOption(opt => opt.setName("user").setDescription("The recipient of the item").setRequired(true))
        .addStringOption(opt => opt.setName("item_id").setDescription("The ID of the item").setRequired(true))
        .addIntegerOption(opt => opt.setName("quantity").setDescription("Quantity to gift").setRequired(false))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const senderId = interaction.user.id;
    const sender = economy.getUser(senderId, interaction.user.username);
    const recipient = interaction.options.getUser("user");

    if (recipient.id === senderId) {
      return interaction.reply({ content: "❌ You cannot send cash or items to yourself!", ephemeral: true });
    }
    if (recipient.bot) {
      return interaction.reply({ content: "❌ You cannot send cash or items to a bot!", ephemeral: true });
    }

    // Ensure recipient exists
    const target = economy.getUser(recipient.id, recipient.username);

    if (subcommand === "cash") {
      const amount = interaction.options.getInteger("amount");
      if (amount <= 0) {
        return interaction.reply({ content: "❌ Transfer amount must be greater than 0.", ephemeral: true });
      }

      if (sender.wallet < amount) {
        return interaction.reply({
          content: `❌ Insufficient wallet balance. You only have **$${sender.wallet.toLocaleString()}**.`,
          ephemeral: true
        });
      }

      sender.wallet -= amount;
      target.wallet += amount;
      economy.saveEconomy();

      return interaction.reply({
        content: `💸 Successfully transferred **$${amount.toLocaleString()}** to **${recipient.username}**!\n👛 Your Wallet: **$${sender.wallet.toLocaleString()}**`
      });
    }

    if (subcommand === "item") {
      const itemId = interaction.options.getString("item_id").toLowerCase();
      const qty = interaction.options.getInteger("quantity") || 1;

      if (qty <= 0) {
        return interaction.reply({ content: "❌ Gift quantity must be at least 1.", ephemeral: true });
      }

      const item = economy.SHOP_ITEMS[itemId];
      if (!item) {
        return interaction.reply({ content: "❌ Item not found.", ephemeral: true });
      }

      if (!sender.inventory[itemId] || sender.inventory[itemId] < qty) {
        return interaction.reply({
          content: `❌ You do not have enough **${item.name}** to gift.`,
          ephemeral: true
        });
      }

      // Transfer item
      economy.removeItem(senderId, itemId, qty);
      economy.addItem(recipient.id, itemId, qty);

      return interaction.reply({
        content: `🎁 Successfully gifted **${qty}x ${item.name}** to **${recipient.username}**!`
      });
    }
  }
};
