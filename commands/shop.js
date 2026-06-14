// ============================================================
//  commands/shop.js  –  Browse duty-free shop items
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Browse items available for purchase in the shop."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const isVip = economy.hasVipDiscount(userId);

    const embed = new EmbedBuilder()
      .setTitle("🛒 Asiana Airport Duty-Free Shop")
      .setColor(0xffaa00)
      .setDescription(`Purchase equipment to boost your airline career. ${isVip ? "\n💡 **First-Class VIP Discount Active (10% Off!)**" : "\nUse \`/buy [item_id]\` to purchase an item."}`)
      .setTimestamp();

    for (const [id, item] of Object.entries(economy.SHOP_ITEMS)) {
      const price = isVip ? Math.floor(item.price * 0.9) : item.price;
      const typeStr = item.usable ? "🟢 Usable/Consumable" : "🔒 Passive Backpack Effect";
      embed.addFields({
        name: `${item.emoji} ${item.name} (ID: \`${id}\`)`,
        value: `💵 Price: **$${price.toLocaleString()}** (Resell: $${item.sellPrice.toLocaleString()})\n✨ Type: ${typeStr}\n📖 Description: ${item.description}`,
        inline: false
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
