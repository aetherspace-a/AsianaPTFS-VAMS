// ============================================================
//  services/data-service.js  –  Unified Data Management
//  Manages Flights, Staff, and Bookings for both Web and Bot.
// ============================================================

const dataManager = require('../data-manager');

// Initial defaults
let FLIGHTS = [
  { id: 'OZ101', origin: 'ICN', destination: 'FRA', departureTime: '2026-06-20T20:00:00Z', totalSeats: 60, bookedSeats: [], createdBy: null, status: 'Scheduled', aircraft: 'Airbus A350-900', codeshare: 'LH738' },
  { id: 'OZ210', origin: 'FUK', destination: 'ICN', departureTime: '2026-06-21T12:00:00Z', totalSeats: 48, bookedSeats: [], createdBy: null, status: 'Scheduled', aircraft: 'Airbus A321neo', codeshare: 'NH6972' },
  { id: 'OZ250', origin: 'ITKO', destination: 'IMLR', departureTime: '2026-06-22T20:00:00Z', totalSeats: 60, bookedSeats: [], createdBy: null, status: 'Scheduled', aircraft: 'Boeing B777-200ER', codeshare: null },
];

const FLEET = [
  { id: 'a321-200', name: 'Airbus A321-200', type: 'Classic Narrowbody', description: 'Reliable short-haul operations with classic performance.', image: 'https://cdn.plnspttrs.net/15354/hl8038-asiana-airlines-airbus-a321-231-wl_PlanespottersNet_1866194_5a8c78b6b1_o.jpg', seats: 42 },
  { id: 'a321neo', name: 'Airbus A321neo', type: 'Next-Gen Narrowbody', description: 'Ultra-efficient regional operations with modern tech.', image: 'https://cdn.plnspttrs.net/27017/hl8364-asiana-airlines-airbus-a321-251nx_PlanespottersNet_1897259_8899755984_o.jpg', seats: 48 },
  { id: 'a330-300', name: 'Airbus A330-300', type: 'Versatile Mid-Haul', description: 'High-demand regional and medium-haul backbone.', image: 'https://cdn.plnspttrs.net/30449/hl7792-asiana-airlines-airbus-a330-323_PlanespottersNet_1926955_55c7fc2180_o.jpg', seats: 54 },
  { id: 'a350-900', name: 'Airbus A350-900', type: 'Modern Long-Haul', description: 'State-of-the-art efficiency for intercontinental routes.', image: 'https://cdn.plnspttrs.net/40206/hl8522-asiana-airlines-airbus-a350-941_PlanespottersNet_1930033_bb310fe3ea_o.jpg', seats: 60 },
  { id: 'b777-200er', name: 'Boeing B777-200ER', type: 'Long-Haul Standard', description: 'Reliable transoceanic workhorse with proven comfort.', image: 'https://cdn.plnspttrs.net/48020/hl7755-asiana-airlines-boeing-777-28eer_PlanespottersNet_1925950_d87468447c_o.jpg', seats: 56 },
  { id: 'a380-800', name: 'Airbus A380-800', type: 'Premium Ultra-Long-Haul', description: 'The flagship of the fleet. Unmatched capacity and luxury.', image: 'https://cdn.plnspttrs.net/26228/hl7634-asiana-airlines-airbus-a380-841_PlanespottersNet_1927063_2b3cb05c46_o.jpg', seats: 80 },
];

let staff = [];
let flightBookings = [];
let tickets = [];
let botConfig = {
  announcementChannel: '',
  logChannel: '',
  ticketCategory: '',
  staffRole: '',
  adminRole: '',
  ticketWelcomeMessage: 'Welcome to Asiana Airlines Support. Our staff will be with you shortly.',
  ticketPanels: [
    { id: 'general', name: 'General Support', description: 'General inquiries and airline information.', icon: '🎫' },
    { id: 'staff', name: 'Staff Application', description: 'Inquiries regarding recruitment and role applications.', icon: '🛡️' },
    { id: 'report', name: 'Report a Pilot', description: 'File a report regarding flight safety or conduct.', icon: '⚠️' }
  ],
  templates: {
    new: {
        title: '🆕 New Flight Scheduled: {id}',
        description: 'Asiana Airlines has scheduled a new operation.\n\n**Route:** {origin} → {destination}\n**Departure:** {time}\n**Aircraft:** {aircraft}\n\nReserve your seat on the website now!'
    },
    boarding: {
        title: '🛫 Now Boarding: {id}',
        description: 'Passengers for flight **{id}** to **{destination}** may now begin boarding at the gate.\n\n**Aircraft:** {aircraft}\n**Gate:** {origin} Terminal'
    },
    departed: {
        title: '☁️ Flight Departed: {id}',
        description: 'Flight **{id}** has departed from **{origin}** and is now en-route to **{destination}**.\n\n*Beautiful People, Beautiful Skies.*'
    },
    arrived: {
        title: '🛬 Flight Arrived: {id}',
        description: 'Flight **{id}** has safely landed at **{destination}**. Thank you for flying with Asiana Airlines.'
    },
    delayed: {
        title: '⚠️ Flight Delayed: {id}',
        description: 'Flight **{id}** to **${destination}** has been delayed due to operational requirements. We apologize for the inconvenience.'
    },
    open: {
        title: '✈️ Server Opened: {id}',
        description: '## 🛫 Server Opened\n\n> Please proceed to the gate assigned by the VAMS System. If you booked through our website, you may also check in using /checkin [booking_ref], replacing [booking_ref] with the booking reference found on your ticket.\n> \n> If you did not book through the website, please proceed to the check-in counters at your departure airport.\n> \n> Thank you for choosing Asiana Airlines PTFS. We wish you a pleasant flight.',
        image: 'https://cdn.discordapp.com/attachments/1507766955250155561/1514603195995783218/Untitled_design_2.png?ex=6a2bf7a5&is=6a2aa625&hm=7fafd9d9484c3f7826742c48eff7614c95e2979c0f63de33759ac95c2b9bc29c&',
        color: '#E74C3C',
        buttonLabel: 'Join Server by pressing this link.',
        buttonUrl: 'https://roblox.com/discover#/rg-join/20321167/b99790d0-c722-473d-ab24-80b5032d517d'
    }
  },
  embedDefaults: {
    color: '#ff3b30',
    footer: 'Asiana Airlines PTFS • "Beautiful People"',
    thumbnail: 'https://cdn.discordapp.com/attachments/1507235764126093453/1510130338637025300/020560.KS_1.png'
  }
};
let finance = {
  totalRevenue: 125400,
  totalMiles: 842000,
  lastUpdated: new Date().toISOString()
};

