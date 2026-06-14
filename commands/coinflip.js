// ============================================================
//  commands/coinflip.js  –  Play coinflip gambling game
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin for double or nothing.")
    .addIntegerOption(opt =>
      opt.setName("bet")
        .setDescription("Amount of cash to bet")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("choice")
        .setDescription("Heads or tails")
        .setRequired(true)
        .addChoices(
          { name: "Heads", value: "heads" },
          { name: "Tails", value: "tails" }
        )
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);
    const bet = interaction.options.getInteger("bet");
    const choice = interaction.options.getString("choice");

    if (bet <= 0) {
      return interaction.reply({ content: "❌ Bet amount must be positive.", ephemeral: true });
    }

    if (bet > user.wallet) {
      return interaction.reply({
        content: `❌ Insufficient cash. You only have **$${user.wallet.toLocaleString()}** in your wallet.`,
        ephemeral: true
      });
    }

    const MAX_GAMBLE = 10000;
    if (bet > MAX_GAMBLE) {
      return interaction.reply({
        content: `❌ Maximum bet limit for gambling is **$${MAX_GAMBLE.toLocaleString()}**.`,
        ephemeral: true
      });
    }

    const hasLuckyCharm = !!(user.inventory['lucky_charm'] && user.inventory['lucky_charm'] > 0);
    let winChance = 0.5;
    if (hasLuckyCharm) winChance = 0.55; // 5% boost

    const rolls = ['heads', 'tails'];
    let rolledFace = rolls[Math.floor(Math.random() * rolls.length)];

    const playerWon = Math.random() < winChance;
    if (playerWon) {
      rolledFace = choice;
    } else {
      rolledFace = choice === 'heads' ? 'tails' : 'heads';
    }

    if (playerWon) {
      user.wallet += bet;
      economy.saveEconomy();

      return interaction.reply({
        content: `🪙 **Coinflip Result:** The coin landed on **${rolledFace.toUpperCase()}**!\n\n🎉 **WIN!** You chose **${choice}** and won **+$${bet.toLocaleString()}**!${hasLuckyCharm ? ' (🍀 Lucky Charm applied)' : ''}\n👛 Wallet Balance: **$${user.wallet.toLocaleString()}**`
      });
    } else {
      user.wallet -= bet;
      economy.saveEconomy();

      return interaction.reply({
        content: `🪙 **Coinflip Result:** The coin landed on **${rolledFace.toUpperCase()}**!\n\n😢 **LOSE** You chose **${choice}** and lost **-$${bet.toLocaleString()}**.\n👛 Wallet Balance: **$${user.wallet.toLocaleString()}**`
      });
    }
  }
};
