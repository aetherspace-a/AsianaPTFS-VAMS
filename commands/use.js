// ============================================================
//  commands/use.js  –  Use a consumable item from inventory
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("use")
    .setDescription("Consume/use an item from your backpack.")
    .addStringOption(opt =>
      opt.setName("item_id")
        .setDescription("The ID of the item to use")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);
    const itemId = interaction.options.getString("item_id").toLowerCase();

    const item = economy.SHOP_ITEMS[itemId];
    if (!item) {
      return interaction.reply({ content: "❌ Item not found.", ephemeral: true });
    }

    if (!user.inventory[itemId] || user.inventory[itemId] <= 0) {
      return interaction.reply({
        content: `❌ You do not have any **${item.name}** in your backpack.`,
        ephemeral: true
      });
    }

    if (!item.usable) {
      return interaction.reply({
        content: `🔒 **${item.name}** is a passive item and cannot be consumed. Keep it in your inventory to enjoy its passive advantages!`,
        ephemeral: true
      });
    }

    if (itemId === "coffee") {
      if (user.workBooster > 0) {
        return interaction.reply({
          content: "⚠️ You already have active coffee energy! Complete your current coffee shifts first.",
          ephemeral: true
        });
      }
      economy.removeItem(userId, itemId, 1);
      user.workBooster = 3;
      economy.saveEconomy();
      return interaction.reply({
        content: `☕ You drank **${item.name}**. Your next **3 work shifts** will have **1.5x payouts** and **0% failure rates**!`
      });
    }

    if (itemId === "bank_card") {
      economy.removeItem(userId, itemId, 1);
      user.bankSpace += 10000;
      economy.saveEconomy();
      return interaction.reply({
        content: `💳 You used **${item.name}**. Your bank capacity has permanently increased by **+$10,000**!`
      });
    }

    return interaction.reply({ content: "❌ This item cannot be used.", ephemeral: true });
  }
};
