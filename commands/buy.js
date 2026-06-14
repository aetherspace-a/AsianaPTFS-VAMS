// ============================================================
//  commands/buy.js  –  Buy item from the airport shop
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy items from the airport shop.")
    .addStringOption(opt =>
      opt.setName("item_id")
        .setDescription("The ID of the item to buy (e.g. coffee, padlock, lucky_charm)")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("quantity")
        .setDescription("Quantity of items to buy (Default is 1)")
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
      return interaction.reply({ content: "❌ Item not found. Run `/shop` to view valid items.", ephemeral: true });
    }

    if (itemId === 'lucky_charm' && user.inventory['lucky_charm'] >= 1) {
      return interaction.reply({ content: "⚠️ You can only carry one Lucky Aviation Charm at a time.", ephemeral: true });
    }

    const isVip = economy.hasVipDiscount(userId);
    const finalPrice = Math.floor(item.price * qty * (isVip ? 0.9 : 1.0));

    if (user.wallet < finalPrice) {
      return interaction.reply({
        content: `❌ Insufficient cash. You need **$${finalPrice.toLocaleString()}** but only have **$${user.wallet.toLocaleString()}** in your wallet.`,
        ephemeral: true
      });
    }

    user.wallet -= finalPrice;
    economy.addItem(userId, itemId, qty);

    return interaction.reply({
      content: `🛒 Successfully purchased **${qty}x ${item.name}** for **$${finalPrice.toLocaleString()}**!\n👛 Wallet Balance: **$${user.wallet.toLocaleString()}**`
    });
  }
};
