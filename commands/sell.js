// ============================================================
//  commands/sell.js  –  Sell item back to the shop
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sell")
    .setDescription("Sell owned items back to the shop for 50% value.")
    .addStringOption(opt =>
      opt.setName("item_id")
        .setDescription("The ID of the item to sell")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("quantity")
        .setDescription("Quantity of items to sell (Default is 1)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);
    const itemId = interaction.options.getString("item_id").toLowerCase();
    const qty = interaction.options.getInteger("quantity") || 1;

    if (qty <= 0) {
      return interaction.reply({ content: "❌ Quantity must be at least 1.", ephemeral: true });
    }

    const item = economy.SHOP_ITEMS[itemId];
    if (!item) {
      return interaction.reply({ content: "❌ Item not found.", ephemeral: true });
    }

    if (!user.inventory[itemId] || user.inventory[itemId] < qty) {
      return interaction.reply({
        content: `❌ You do not have enough **${item.name}** to sell.`,
        ephemeral: true
      });
    }

    const finalPayout = item.sellPrice * qty;
    economy.removeItem(userId, itemId, qty);
    user.wallet += finalPayout;
    economy.saveEconomy();

    return interaction.reply({
      content: `💰 Successfully sold **${qty}x ${item.name}** back to the shop for **$${finalPayout.toLocaleString()}**!\n👛 Wallet Balance: **$${user.wallet.toLocaleString()}**`
    });
  }
};
