// ============================================================
//  auth-routes.js  –  Discord OAuth2 + API Routes
//
//  Import and call registerOAuthRoutes(app) in index.js
//  BEFORE app.use(express.static(...)) and app.listen().
// ============================================================

require("dotenv").config();
const axios   = require("axios");
const session = require("express-session");
const dataManager = require('./data-manager');
const dataService = require('./services/data-service');

const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(",") : [];

// ── DESTINATIONS ─────────────────────────────────────
const DESTINATIONS = [
  { code: "IBAR", name: "Barra Airport" },
  { code: "IRFD", name: "Greater Rockford" },
  { code: "IZOL", name: "Izolirani Int'l" },
  { code: "IKFL", name: "Keflavik Airport" },
  { code: "ILAR", name: "Larnaca Int'l" },
  { code: "IMLR", name: "Mellor Int'l" },
  { code: "IPPH", name: "Perth Int'l" },
  { code: "IBTH", name: "Saint Barthélemy" },
  { code: "ISAU", name: "Sauthemptona" },
  { code: "ITKO", name: "Tokyo Int'l" },
];

// ── Helper functions for in-process use (Discord commands can call these) ─
function isAdminId(id) {
  if (!id) return false;
  const idStr = String(id).trim();
  const isEnvAdmin = ADMIN_IDS.length && ADMIN_IDS.map(x => String(x).trim()).includes(idStr);
  const isStaffAdmin = dataService.getStaff().some(s => s.id && String(s.id).trim() === idStr && s.role && s.role.toLowerCase() === 'admin');
  return !!(isEnvAdmin || isStaffAdmin);
}

function isStaffMemberId(id) {
  if (!id) return false;
  const idStr = String(id).trim();
  const isStaff = dataService.getStaff().some(s => s.id && String(s.id).trim() === idStr && (s.role && ['pilot', 'staff', 'admin'].includes(s.role.toLowerCase())));
  return !!(isStaff || isAdminId(idStr));
}

function createFlightEntry({ id, origin, destination, departureTime, totalSeats, createdBy }) {
  if (!id || !origin || !destination || !departureTime) throw new Error('Missing required flight fields');
  if (dataService.getFlightById(id)) throw new Error('Flight id exists');

  const parsedDeparture = new Date(departureTime);
  if (Number.isNaN(parsedDeparture.getTime())) throw new Error('Invalid departureTime');
  const departureIso = parsedDeparture.toISOString();

  const flight = {
    id,
    origin,
    destination,
    departureTime: departureIso,
    totalSeats: totalSeats || 60,
    bookedSeats: [],
    createdBy: createdBy || null,
    createdAt: new Date().toISOString(),
  };
  dataService.addFlight(flight);
  return flight;
}

