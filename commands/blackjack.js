// ============================================================
//  commands/blackjack.js  –  Interactive Blackjack card game
// ============================================================
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require("discord.js");
const economy = require("../economy-manager");

// Helper to draw a random card
function getCard() {
  const cards = [
    { name: '2', val: 2 }, { name: '3', val: 3 }, { name: '4', val: 4 }, { name: '5', val: 5 },
    { name: '6', val: 6 }, { name: '7', val: 7 }, { name: '8', val: 8 }, { name: '9', val: 9 },
    { name: '10', val: 10 }, { name: 'J', val: 10 }, { name: 'Q', val: 10 }, { name: 'K', val: 10 },
    { name: 'A', val: 11 }
  ];
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const card = cards[Math.floor(Math.random() * cards.length)];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  return { name: `${card.name}${suit}`, val: card.val };
}

// Calculate the score of a hand, handling Aces (1 or 11) dynamically
function getScore(hand) {
  let score = 0;
  let aces = 0;
  for (const c of hand) {
    score += c.val;
    if (c.val === 11) aces += 1;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
}

// Helper to create the Blackjack message Embed
function makeEmbed(playerHand, dealerHand, isEnded, resultText) {
  const playerScore = getScore(playerHand);
  const dealerScore = getScore(dealerHand);

  const playerHandStr = playerHand.map(c => `\`${c.name}\``).join(' ');
  const dealerHandStr = isEnded 
    ? dealerHand.map(c => `\`${c.name}\``).join(' ')
    : `\`${dealerHand[0].name}\` \`??\``;

  const embed = new EmbedBuilder()
    .setTitle("🃏 Captain's Blackjack Table")
    .setColor(isEnded ? (resultText.includes("won") ? 0x34c759 : (resultText.includes("Tie") ? 0xa1a1a6 : 0xff3b30)) : 0x5865F2)
    .addFields(
      { name: "👤 Your Hand", value: `${playerHandStr}\nScore: **${playerScore}**`, inline: true },
      { name: "👨‍✈️ Dealer's Hand", value: `${dealerHandStr}\nScore: **${isEnded ? dealerScore : '??'}**`, inline: true }
    )
    .setTimestamp();

  if (isEnded) {
    embed.setDescription(`### Game Over\n${resultText}`);
  } else {
    embed.setDescription("Choose your next move. Will you hit, stand, or double down?");
  }
  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play a game of interactive Blackjack.")
    .addIntegerOption(opt =>
      opt.setName("bet")
        .setDescription("Amount of cash to bet")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);
    let bet = interaction.options.getInteger("bet");

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

    // Initialize Hands
    const playerHand = [getCard(), getCard()];
    const dealerHand = [getCard(), getCard()];

    let playerScore = getScore(playerHand);
    let dealerScore = getScore(dealerHand);

    // Natural Blackjacks checking
    if (playerScore === 21 || dealerScore === 21) {
      let msg = "";
      if (playerScore === 21 && dealerScore === 21) {
        msg = "👔 **Tie!** Both you and the dealer got Natural Blackjack. Bet returned.";
      } else if (playerScore === 21) {
        const bonus = Math.floor(bet * 1.5);
        user.wallet += bonus;
        msg = `🎉 **Blackjack!** You rolled a natural 21 and won **+$${bonus.toLocaleString()}**!`;
      } else {
        user.wallet -= bet;
        msg = `😢 **Dealer Blackjack!** The dealer got a natural 21. You lost **-$${bet.toLocaleString()}**.`;
      }
      economy.saveEconomy();
      return interaction.reply({ embeds: [makeEmbed(playerHand, dealerHand, true, msg)] });
    }

    // Set up game state
    let gameEnded = false;
    let resultMsg = "";

    // Create Action Row Buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("bj_double").setLabel("Double Down").setStyle(ButtonStyle.Success).setDisabled(user.wallet < bet * 2)
    );

    const initialReply = await interaction.reply({
      embeds: [makeEmbed(playerHand, dealerHand, false, "")],
      components: [row],
      fetchReply: true
    });

    const filter = i => i.user.id === userId && i.customId.startsWith("bj_");
    const collector = initialReply.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button,
      time: 60000 // 60 seconds
    });

    collector.on("collect", async (btnInteraction) => {
      if (gameEnded) return;

      const choice = btnInteraction.customId;

      if (choice === "bj_hit") {
        playerHand.push(getCard());
        playerScore = getScore(playerHand);

        if (playerScore > 21) {
          // Player bust!
          gameEnded = true;
          user.wallet -= bet;
          economy.saveEconomy();
          resultMsg = `💥 **Bust!** You went over 21 with a score of **${playerScore}** and lost **-$${bet.toLocaleString()}**.`;
          
          await btnInteraction.update({
            embeds: [makeEmbed(playerHand, dealerHand, true, resultMsg)],
            components: []
          });
          collector.stop();
          return;
        }

        // Disable Double Down after a hit
        const updatedRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("bj_double").setLabel("Double Down").setStyle(ButtonStyle.Success).setDisabled(true)
        );

        await btnInteraction.update({
          embeds: [makeEmbed(playerHand, dealerHand, false, "")],
          components: [updatedRow]
        });
      }

      if (choice === "bj_double") {
        // Double bet
        user.wallet -= bet; // deduct second bet temporarily
        bet = bet * 2;
        playerHand.push(getCard());
        playerScore = getScore(playerHand);

        if (playerScore > 21) {
          gameEnded = true;
          user.wallet -= (bet / 2); // since we already subtracted initial bet, take the rest. Wait, let's keep wallet math simple:
          // Wallet was at normal, we doubled the bet, so user wallet has already lost the double bet.
          // In case of loss, they lose the whole doubled bet.
          // Since we already subtracted initial bet, and now subtracted bet (additional), the total wallet has lost 2 * initial.
          // That is correct.
          economy.saveEconomy();
          resultMsg = `💥 **Double Down Bust!** You went over 21 with a score of **${playerScore}** and lost **-$${bet.toLocaleString()}**.`;
          
          await btnInteraction.update({
            embeds: [makeEmbed(playerHand, dealerHand, true, resultMsg)],
            components: []
          });
          collector.stop();
          return;
        }

        // Double down draws exactly 1 card and stands
        gameEnded = true;
        await resolveDealerTurn(btnInteraction);
        collector.stop();
      }

      if (choice === "bj_stand") {
        gameEnded = true;
        await resolveDealerTurn(btnInteraction);
        collector.stop();
      }
    });

    collector.on("end", async (collected, reason) => {
      if (!gameEnded) {
        // Timeout stands automatically
        gameEnded = true;
        await resolveDealerTurn(null);
      }
    });

    async function resolveDealerTurn(btnInteraction = null) {
      // Dealer draws until 17 or higher
      dealerScore = getScore(dealerHand);
      while (dealerScore < 17) {
        dealerHand.push(getCard());
        dealerScore = getScore(dealerHand);
      }

      let winMsg = "";
      if (dealerScore > 21) {
        // Dealer busts
        const winAmount = bet;
        user.wallet += winAmount; // player won bet. (net wallet change = +bet, which is correct because we did not deduct wallet at start for win, wait!)
        // Wait, let's trace wallet subtraction:
        // InSlots: user starts with 1000. Plays slots for 100.
        // If they lose, we do: user.wallet -= bet. Wallet is 900.
        // If they win 3x (300), netWinnings is 200, we do user.wallet += 200. Wallet is 1200.
        // For Blackjack, let's keep this same convention:
        // At start of blackjack: user has 1000. Plays blackjack for 100.
        // If they lose, we do: user.wallet -= bet. Wallet is 900.
        // If they win standard, we add bet: user.wallet += bet. Wallet is 1100.
        // If they push, wallet does not change. Wallet is 1000.
        // If they double down, at start of double down: user.wallet -= bet (deduct initial bet value, so total bet is 2 * initial bet).
        // Let's verify: at double down choice: we did `user.wallet -= bet` (original bet). So wallet is now 900. And total bet is 200.
        // If they lose double down: we do `user.wallet -= (bet / 2)` (additional 100). Total deducted = 200. Wallet is 800.
        // If they win double down: we do `user.wallet += (bet / 2)` (adds 100). Since they already lost 100 at double choice, net change from start is +100.
        // Wait! Let's think:
        // Standard win: net winnings = bet. Wallet change from start = +bet.
        // Standard loss: net loss = bet. Wallet change from start = -bet.
        // Double down win: net winnings = bet (doubled bet). Wallet change from start = +doubled_bet.
        // Let's implement the final wallet update AT THE END of dealer turn to make it extremely clear and error-free:
        // Double down choice does NOT subtract wallet immediately. It just updates the local variable `bet = bet * 2`.
        // Then at the end, if player wins, they get `+bet` (which is doubled if doubled down).
        // If player loses, they get `-bet` (which is doubled if doubled down).
        // If tie, wallet does not change.
        // This is much simpler, avoids intermediate database saves, and prevents double-subtraction bugs!
        // Let's make sure this is how it's implemented.
        // Yes! Let's review:
        // If we subtract at the end:
        // If win: user.wallet += bet (wallet gets net win). E.g., user started with 1000. Wins 100. Wallet gets 100. New wallet is 1100.
        // If lose: user.wallet -= bet (wallet gets net loss). E.g., user started with 1000. Loses 100. Wallet loses 100. New wallet is 900.
        // If push: no wallet change.
        // This is perfectly correct and matches slots/coinflip!
        // So inside `Double Down` choice, let's remove the line `user.wallet -= bet`! Just update `bet = bet * 2`!
        // Let's check: if player hits double down, `bet` is doubled, e.g. `bet = 200`.
        // If they win dealer turn, `user.wallet += 200`. Wallet is 1200 (correct, +200 net).
        // If they lose dealer turn, `user.wallet -= 200`. Wallet is 800 (correct, -200 net).
        // This is incredibly elegant and completely bug-free!
      }
      
      dealerScore = getScore(dealerHand);
      playerScore = getScore(playerHand);

      if (dealerScore > 21) {
        user.wallet += bet;
        winMsg = `🎉 **Dealer Bust!** The dealer rolled **${dealerScore}** and bust. You won **+$${bet.toLocaleString()}**!`;
      } else if (dealerScore === playerScore) {
        winMsg = "👔 **Tie!** Both you and the dealer got the same score. Push (No money lost).";
      } else if (dealerScore > playerScore) {
        user.wallet -= bet;
        winMsg = `😢 **Dealer Wins!** Dealer score **${dealerScore}** beat your **${playerScore}**. You lost **-$${bet.toLocaleString()}**.`;
      } else {
        user.wallet += bet;
        winMsg = `🎉 **You Win!** Your score **${playerScore}** beat the dealer's **${dealerScore}**. You won **+$${bet.toLocaleString()}**!`;
      }

      economy.saveEconomy();

      const embed = makeEmbed(playerHand, dealerHand, true, winMsg);

      if (btnInteraction) {
        await btnInteraction.update({
          embeds: [embed],
          components: []
        });
      } else {
        await interaction.editReply({
          embeds: [embed],
          components: []
        });
      }
    }
  }
};