// Load persisted data
function load() {
  try {
    const persisted = dataManager.loadData();
    if (persisted) {
      if (Array.isArray(persisted.FLIGHTS)) {
        FLIGHTS.splice(0, FLIGHTS.length, ...persisted.FLIGHTS);
      }
      if (Array.isArray(persisted.staff)) {
        staff.splice(0, staff.length, ...persisted.staff);
      }
      if (Array.isArray(persisted.flightBookings)) {
        flightBookings.splice(0, flightBookings.length, ...persisted.flightBookings);
      }
      if (Array.isArray(persisted.tickets)) {
        tickets.splice(0, tickets.length, ...persisted.tickets);
      }
      if (persisted.botConfig) {
        botConfig = { ...botConfig, ...persisted.botConfig };
      }
      if (persisted.finance) finance = persisted.finance;
      console.log('[data-service] Loaded persisted data from data.json');
    }
  } catch (e) {
    console.warn('[data-service] load error:', e.message || e);
  }
}

// Save all data
function save() {
  dataManager.saveData({ FLIGHTS, staff, flightBookings, finance, tickets, botConfig });
}

// Initial load
load();

function isAdminId(id) {
  if (!id) return false;
  const idStr = String(id).trim();
  const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(",") : [];
  const isEnvAdmin = ADMIN_IDS.length && ADMIN_IDS.map(x => String(x).trim()).includes(idStr);
  const isStaffAdmin = staff.some(s => s.id && String(s.id).trim() === idStr && s.role && s.role.toLowerCase() === 'admin');
  return !!(isEnvAdmin || isStaffAdmin);
}

function isStaffMemberId(id) {
  if (!id) return false;
  const idStr = String(id).trim();
  const isStaff = staff.some(s => s.id && String(s.id).trim() === idStr && (s.role && ['pilot', 'staff', 'admin'].includes(s.role.toLowerCase())));
  return !!(isStaff || isAdminId(idStr));
}

module.exports = {
  isAdmin: isAdminId,
  isStaff: isStaffMemberId,
  // Flights
  getFlights: () => FLIGHTS,
  getFlightById: (id) => FLIGHTS.find(f => f.id === id),
  addFlight: (flight) => {
    if (!flight.status) flight.status = 'Scheduled';
    FLIGHTS.push(flight);
    save();
  },
  updateFlightStatus: (id, status) => {
    const flight = FLIGHTS.find(f => f.id === id);
    if (flight) {
      flight.status = status;
      save();
      return flight;
    }
    return null;
  },
  removeFlight: (id) => {
    const idx = FLIGHTS.findIndex(f => f.id === id);
    if (idx !== -1) {
      const removed = FLIGHTS.splice(idx, 1)[0];
      save();
      return removed;
    }
    return null;
  },

  // Fleet
  getFleet: () => FLEET,

  // Finance
  getFinance: () => finance,
  addRevenue: (amount) => {
    finance.totalRevenue += amount;
    finance.lastUpdated = new Date().toISOString();
    save();
  },
  addMiles: (miles) => {
    finance.totalMiles += miles;
    finance.lastUpdated = new Date().toISOString();
    save();
  },

  // Staff
  getStaff: () => staff,
  getStaffById: (id) => staff.find(s => s.id === id),
  addStaff: (entry) => {
    staff.push(entry);
    save();
  },
  removeStaff: (id) => {
    const idx = staff.findIndex(s => s.id === id);
    if (idx !== -1) {
      const removed = staff.splice(idx, 1)[0];
      save();
      return removed;
    }
    return null;
  },

  // Bookings
  getBookings: () => flightBookings,
  addBooking: (booking) => {
    flightBookings.push(booking);
    save();
  },

  // Tickets
  getTickets: () => tickets,
  addTicket: (ticket) => {
    tickets.push(ticket);
    save();
  },
  updateTicket: (id, updates) => {
    const idx = tickets.findIndex(t => t.id === id);
    if (idx !== -1) {
      tickets[idx] = { ...tickets[idx], ...updates };
      save();
      return tickets[idx];
    }
    return null;
  },

  // Bot Config
  getConfig: () => botConfig,
  updateConfig: (updates) => {
    botConfig = { ...botConfig, ...updates };
    save();
    return botConfig;
  },
  
  // Re-expose internal arrays for legacy compatibility if needed
  _internal: { FLIGHTS, staff, flightBookings, tickets, botConfig },
  
  // Refresh from disk
  refresh: load
};
