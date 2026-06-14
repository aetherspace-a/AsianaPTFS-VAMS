// ============================================================
//  commands/leaderboard.js  –  View the richest users
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the richest users in the airline server."),

  async execute(interaction) {
    const list = Object.keys(economy.economyData).map(uid => {
      const u = economy.economyData[uid];
      const netWorth = u.wallet + u.bank;
      return { username: u.username, netWorth, level: u.level };
    });

    list.sort((a, b) => b.netWorth - a.netWorth);
    const top = list.slice(0, 10);

    const embed = new EmbedBuilder()
      .setTitle("🏆 Asiana Airlines Wealth Leaderboard")
      .setColor(0xffaa00)
      .setDescription("The richest captains and flight staff in the server.")
      .setTimestamp();

    if (top.length === 0) {
      embed.setDescription("The leaderboard is currently empty.");
    } else {
      let desc = "";
      top.forEach((u, i) => {
        let medal = "";
        if (i === 0) medal = "🥇";
        else if (i === 1) medal = "🥈";
        else if (i === 2) medal = "🥉";
        else medal = `\`#${i+1}\``;

        desc += `${medal} **${u.username}** (Lvl ${u.level}) — **$${u.netWorth.toLocaleString()}**\n`;
      });
      embed.setDescription(desc);
    }

    return interaction.reply({ embeds: [embed] });
  }
};
