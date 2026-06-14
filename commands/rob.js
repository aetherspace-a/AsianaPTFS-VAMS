// ============================================================
//  commands/rob.js  –  Rob another user's wallet
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rob")
    .setDescription("Rob wallet cash from another user.")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("The user to rob")
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");
    const robberId = interaction.user.id;
    const victimId = targetUser.id;

    if (victimId === robberId) {
      return interaction.reply({ content: "❌ You cannot rob yourself!", ephemeral: true });
    }
    if (targetUser.bot) {
      return interaction.reply({ content: "❌ You cannot rob a bot!", ephemeral: true });
    }

    const robber = economy.getUser(robberId, interaction.user.username);
    const victim = economy.getUser(victimId, targetUser.username);

    // Cooldown check
    const now = Date.now();
    const cooldown = 10 * 60 * 1000; // 10 minutes
    const last = robber.cooldowns.rob || 0;

    if (now - last < cooldown) {
      const timeLeft = cooldown - (now - last);
      const mins = Math.floor(timeLeft / (60 * 1000));
      const secs = Math.floor((timeLeft % (60 * 1000)) / 1000);
      return interaction.reply({
        content: `⚠️ You are still on robbery cooldown. Wait **${mins}m ${secs}s** before robbing again.`,
        ephemeral: true
      });
    }

    // Minimum balance check
    if (robber.wallet < 200) {
      return interaction.reply({
        content: "❌ You need at least **$200** in your wallet to perform a robbery (to pay fines if caught).",
        ephemeral: true
      });
    }
    if (victim.wallet < 200) {
      return interaction.reply({
        content: `❌ **${targetUser.username}** only has $${victim.wallet} in their wallet. It is not worth robbing them.`,
        ephemeral: true
      });
    }

    // Robbery execution (set cooldown immediately)
    robber.cooldowns.rob = now;

    // Check victim padlock
    const hasPadlock = !!(victim.inventory['padlock'] && victim.inventory['padlock'] > 0);
    if (hasPadlock) {
      economy.removeItem(victimId, 'padlock', 1);
      
      const fine = 500;
      robber.wallet = Math.max(0, robber.wallet - fine);
      victim.wallet += fine;
      economy.saveEconomy();

      return interaction.reply({
        content: `🔒 **Robbery Failed!** You tried to rob **${targetUser.username}**, but their wallet was protected by a **Security Padlock** which snapped shut! The padlock broke, and you were fined **$500** which went to the victim.`
      });
    }

    const success = Math.random() < 0.5;

    if (success) {
      const robPct = Math.random() * 0.4 + 0.1; // 10% to 50%
      const stolen = Math.floor(victim.wallet * robPct);

      victim.wallet -= stolen;
      robber.wallet += stolen;
      economy.saveEconomy();

      return interaction.reply({
        content: `💸 **Success!** You sneaked up on **${targetUser.username}** and managed to steal **$${stolen.toLocaleString()}** from their wallet!`
      });
    } else {
      const finePct = Math.random() * 0.2 + 0.1; // 10% to 30%
      const fine = Math.max(100, Math.floor(robber.wallet * finePct));

      robber.wallet -= fine;
      victim.wallet += fine;
      economy.saveEconomy();

      return interaction.reply({
        content: `👮 **Busted!** You were caught trying to pickpocket **${targetUser.username}**! You were fined **$${fine.toLocaleString()}**, which went directly into the victim's wallet.`
      });
    }
  }
};
