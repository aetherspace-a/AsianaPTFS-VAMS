// ============================================================
//  commands/work.js  –  Perform work shift to earn cash/XP
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Perform a work shift to earn cash and XP."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);

    if (!user.job) {
      return interaction.reply({
        content: "⚠️ You are currently unemployed. Please use `/job apply` to apply for a role first!",
        ephemeral: true
      });
    }

    const now = Date.now();
    const workCooldown = 30 * 60 * 1000; // 30 minutes
    const last = user.cooldowns.work || 0;

    if (now - last < workCooldown) {
      const timeLeftMs = workCooldown - (now - last);
      const minutes = Math.floor(timeLeftMs / (60 * 1000));
      const seconds = Math.floor((timeLeftMs % (60 * 1000)) / 1000);
      return interaction.reply({
        content: `⚠️ Work shift is on cooldown. Please wait **${minutes}m ${seconds}s** before working again.`,
        ephemeral: true
      });
    }

    const job = economy.JOBS[user.job];
    if (!job) {
      user.job = null;
      economy.saveEconomy();
      return interaction.reply({ content: "Your job could not be verified. Resigned.", ephemeral: true });
    }

    const coffeeActive = user.workBooster > 0;
    if (coffeeActive) {
      user.workBooster -= 1;
    }

    const roll = Math.random();
    const isFailure = !coffeeActive && roll < job.failChance;

    if (isFailure) {
      user.cooldowns.work = now;
      economy.saveEconomy();
      const failMsg = job.failMessages[Math.floor(Math.random() * job.failMessages.length)];
      return interaction.reply({
        content: `❌ **Shift Failure!** ${failMsg}\nYou received no pay for this shift.`
      });
    }

    const basePayout = Math.floor(Math.random() * (job.payoutMax - job.payoutMin + 1)) + job.payoutMin;
    const multiplier = coffeeActive ? 1.5 : 1.0;
    const finalPayout = Math.floor(basePayout * multiplier);

    user.wallet += finalPayout;
    user.cooldowns.work = now;

    const xpGained = Math.floor(Math.random() * 16) + 10; // 10-25 XP
    const leveledUp = economy.addXP(userId, xpGained);

    const embed = new EmbedBuilder()
      .setTitle(`💼 Work Shift Complete: ${job.name}`)
      .setColor(0x34c759)
      .setDescription(`Worked hard as a **${job.name}**!`)
      .addFields(
        { name: "💵 Payout", value: `**+$${finalPayout}**${coffeeActive ? ' (☕ Coffee 1.5x applied!)' : ''}`, inline: true },
        { name: "✨ XP Gained", value: `**+${xpGained} XP**`, inline: true },
        { name: "👛 Wallet Balance", value: `$${user.wallet.toLocaleString()}`, inline: true }
      );

    if (leveledUp) {
      embed.addFields({ name: "🎉 LEVEL UP!", value: `You reached **Level ${user.level}**! Your bank space increased by **$1,000**!`, inline: false });
    }

    economy.saveEconomy();
    return interaction.reply({ embeds: [embed] });
  }
};
