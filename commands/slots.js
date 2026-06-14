// ============================================================
//  commands/slots.js  –  Play slots gambling game
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Play the airline slots machine.")
    .addIntegerOption(opt =>
      opt.setName("bet")
        .setDescription("Amount of cash to bet")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);
    const bet = interaction.options.getInteger("bet");

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
    const symbols = ['✈️', '🚁', '🚀', '💎', '👑'];
    
    let roll1 = symbols[Math.floor(Math.random() * symbols.length)];
    let roll2 = symbols[Math.floor(Math.random() * symbols.length)];
    let roll3 = symbols[Math.floor(Math.random() * symbols.length)];

    // Lucky charm: 12% chance to reroll a loss to a win
    if (hasLuckyCharm && (roll1 !== roll2 && roll2 !== roll3 && roll1 !== roll3)) {
      if (Math.random() < 0.12) {
        const matchSym = symbols[Math.floor(Math.random() * symbols.length)];
        roll1 = matchSym;
        roll2 = matchSym;
        roll3 = Math.random() < 0.5 ? matchSym : symbols.find(s => s !== matchSym);
      }
    }

    let win = false;
    let multiplier = 0;

    if (roll1 === roll2 && roll2 === roll3) {
      win = true;
      if (roll1 === '👑') multiplier = 10;
      else if (roll1 === '💎') multiplier = 7;
      else if (roll1 === '🚀') multiplier = 5;
      else if (roll1 === '🚁') multiplier = 4;
      else multiplier = 3;
    } else if (roll1 === roll2 || roll2 === roll3 || roll1 === roll3) {
      win = true;
      multiplier = 1.5;
    }

    if (win) {
      const winAmount = Math.floor(bet * multiplier);
      const netWinnings = winAmount - bet;
      user.wallet += netWinnings;
      economy.saveEconomy();

      return interaction.reply({
        content: `🎰 **[ ${roll1} | ${roll2} | ${roll3} ]**\n\n🎉 **WIN!** You matched symbols and won **+$${netWinnings.toLocaleString()}**! (${multiplier}x payout)${hasLuckyCharm ? ' (🍀 Lucky Charm applied)' : ''}\n👛 Wallet Balance: **$${user.wallet.toLocaleString()}**`
      });
    } else {
      user.wallet -= bet;
      economy.saveEconomy();

      return interaction.reply({
        content: `🎰 **[ ${roll1} | ${roll2} | ${roll3} ]**\n\n😢 **LOSE** No matching symbols. You lost **-$${bet.toLocaleString()}**.\n👛 Wallet Balance: **$${user.wallet.toLocaleString()}**`
      });
    }
  }
};
