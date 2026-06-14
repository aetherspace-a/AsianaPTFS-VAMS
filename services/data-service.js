// ============================================================
//  services/data-service.js  –  Unified Data Management
//  Manages Flights, Staff, and Bookings for both Web and Bot.
// ============================================================

const dataManager = require('../data-manager');

// Initial defaults
let FLIGHTS = [
  { id: 'OZ101', origin: 'ICN', destination: 'FRA', departureTime: '2026-06-20T20:00:00Z', totalSeats: 60, bookedSeats: [], createdBy: null },
  { id: 'OZ210', origin: 'FUK', destination: 'ICN', departureTime: '2026-06-21T12:00:00Z', totalSeats: 48, bookedSeats: [], createdBy: null },
  { id: 'OZ250', origin: 'ITKO', destination: 'IMLR', departureTime: '2026-06-22T20:00:00Z', totalSeats: 60, bookedSeats: [], createdBy: null },
];
let staff = [];
let flightBookings = [];

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
      console.log('[data-service] Loaded persisted data from data.json');
    }
  } catch (e) {
    console.warn('[data-service] load error:', e.message || e);
  }
}

// Save all data
function save() {
  dataManager.saveData({ FLIGHTS, staff, flightBookings });
}

// Initial load
load();

module.exports = {
  // Flights
  getFlights: () => FLIGHTS,
  getFlightById: (id) => FLIGHTS.find(f => f.id === id),
  addFlight: (flight) => {
    FLIGHTS.push(flight);
    save();
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
  
  // Re-expose internal arrays for legacy compatibility if needed
  _internal: { FLIGHTS, staff, flightBookings },
  
  // Refresh from disk
  refresh: load
};