function registerOAuthRoutes(app, client) {

  // ── API: Finance Stats ─────────────────────────────────────
  app.get("/api/finance", (req, res) => {
    res.json(dataService.getFinance());
  });

  // ── API: Fleet Data ────────────────────────────────────────
  app.get("/api/fleet", (req, res) => {
    res.json({ fleet: dataService.getFleet() });
  });

  // ── API: book a flight ────────────────────────────────────
  app.post("/api/book", requireAuth, (req, res) => {
    const { flightId, seatId, passengerName, robloxUsername, discordId, destination } = req.body;

    // Option A: booking against master flight schedule
    if (flightId || seatId) {
      if (!flightId) return res.status(400).json({ error: 'flightId is required' });
      if (!seatId) return res.status(400).json({ error: 'seatId is required' });

      const flight = dataService.getFlightById(flightId);
      if (!flight) return res.status(400).json({ error: 'Unknown flightId' });

      // Check seat occupancy
      if (flight.bookedSeats.includes(seatId)) {
        return res.status(409).json({ error: 'Seat already taken' });
      }

      // Reserve seat
      flight.bookedSeats.push(seatId);

      const booking = {
        id: `bk_${Date.now()}`,
        userId: req.session.user.id,
        username: req.session.user.username,
        passengerName: passengerName || req.session.user.username,
        robloxUsername: robloxUsername || null,
        discordId: discordId || req.session.user.id,
        seat: seatId,
        flightId: flight.id,
        flightNumber: flight.id,
        destination: flight.destination,
        destName: flight.destination,
        status: 'Scheduled',
        bookedAt: new Date().toISOString(),
      };

      dataService.addBooking(booking);
      
      // Add revenue and miles
      dataService.addRevenue(250); // $250 per booking
      dataService.addMiles(1200);   // 1200 miles per booking

      console.log(`✈️  New booking: ${flight.id} seat ${seatId} by @${booking.username}`);

      return res.status(201).json({ booking });
    }

    // Option B: legacy booking by destination (keeps backward compatibility)
    if (destination) {
      const dest = DESTINATIONS.find(d => d.code === destination);
      if (!dest) return res.status(400).json({ error: 'Unknown destination code' });
      const flightNumber = `OZ${Math.floor(1000 + Math.random() * 9000)}`;
      const booking = {
        id: `bk_${Date.now()}`,
        userId: req.session.user.id,
        username: req.session.user.username,
        passengerName: passengerName || req.session.user.username,
        robloxUsername: robloxUsername || null,
        discordId: discordId || req.session.user.id,
        seat: null,
        flightNumber,
        destination: dest.code,
        destName: dest.name,
        status: 'Scheduled',
        bookedAt: new Date().toISOString(),
      };
      dataService.addBooking(booking);
      console.log(`✈️  New booking: ${flightNumber} → ${dest.name} by @${booking.username}`);
      return res.status(201).json({ booking });
    }

    return res.status(400).json({ error: 'flightId/seatId or destination required' });
  });

  // ── API: list all bookings (admin only) ───────────────────
  app.get('/api/bookings', requireAuth, requireAdmin, (req, res) => {
    res.json({ bookings: dataService.getBookings() });
  });

  // ── Admin guard ─────────────────────────────────────────
  function requireAdmin(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
    if (!isAdminId(req.session.user.id)) return res.status(403).json({ error: "Admin only" });
    next();
  }

  // ── Staff guard ─────────────────────────────────────────
  function requireStaff(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
    if (!isStaffMemberId(req.session.user.id)) return res.status(403).json({ error: "Staff only" });
    next();
  }

  // ── Create flight (staff-only) ──────────────────────────
  app.post('/api/flights', requireAuth, requireStaff, async (req, res) => {
    try {
      const flight = createFlightEntry({ ...req.body, createdBy: req.session.user.id });
      console.log(`🆕 Flight created by ${req.session.user.username}: ${flight.id} → ${flight.destination}`);

      // Auto-announce to Discord
      try {
        const { sendAnnouncement } = require("./commands/announce");
        const msg = `✈️ **New Flight Scheduled**\n\n**Flight:** ${flight.id}\n**Route:** ${flight.origin} → ${flight.destination}\n**Departure:** ${new Date(flight.departureTime).toUTCString()}\n**Aircraft:** ${flight.aircraft || 'TBA'}${flight.codeshare ? `\n**Codeshare:** ${flight.codeshare}` : ''}`;
        await sendAnnouncement(client, msg, req.session.user.username);
      } catch (annErr) { console.error("Announcement failed:", annErr); }

      res.status(201).json({ flight });
    } catch (err) {
      const msg = err.message || 'Invalid flight';
      if (msg.includes('exists')) return res.status(409).json({ error: msg });
      return res.status(400).json({ error: msg });
    }
  });

  // ── Update flight status (staff-only) ──────────────────
  app.patch('/api/flights/:id/status', requireAuth, requireStaff, async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const flight = dataService.updateFlightStatus(req.params.id, status);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });

    console.log(`🔄 Flight ${flight.id} status updated to ${status} by ${req.session.user.username}`);

    // Auto-announce status change
    try {
      const { sendAnnouncement } = require("./commands/announce");
      let statusEmoji = "ℹ️";
      if (status === 'Boarding') statusEmoji = "🛫";
      if (status === 'Departed') statusEmoji = "☁️";
      if (status === 'Arrived') statusEmoji = "🛬";
      if (status === 'Delayed') statusEmoji = "⚠️";
      if (status === 'Cancelled') statusEmoji = "❌";

      const msg = `${statusEmoji} **Flight Status Update**\n\n**Flight:** ${flight.id}\n**New Status:** ${status}\n**Route:** ${flight.origin} → ${flight.destination}`;
      await sendAnnouncement(client, msg, req.session.user.username);
    } catch (annErr) { console.error("Announcement failed:", annErr); }

    res.json({ flight });
  });

  // ── Delete flight (staff-only) ──────────────────────────
  app.delete('/api/flights/:id', requireAuth, requireStaff, (req, res) => {
    const flight = dataService.getFlightById(req.params.id);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });

    dataService.removeFlight(req.params.id);
    // Cleanup bookings for this flight
    const beforeCount = dataService.getBookings().length;
    dataService._internal.flightBookings = dataService.getBookings().filter(b => b.flightNumber !== flight.id);
    const removedBookings = beforeCount - dataService.getBookings().length;
    dataService.save();

    console.log(`🗑️ Flight deleted by ${req.session.user.username}: ${flight.id} (${removedBookings} related booking(s) removed)`);
    res.json({ ok: true });
  });
  // ── API: list staff ─────────────────────────────────────
  app.get('/api/staff', (req, res) => {
    res.json({ staff: dataService.getStaff() });
  });

  // ── Export helpers for in-process usage (discord commands)
  // Note: exported later via module.exports

  // ── API: add staff (admin only) ──────────────────────────
  app.post('/api/staff', requireAuth, requireAdmin, (req, res) => {
    const { id, username, role } = req.body;
    if (!id || !username || !role) return res.status(400).json({ error: 'id, username and role are required' });
    const exists = dataService.getStaffById(id);
    if (exists) return res.status(409).json({ error: 'Staff member already exists' });
    const entry = { id, username, role };
    dataService.addStaff(entry);
    console.log(`👥 Added staff: ${username} (${role})`);
    res.status(201).json({ staff: entry });
  });

  // ── API: remove staff (admin only) ───────────────────────
  app.delete('/api/staff/:id', requireAuth, requireAdmin, (req, res) => {
    const removed = dataService.removeStaff(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Not found' });
    console.log(`🗑️ Removed staff: ${removed.username}`);
    res.json({ ok: true });
  });

  console.log("🔐 Discord OAuth2 routes registered.");
  }

  module.exports = {
  registerOAuthRoutes,
  // Staff management helpers for Discord commands
  addStaff: async ({ id, username, role }) => {
    const exists = dataService.getStaffById(id);
    if (exists) throw new Error("User already has staff access");
    const entry = { id, username, role: role.toLowerCase() };
    dataService.addStaff(entry);
    return entry;
  },
  removeStaff: async (userId) => {
    const removed = dataService.removeStaff(userId);
    if (!removed) throw new Error("Staff member not found");
    return removed;
  },
  getStaff: () => dataService.getStaff(),
  // helpers for in-process usage
  createFlight: createFlightEntry,
  isStaff: isStaffMemberId,
  isAdmin: isAdminId,
  _internal: dataService._internal,
  };