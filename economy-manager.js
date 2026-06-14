// ============================================================
//  economy-manager.js  –  Asiana Airlines PTFS Economy System Core
//  Manages persistence, balances, cooldowns, jobs, shop and items.
// ============================================================

const fs = require('fs');
const path = require('path');

const ECONOMY_FILE = path.join(__dirname, 'economy.json');

// --- Global In-Memory Store ---
let economyData = {};

// --- Shop Items Definitions ---
const SHOP_ITEMS = {
  coffee: {
    id: 'coffee',
    name: '☕ Premium Coffee',
    price: 150,
    description: 'Boosts next 3 work payouts by 1.5x and removes all failure rates.',
    sellPrice: 75,
    usable: true,
    emoji: '☕'
  },
  padlock: {
    id: 'padlock',
    name: '🔒 Security Padlock',
    price: 300,
    description: 'Protects wallet from one rob attempt. Consumed automatically upon defense.',
    sellPrice: 150,
    usable: false,
    emoji: '🔒'
  },
  lucky_charm: {
    id: 'lucky_charm',
    name: '🍀 Lucky Aviation Charm',
    price: 600,
    description: 'Passively increases slots and coinflip win rates by 5%. Max 1 in backpack.',
    sellPrice: 300,
    usable: false,
    emoji: '🍀'
  },
  bank_card: {
    id: 'bank_card',
    name: '💳 Gold Sky Bank Card',
    price: 1500,
    description: 'Permanently increases your bank space by $10,000 when used.',
    sellPrice: 750,
    usable: true,
    emoji: '💳'
  },
  vip_pass: {
    id: 'vip_pass',
    name: '🎫 First-Class VIP Ticket',
    price: 2500,
    description: 'Provides a passive 10% discount on all shop purchases.',
    sellPrice: 1250,
    usable: false,
    emoji: '🎫'
  },
  wings_trophy: {
    id: 'wings_trophy',
    name: '🏆 Golden Wings Trophy',
    price: 10000,
    description: 'The ultimate luxury collectible. Displays a gold wing status on profile.',
    sellPrice: 5000,
    usable: false,
    emoji: '🏆'
  }
};

// --- Jobs Definitions ---
const JOBS = {
  baggage: {
    id: 'baggage',
    name: '🧳 Baggage Handler',
    minLevel: 1,
    payoutMin: 100,
    payoutMax: 150,
    failChance: 0.1,
    failMessages: [
      'You dropped a heavy suitcase and had to pay for damages.',
      'You loaded bags onto the wrong flight and got reprimanded.',
      'You fell asleep in the cargo hold. No pay.'
    ]
  },
  attendant: {
    id: 'attendant',
    name: '💁 Flight Attendant',
    minLevel: 2,
    payoutMin: 200,
    payoutMax: 300,
    failChance: 0.12,
    failMessages: [
      'You spilled tomato juice on a first-class passenger.',
      'You forgot to lock the galley cart during turbulence.',
      'You did not show up for the pre-flight briefing.'
    ]
  },
  dispatcher: {
    id: 'dispatcher',
    name: '📡 Flight Dispatcher',
    minLevel: 5,
    payoutMin: 450,
    payoutMax: 600,
    failChance: 0.15,
    failMessages: [
      'You calculated the fuel load incorrectly. The flight had to divert.',
      'You mixed up the flight routes for two narrowbody jets.',
      'You misread the weather report and caused a flight delay.'
    ]
  },
  officer: {
    id: 'officer',
    name: '✈️ First Officer',
    minLevel: 8,
    payoutMin: 750,
    payoutMax: 1000,
    failChance: 0.18,
    failMessages: [
      'You landed too hard and blew a tire on the Airbus A321.',
      'You forgot to turn on the seatbelt sign during severe chop.',
      'You failed your simulator check ride.'
    ]
  },
  captain: {
    id: 'captain',
    name: '👨‍✈️ Airline Captain',
    minLevel: 12,
    payoutMin: 1200,
    payoutMax: 1800,
    failChance: 0.2,
    failMessages: [
      'You taxiied into a grass field at Mellor International.',
      'You failed to follow ATC instructions and received a violation.',
      'You forgot to set parking brakes, and the plane rolled into a tug.'
    ]
  },
  controller: {
    id: 'controller',
    name: '🎛️ Air Traffic Controller',
    minLevel: 16,
    payoutMin: 2000,
    payoutMax: 3000,
    failChance: 0.22,
    failMessages: [
      'You allowed two Boeing 777s to get too close on approach.',
      'You cleared a flight to land on an occupied runway.',
      'You fell asleep at the radar screen during the night shift.'
    ]
  }
};

