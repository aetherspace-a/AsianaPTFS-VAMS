// ============================================================
//  economy-routes.js  –  Express API Routes for Asiana Economy Club
//  Requires Express app instance. Called inside index.js.
// ============================================================

const economy = require('./economy-manager');

// --- Helper Auth Middleware ---
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Not authenticated with Discord. Please log in first." });
  }
  next();
}

function registerEconomyRoutes(app) {

  // 1. GET User Profile
  app.get('/api/economy/profile', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const username = req.session.user.username;
    const profile = economy.getUser(userId, username);
    
    // Add current shop items details for UI reference
    res.json({
      profile,
      jobs: economy.JOBS,
      shopItems: economy.SHOP_ITEMS
    });
  });

  // 2. CLAIM Daily Reward
  app.post('/api/economy/daily', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const user = economy.getUser(userId, req.session.user.username);
    
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const twoDays = 48 * 60 * 60 * 1000;
    const last = user.lastDaily || 0;

    if (now - last < oneDay) {
      const timeLeftMs = oneDay - (now - last);
      const hours = Math.floor(timeLeftMs / (60 * 60 * 1000));
      const minutes = Math.floor((timeLeftMs % (60 * 60 * 1000)) / (60 * 1000));
      return res.status(400).json({
        error: `Daily reward is on cooldown. Please wait ${hours}h ${minutes}m before claiming again.`
      });
    }

    // Reset streak if last claim was over 48h ago
    if (now - last > twoDays) {
      user.streak = 0;
    }

    user.streak += 1;
    const streakBonus = Math.min((user.streak - 1) * 25, 250); // cap streak bonus at $250
    const baseReward = 250;
    const totalPayout = baseReward + streakBonus;

    user.wallet += totalPayout;
    user.lastDaily = now;
    economy.saveEconomy();

    res.json({
      message: `🎉 You claimed your daily reward of **$${totalPayout}**! (Streak: ${user.streak} day${user.streak > 1 ? 's' : ''}${streakBonus > 0 ? `, including a $${streakBonus} streak bonus` : ''})`,
      payout: totalPayout,
      streak: user.streak,
      wallet: user.wallet
    });
  });

  // 3. RUN Work Shift
  app.post('/api/economy/work', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const user = economy.getUser(userId, req.session.user.username);

    if (!user.job) {
      return res.status(400).json({ error: "⚠️ You are currently unemployed. Please apply for an aviation job first." });
    }

    const now = Date.now();
    const workCooldown = 30 * 60 * 1000; // 30 minutes
    const last = user.cooldowns.work || 0;

    if (now - last < workCooldown) {
      const timeLeftMs = workCooldown - (now - last);
      const minutes = Math.floor(timeLeftMs / (60 * 1000));
      const seconds = Math.floor((timeLeftMs % (60 * 1000)) / 1000);
      return res.status(400).json({
        error: `Work shift is on cooldown. Please wait ${minutes}m ${seconds}s before working again.`
      });
    }

    const job = economy.JOBS[user.job];
    if (!job) {
      user.job = null;
      economy.saveEconomy();
      return res.status(400).json({ error: "Your job could not be verified. Resigned." });
    }

    // Check Coffee Booster
    const coffeeActive = user.workBooster > 0;
    if (coffeeActive) {
      user.workBooster -= 1;
    }

    // Determine success or failure
    const roll = Math.random();
    const isFailure = !coffeeActive && roll < job.failChance;

    if (isFailure) {
      user.cooldowns.work = now;
      economy.saveEconomy();
      
      const failMsg = job.failMessages[Math.floor(Math.random() * job.failMessages.length)];
      return res.json({
        success: false,
        message: `❌ Work shift failed! ${failMsg} You received no pay.`,
        wallet: user.wallet,
        cooldown: now + workCooldown
      });
    }

    // Calculate Payout
    const basePayout = Math.floor(Math.random() * (job.payoutMax - job.payoutMin + 1)) + job.payoutMin;
    const multiplier = coffeeActive ? 1.5 : 1.0;
    const finalPayout = Math.floor(basePayout * multiplier);

    // Add cash & XP
    user.wallet += finalPayout;
    user.cooldowns.work = now;
    
    const xpGained = Math.floor(Math.random() * 16) + 10; // 10-25 XP
    const leveledUp = economy.addXP(userId, xpGained);

    let message = `💼 Worked shift as **${job.name}** and earned **$${finalPayout}**! (+${xpGained} XP)`;
    if (coffeeActive) {
      message += ` (☕ Coffee Booster Active - 1.5x payout multiplier! ${user.workBooster} shift${user.workBooster !== 1 ? 's' : ''} left)`;
    }
    if (leveledUp) {
      message += ` \n\n🎉 **LEVEL UP!** You reached **Level ${user.level}**! Your bank space increased by **$1,000**!`;
    }

    res.json({
      success: true,
      message,
      payout: finalPayout,
      wallet: user.wallet,
      xpGained,
      leveledUp,
      level: user.level,
      xp: user.xp,
      cooldown: now + workCooldown
    });
  });

  // 4. APPLY OR RESIGN JOB
  app.post('/api/economy/job', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const user = economy.getUser(userId, req.session.user.username);
    const { action, jobId } = req.body;

    if (action === 'resign') {
      if (!user.job) {
        return res.status(400).json({ error: "You do not have a job to resign from." });
      }
      const oldJobName = economy.JOBS[user.job].name;
      user.job = null;
      economy.saveEconomy();
      return res.json({ message: `Successfully resigned from your position as **${oldJobName}**.` });
    }

    if (action === 'apply') {
      if (!jobId || !economy.JOBS[jobId]) {
        return res.status(400).json({ error: "Invalid job selection." });
      }
      const targetJob = economy.JOBS[jobId];
      if (user.level < targetJob.minLevel) {
        return res.status(400).json({ error: `You must be at least **Level ${targetJob.minLevel}** to apply for **${targetJob.name}** (Current: Level ${user.level}).` });
      }

      user.job = jobId;
      economy.saveEconomy();
      return res.json({
        message: `🎉 Application approved! You are now employed as a **${targetJob.name}**!`,
        job: jobId
      });
    }

    return res.status(400).json({ error: "Invalid action." });
  });

  // 5. GET Shop Items
  app.get('/api/economy/shop', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const discount = economy.hasVipDiscount(userId);
    res.json({
      items: economy.SHOP_ITEMS,
      hasVipDiscount: discount
    });
  });

  // 6. BUY Item
  app.post('/api/economy/buy', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const user = economy.getUser(userId, req.session.user.username);
    const { itemId, quantity = 1 } = req.body;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "Quantity must be a positive integer." });
    }

    const item = economy.SHOP_ITEMS[itemId];
    if (!item) {
      return res.status(400).json({ error: "Item not found in the shop." });
    }

    // Limit lucky charm to 1
    if (itemId === 'lucky_charm' && user.inventory['lucky_charm'] >= 1) {
      return res.status(400).json({ error: "You can only carry one Lucky Aviation Charm at a time." });
    }

    // Payout and Discount calculation
    const basePrice = item.price * qty;
    const isVip = economy.hasVipDiscount(userId);
    const finalPrice = Math.floor(basePrice * (isVip ? 0.9 : 1.0));

    if (user.wallet < finalPrice) {
      return res.status(400).json({ error: `Insufficient cash. You need **$${finalPrice}** but only have **$${user.wallet}**.` });
    }

    user.wallet -= finalPrice;
    economy.addItem(userId, itemId, qty);

    res.json({
      message: `🛒 Successfully purchased **${qty}x ${item.name}** for **$${finalPrice}**!`,
      wallet: user.wallet,
      inventory: user.inventory
    });
  });

  // 7. SELL Item
  app.post('/api/economy/sell', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const user = economy.getUser(userId, req.session.user.username);
    const { itemId, quantity = 1 } = req.body;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "Quantity must be a positive integer." });
    }

    const item = economy.SHOP_ITEMS[itemId];
    if (!item) {
      return res.status(400).json({ error: "Item not found." });
    }

    if (!user.inventory[itemId] || user.inventory[itemId] < qty) {
      return res.status(400).json({ error: `You do not have enough **${item.name}** to sell.` });
    }

    const finalPayout = item.sellPrice * qty;
    economy.removeItem(userId, itemId, qty);
    user.wallet += finalPayout;
    economy.saveEconomy();

    res.json({
      message: `💰 Successfully sold **${qty}x ${item.name}** back to the shop for **$${finalPayout}**!`,
      wallet: user.wallet,
      inventory: user.inventory
    });
  });

  // 8. USE Item
  app.post('/api/economy/use', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const user = economy.getUser(userId, req.session.user.username);
    const { itemId } = req.body;

    const item = economy.SHOP_ITEMS[itemId];
    if (!item) return res.status(400).json({ error: "Item not found." });

    if (!user.inventory[itemId] || user.inventory[itemId] <= 0) {
      return res.status(400).json({ error: `You do not have a **${item.name}** in your backpack.` });
    }

    if (!item.usable) {
      return res.status(400).json({ error: `**${item.name}** is a passive item and cannot be consumed. Keep it in your backpack to gain its benefits!` });
    }

    if (itemId === 'coffee') {
      if (user.workBooster > 0) {
        return res.status(400).json({ error: "You already have active coffee energy! Complete your current coffee shifts first." });
      }
      economy.removeItem(userId, itemId, 1);
      user.workBooster = 3;
      economy.saveEconomy();
      return res.json({
        message: `☕ You drank **${item.name}**. Your next **3 work shifts** will have **1.5x payouts** and **0% failure rates**!`,
        inventory: user.inventory,
        workBooster: 3
      });
    }

    if (itemId === 'bank_card') {
      economy.removeItem(userId, itemId, 1);
      user.bankSpace += 10000;
      economy.saveEconomy();
      return res.json({
        message: `💳 You used the **${item.name}**. Your bank capacity has permanently increased by **+$10,000**!`,
        inventory: user.inventory,
        bankSpace: user.bankSpace
      });
    }

    return res.status(400).json({ error: "This item cannot be used." });
  });

  // 9. GET Leaderboard
  app.get('/api/economy/leaderboard', (req, res) => {
    const list = Object.keys(economy.economyData).map(uid => {
      const u = economy.economyData[uid];
      const jobDetails = economy.JOBS[u.job];
      const netWorth = u.wallet + u.bank;
      return {
        username: u.username,
        wallet: u.wallet,
        bank: u.bank,
        netWorth,
        level: u.level,
        jobName: jobDetails ? jobDetails.name : 'Unemployed'
      };
    });

    // Sort descending by networth
    list.sort((a, b) => b.netWorth - a.netWorth);

    // Return top 15
    res.json({ leaderboard: list.slice(0, 15) });
  });

  // 10. POST Gamble (Slots, Coinflip, Roulette)
  app.post('/api/economy/gamble', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const user = economy.getUser(userId, req.session.user.username);
    const { type, betAmount, choice } = req.body;

    const bet = parseInt(betAmount, 10);
    if (isNaN(bet) || bet <= 0) {
      return res.status(400).json({ error: "Bet amount must be a positive number." });
    }

    if (bet > user.wallet) {
      return res.status(400).json({ error: `Insufficient cash. You bet **$${bet}** but only have **$${user.wallet}** in your wallet.` });
    }

    // Limit maximum gamble to protect server economy
    const MAX_GAMBLE = 10000;
    if (bet > MAX_GAMBLE) {
      return res.status(400).json({ error: `Maximum gamble limit is **$${MAX_GAMBLE}**.` });
    }

    const hasLuckyCharm = !!(user.inventory['lucky_charm'] && user.inventory['lucky_charm'] > 0);

    // A. COINFLIP
    if (type === 'coinflip') {
      if (choice !== 'heads' && choice !== 'tails') {
        return res.status(400).json({ error: "Choose heads or tails." });
      }

      let winChance = 0.5;
      if (hasLuckyCharm) winChance = 0.55; // 5% passive boost

      const rolls = ['heads', 'tails'];
      let rolledFace = rolls[Math.floor(Math.random() * rolls.length)];
      
      // Let lucky charm change a loss into a win (adjusted win chance check)
      const playerWon = Math.random() < winChance;
      if (playerWon) {
        rolledFace = choice;
      } else {
        rolledFace = choice === 'heads' ? 'tails' : 'heads';
      }

      if (playerWon) {
        user.wallet += bet;
        economy.saveEconomy();
        return res.json({
          win: true,
          message: `🪙 The coin landed on **${rolledFace}**! You chose **${choice}** and won **+$${bet}**!${hasLuckyCharm ? ' (🍀 Lucky Charm applied)' : ''}`,
          rolled: rolledFace,
          payout: bet,
          wallet: user.wallet
        });
      } else {
        user.wallet -= bet;
        economy.saveEconomy();
        return res.json({
          win: false,
          message: `🪙 The coin landed on **${rolledFace}**! You chose **${choice}** and lost **-$${bet}**.`,
          rolled: rolledFace,
          payout: -bet,
          wallet: user.wallet
        });
      }
    }

    // B. SLOTS
    if (type === 'slots') {
      const symbols = ['✈️', '🚁', '🚀', '💎', '👑'];
      
      // Select 3 random symbols
      let roll1 = symbols[Math.floor(Math.random() * symbols.length)];
      let roll2 = symbols[Math.floor(Math.random() * symbols.length)];
      let roll3 = symbols[Math.floor(Math.random() * symbols.length)];

      let rollResult = [roll1, roll2, roll3];
      let win = false;
      let multiplier = 0;

      // Lucky charm adjustments: if player rolled a loss, 12% chance to reroll to a win
      if (hasLuckyCharm && (roll1 !== roll2 && roll2 !== roll3 && roll1 !== roll3)) {
        if (Math.random() < 0.12) {
          const matchSym = symbols[Math.floor(Math.random() * symbols.length)];
          roll1 = matchSym;
          roll2 = matchSym;
          // 50% chance for triple, 50% for double
          roll3 = Math.random() < 0.5 ? matchSym : symbols.find(s => s !== matchSym);
          rollResult = [roll1, roll2, roll3];
        }
      }

      // Check matches
      if (roll1 === roll2 && roll2 === roll3) {
        // Triple match
        win = true;
        if (roll1 === '👑') multiplier = 10;
        else if (roll1 === '💎') multiplier = 7;
        else if (roll1 === '🚀') multiplier = 5;
        else if (roll1 === '🚁') multiplier = 4;
        else multiplier = 3;
      } else if (roll1 === roll2 || roll2 === roll3 || roll1 === roll3) {
        // Double match
        win = true;
        multiplier = 1.5;
      }

      if (win) {
        const winAmount = Math.floor(bet * multiplier);
        // Net gain is winAmount - bet, wait, usually in slots if payout is 1.5x bet, net gain is 0.5x bet
        // So we add (winAmount - bet) or we payout winAmount if bet is already subtracted?
        // Since we did NOT subtract the bet yet, let's add (winAmount - bet) to their wallet!
        // E.g., user bets 100, wins 1.5x payout ($150). We add $50 to wallet.
        // E.g., user bets 100, wins 3x payout ($300). We add $200.
        // Wait, standard slots payouts are described as total return: "3x bet payout" means wallet grows by 2x.
        const netWinnings = winAmount - bet;
        user.wallet += netWinnings;
        economy.saveEconomy();

        return res.json({
          win: true,
          message: `🎰 **[ ${roll1} | ${roll2} | ${roll3} ]** \n\nMatched symbols! You won **+$${netWinnings}**! (${multiplier}x payout)${hasLuckyCharm ? ' (🍀 Lucky Charm applied)' : ''}`,
          rolls: rollResult,
          payout: netWinnings,
          wallet: user.wallet
        });
      } else {
        user.wallet -= bet;
        economy.saveEconomy();
        return res.json({
          win: false,
          message: `🎰 **[ ${roll1} | ${roll2} | ${roll3} ]** \n\nNo matches. You lost **-$${bet}**.`,
          rolls: rollResult,
          payout: -bet,
          wallet: user.wallet
        });
      }
    }

    // C. ROULETTE
    if (type === 'roulette') {
      const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
      const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
      const greenNumber = 0;

      const rolledNum = Math.floor(Math.random() * 37); // 0-36
      let rolledColor = 'black';
      if (rolledNum === 0) rolledColor = 'green';
      else if (redNumbers.includes(rolledNum)) rolledColor = 'red';

      let win = false;
      let multiplier = 0;

      const userChoice = typeof choice === 'string' ? choice.toLowerCase() : choice;

      if (userChoice === 'red' || userChoice === 'black' || userChoice === 'green') {
        if (rolledColor === userChoice) {
          win = true;
          multiplier = userChoice === 'green' ? 35 : 2;
        }
      } else {
        const choiceNum = parseInt(userChoice, 10);
        if (!isNaN(choiceNum) && choiceNum >= 0 && choiceNum <= 36) {
          if (rolledNum === choiceNum) {
            win = true;
            multiplier = 35;
          }
        } else {
          return res.status(400).json({ error: "Choose red, black, green or a number from 0-36." });
        }
      }

      if (win) {
        const netWinnings = (bet * multiplier) - bet;
        user.wallet += netWinnings;
        economy.saveEconomy();
        return res.json({
          win: true,
          message: `🎡 The wheel spun and landed on **${rolledNum} (${rolledColor.toUpperCase()})**! You won **+$${netWinnings}**! (Multiplier: ${multiplier}x)`,
          rolledNum,
          rolledColor,
          payout: netWinnings,
          wallet: user.wallet
        });
      } else {
        user.wallet -= bet;
        economy.saveEconomy();
        return res.json({
          win: false,
          message: `🎡 The wheel spun and landed on **${rolledNum} (${rolledColor.toUpperCase()})**! You lost **-$${bet}**.`,
          rolledNum,
          rolledColor,
          payout: -bet,
          wallet: user.wallet
        });
      }
    }

    return res.status(400).json({ error: "Invalid gamble type." });
  });

  console.log("💳 Economy system API routes registered.");
}

module.exports = { registerEconomyRoutes };
