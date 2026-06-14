// ============================================================
//  commands/daily.js  –  Claim daily cash reward
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily cash reward."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);
    
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const twoDays = 48 * 60 * 60 * 1000;
    const last = user.lastDaily || 0;

    if (now - last < oneDay) {
      const timeLeftMs = oneDay - (now - last);
      const hours = Math.floor(timeLeftMs / (60 * 60 * 1000));
      const minutes = Math.floor((timeLeftMs % (60 * 60 * 1000)) / (60 * 1000));
      return interaction.reply({
        content: `⚠️ Daily reward is on cooldown. Please wait **${hours}h ${minutes}m** before claiming again.`,
        ephemeral: true
      });
    }

    if (now - last > twoDays) {
      user.streak = 0;
    }

    user.streak += 1;
    const streakBonus = Math.min((user.streak - 1) * 25, 250);
    const baseReward = 250;
    const totalPayout = baseReward + streakBonus;

    user.wallet += totalPayout;
    user.lastDaily = now;
    economy.saveEconomy();

    const embed = new EmbedBuilder()
      .setTitle("📅 Daily Reward Claimed!")
      .setColor(0x34c759)
      .setDescription(`🎉 You claimed your daily reward of **$${totalPayout}**!`)
      .addFields(
        { name: "🔥 Streak", value: `**${user.streak} day${user.streak !== 1 ? 's' : ''}**`, inline: true },
        { name: "🎁 Streak Bonus", value: `+$${streakBonus}`, inline: true },
        { name: "👛 Wallet Balance", value: `$${user.wallet.toLocaleString()}`, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