// --- Core DB Load & Save ---
function loadEconomy() {
  try {
    if (fs.existsSync(ECONOMY_FILE)) {
      const raw = fs.readFileSync(ECONOMY_FILE, 'utf8');
      economyData = JSON.parse(raw);
    } else {
      economyData = {};
      saveEconomy();
    }
  } catch (err) {
    console.error('[economy-manager] Load error:', err);
    economyData = {};
  }
}

function saveEconomy() {
  const tmpFile = `${ECONOMY_FILE}.tmp`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(economyData, null, 2), 'utf8');
    fs.renameSync(tmpFile, ECONOMY_FILE);
  } catch (err) {
    console.error('[economy-manager] Save error:', err);
  }
}

// Initialize economy data on import
loadEconomy();

// --- Helper Operations ---

function getUser(userId, username = 'Unknown') {
  if (!economyData[userId]) {
    economyData[userId] = {
      userId,
      username,
      wallet: 1000, // starting balance
      bank: 0,
      bankSpace: 5000, // starting bank capacity
      inventory: {},
      cooldowns: {
        daily: 0,
        work: 0,
        beg: 0,
        rob: 0
      },
      job: null,
      xp: 0,
      level: 1,
      streak: 0,
      lastDaily: 0,
      workBooster: 0, // Coffee booster counters (number of shifts left)
      gambleBooster: false // lucky charm status (synced from inventory)
    };
    saveEconomy();
  } else {
    // In case user profile has missing keys due to future updates
    const u = economyData[userId];
    if (u.wallet === undefined) u.wallet = 1000;
    if (u.bank === undefined) u.bank = 0;
    if (u.bankSpace === undefined) u.bankSpace = 5000;
    if (!u.inventory) u.inventory = {};
    if (!u.cooldowns) u.cooldowns = { daily: 0, work: 0, beg: 0, rob: 0 };
    if (u.xp === undefined) u.xp = 0;
    if (u.level === undefined) u.level = 1;
    if (u.streak === undefined) u.streak = 0;
    if (u.lastDaily === undefined) u.lastDaily = 0;
    if (u.workBooster === undefined) u.workBooster = 0;
    if (u.gambleBooster === undefined) u.gambleBooster = false;
    
    // Sync gamble booster based on inventory presence
    u.gambleBooster = !!(u.inventory['lucky_charm'] && u.inventory['lucky_charm'] > 0);
  }
  return economyData[userId];
}

// Safely modify user values
function updateWallet(userId, amount) {
  const user = getUser(userId);
  user.wallet = Math.max(0, user.wallet + amount);
  saveEconomy();
  return user;
}

function updateBank(userId, amount) {
  const user = getUser(userId);
  user.bank = Math.max(0, user.bank + amount);
  saveEconomy();
  return user;
}

// Add/Remove Inventory Items
function addItem(userId, itemId, quantity = 1) {
  if (quantity <= 0) return;
  const user = getUser(userId);
  if (!SHOP_ITEMS[itemId]) return;
  
  if (!user.inventory[itemId]) {
    user.inventory[itemId] = 0;
  }
  user.inventory[itemId] += quantity;
  
  // Sync passive boosters
  if (itemId === 'lucky_charm') {
    user.gambleBooster = true;
  }
  
  saveEconomy();
}

function removeItem(userId, itemId, quantity = 1) {
  if (quantity <= 0) return false;
  const user = getUser(userId);
  if (!user.inventory[itemId] || user.inventory[itemId] < quantity) return false;
  
  user.inventory[itemId] -= quantity;
  if (user.inventory[itemId] <= 0) {
    delete user.inventory[itemId];
  }
  
  // Sync passive boosters
  if (itemId === 'lucky_charm') {
    user.gambleBooster = !!(user.inventory['lucky_charm'] && user.inventory['lucky_charm'] > 0);
  }
  
  saveEconomy();
  return true;
}

// XP and Level-up helper
function addXP(userId, amount) {
  const user = getUser(userId);
  user.xp += amount;
  let leveledUp = false;
  
  // Level Formula: level * 100 XP required
  while (user.xp >= user.level * 100) {
    user.xp -= user.level * 100;
    user.level += 1;
    user.bankSpace += 1000; // bonus bank space per level
    leveledUp = true;
  }
  
  saveEconomy();
  return leveledUp;
}

// Check if user has First-Class VIP Ticket for discount
function hasVipDiscount(userId) {
  const user = getUser(userId);
  return !!(user.inventory['vip_pass'] && user.inventory['vip_pass'] > 0);
}

module.exports = {
  SHOP_ITEMS,
  JOBS,
  economyData,
  getUser,
  updateWallet,
  updateBank,
  addItem,
  removeItem,
  addXP,
  hasVipDiscount,
  saveEconomy,
  loadEconomy
};
