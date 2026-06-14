// ============================================================
//  commands/inventory.js  –  View owned items inside backpack
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View items currently in your backpack inventory."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);
    const inv = user.inventory || {};

    const embed = new EmbedBuilder()
      .setTitle(`🎒 Backpack of ${interaction.user.username}`)
      .setColor(0x00b0f4)
      .setTimestamp();

    const entries = Object.entries(inv);
    if (entries.length === 0) {
      embed.setDescription("Your backpack is completely empty! Check the `/shop` to purchase items.");
    } else {
      let desc = "";
      for (const [id, qty] of entries) {
        const item = economy.SHOP_ITEMS[id];
        if (item) {
          const typeStr = item.usable ? "🟢 Usable" : "🔒 Passive";
          desc += `${item.emoji} **${item.name}** x${qty} (ID: \`${id}\`)\n*${typeStr} — ${item.description}*\n\n`;
        }
      }
      embed.setDescription(desc);
    }

    return interaction.reply({ embeds: [embed] });
  }
};
