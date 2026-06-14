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

// ── In-memory flight store (swap for a database later) ───────
let flightBookings = [];
// ── In-memory staff store (pilots, flight staff, admins) ────
let staff = [];
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(",") : [];

// ── Master flights schedule (Master Flight Model)
let FLIGHTS = [
  { id: 'OZ101', origin: 'ICN', destination: 'FRA', departureTime: '2026-06-20T20:00:00Z', totalSeats: 60, bookedSeats: [], createdBy: null },
  { id: 'OZ210', origin: 'FUK', destination: 'ICN', departureTime: '2026-06-21T12:00:00Z', totalSeats: 48, bookedSeats: [], createdBy: null },
  { id: 'OZ250', origin: 'ITKO', destination: 'IMLR', departureTime: '2026-06-22T20:00:00Z', totalSeats: 60, bookedSeats: [], createdBy: null },
];

// Auto-load persisted data (if present)
try {
  const persisted = dataManager.loadData();
  if (persisted) {
    if (Array.isArray(persisted.FLIGHTS)) FLIGHTS = persisted.FLIGHTS;
    if (Array.isArray(persisted.staff)) staff = persisted.staff;
    if (Array.isArray(persisted.flightBookings)) flightBookings = persisted.flightBookings;
    console.log('[data-manager] Loaded persisted data from data.json');
  }
} catch (e) {
  console.warn('[data-manager] load error:', e.message || e);
}

// ── PTFS destination list ─────────────────────────────────────
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
function isStaffMemberId(id) {
  return staff.findIndex(s => s.id === id) !== -1;
}

function isAdminId(id) {
  if (!ADMIN_IDS || !ADMIN_IDS.length) return false;
  return ADMIN_IDS.includes(id);
}

function createFlightEntry({ id, origin, destination, departureTime, totalSeats, createdBy }) {
  if (!id || !origin || !destination || !departureTime) throw new Error('Missing required flight fields');
  if (FLIGHTS.find(f => f.id === id)) throw new Error('Flight id exists');

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
  FLIGHTS.push(flight);
  try { dataManager.saveData({ FLIGHTS, staff, flightBookings }); } catch (e) { }
  return flight;
}

function registerOAuthRoutes(app) {

  // ── Session ───────────────────────────────────────────────
  app.use(session({
    secret: process.env.SESSION_SECRET || "asiana-ptfs-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,  // Change to true when deployed on HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  app.use(require("express").json());

  // ── Auth: redirect to Discord ─────────────────────────────
  app.get("/auth/discord", (req, res) => {
    const params = new URLSearchParams({
      client_id:     process.env.DISCORD_CLIENT_ID,
      redirect_uri:  process.env.DISCORD_REDIRECT_URI,
      response_type: "code",
      scope:         "identify",
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  });

  // ── Auth: Discord callback ────────────────────────────────
  app.get("/auth/discord/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect("/?error=no_code");

    try {
      const tokenRes = await axios.post(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id:     process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type:    "authorization_code",
          code,
          redirect_uri:  process.env.DISCORD_REDIRECT_URI,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const { access_token } = tokenRes.data;

      const userRes = await axios.get("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { id, username, avatar, discriminator } = userRes.data;

      req.session.user = {
        id,
        username,
        discriminator,
        avatar: avatar
          ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`
          : `https://cdn.discordapp.com/embed/avatars/${Number(discriminator) % 5}.png`,
      };

      res.redirect("/pilot.html");

    } catch (err) {
      console.error("[OAuth] Callback error:", err.response?.data || err.message);
      res.redirect("/?error=oauth_failed");
    }
  });

  // ── Auth: logout ──────────────────────────────────────────
  app.get("/auth/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
  });

  // ── Guard middleware ──────────────────────────────────────
  function requireAuth(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
    next();
  }

  // ── API: current user ─────────────────────────────────────
  app.get("/api/user", (req, res) => {
    if (!req.session.user) return res.status(401).json({ user: null });
    res.json({ user: req.session.user });
  });

  // ── API: check admin status ───────────────────────────────
  app.get("/api/check-admin", (req, res) => {
    if (!req.session.user) return res.status(401).json({ isAdmin: false });
    const isAdmin = ADMIN_IDS.length && ADMIN_IDS.includes(req.session.user.id);
    res.json({ isAdmin });
  });

  // ── API: check staff status ───────────────────────────────
  app.get("/api/check-staff", (req, res) => {
    if (!req.session.user) return res.status(401).json({ isStaff: false });
    const isStaff = staff.some(s => s.id === req.session.user.id);
    res.json({ isStaff });
  });

  // ── API: destinations ─────────────────────────────────────
  app.get("/api/destinations", (req, res) => {
    res.json({ destinations: DESTINATIONS });
  });

  // ── API: master flights list ──────────────────────────────
  app.get("/api/flights", (req, res) => {
    // Public view: only show flights created by staff. Admins see all.
    const userId = req.session?.user?.id;
    const isAdminUser = userId && ADMIN_IDS.length && ADMIN_IDS.includes(userId);
    if (isAdminUser) return res.json({ flights: FLIGHTS });
    const visible = FLIGHTS.filter(f => !!f.createdBy);
    res.json({ flights: visible });
  });

  // ── API: single flight by id ─────────────────────────────
  app.get('/api/flight/:id', (req, res) => {
    const f = FLIGHTS.find(x => x.id === req.params.id);
    if (!f) return res.status(404).json({ error: 'Flight not found' });
    // If flight wasn't created by staff, hide it from non-admins
    const userId = req.session?.user?.id;
    const isAdminUser = userId && ADMIN_IDS.length && ADMIN_IDS.includes(userId);
    if (!f.createdBy && !isAdminUser) return res.status(404).json({ error: 'Flight not found' });
    res.json({ flight: f });
  });

  // ── API: user's personal bookings ────────────────────────
  app.get('/api/mybookings', requireAuth, (req, res) => {
    const my = flightBookings.filter(f => f.userId === req.session.user.id);
    res.json({ bookings: my });
  });

  // ── API: book a flight ────────────────────────────────────
  app.post("/api/book", requireAuth, (req, res) => {
    const { flightId, seatId, passengerName, robloxUsername, discordId, destination } = req.body;

    // Option A: booking against master flight schedule
    if (flightId || seatId) {
      if (!flightId) return res.status(400).json({ error: 'flightId is required' });
      if (!seatId) return res.status(400).json({ error: 'seatId is required' });

      const flight = FLIGHTS.find(f => f.id === flightId);
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

      flightBookings.push(booking);
      // persist
      try { dataManager.saveData({ FLIGHTS, staff, flightBookings }); } catch (e) { /* already handled inside saveData */ }
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
      flightBookings.push(booking);
      console.log(`✈️  New booking: ${flightNumber} → ${dest.name} by @${booking.username}`);
      try { dataManager.saveData({ FLIGHTS, staff, flightBookings }); } catch (e) { }
      return res.status(201).json({ booking });
    }

    return res.status(400).json({ error: 'flightId/seatId or destination required' });
  });

  // ── API: list all bookings (admin only) ───────────────────
  app.get('/api/bookings', requireAuth, requireAdmin, (req, res) => {
    res.json({ bookings: flightBookings });
  });

  // ── Admin guard ─────────────────────────────────────────
  function requireAdmin(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
    if (!ADMIN_IDS.length || !ADMIN_IDS.includes(req.session.user.id)) return res.status(403).json({ error: "Admin only" });
    next();
  }

  // ── Staff guard ─────────────────────────────────────────
  function requireStaff(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
    const isStaffMember = staff.find(s => s.id === req.session.user.id);
    if (!isStaffMember) return res.status(403).json({ error: "Staff only" });
    next();
  }

  // ── Create flight (staff-only) ──────────────────────────
  app.post('/api/flights', requireAuth, requireStaff, (req, res) => {
    try {
      const flight = createFlightEntry({ ...req.body, createdBy: req.session.user.id });
      // persist
      try { dataManager.saveData({ FLIGHTS, staff, flightBookings }); } catch (e) { }
      console.log(`🆕 Flight created by ${req.session.user.username}: ${flight.id} → ${flight.destination}`);
      res.status(201).json({ flight });
    } catch (err) {
      const msg = err.message || 'Invalid flight';
      if (msg.includes('exists')) return res.status(409).json({ error: msg });
      return res.status(400).json({ error: msg });
    }
  });

  // ── Delete flight (staff-only) ──────────────────────────
  app.delete('/api/flights/:id', requireAuth, requireStaff, (req, res) => {
    const flightIndex = FLIGHTS.findIndex(f => f.id === req.params.id);
    if (flightIndex === -1) return res.status(404).json({ error: 'Flight not found' });
    const removed = FLIGHTS.splice(flightIndex, 1)[0];
    const beforeCount = flightBookings.length;
    flightBookings = flightBookings.filter(b => b.flightNumber !== removed.id);
    const removedBookings = beforeCount - flightBookings.length;
    try { dataManager.saveData({ FLIGHTS, staff, flightBookings }); } catch (e) { }
    console.log(`🗑️ Flight deleted by ${req.session.user.username}: ${removed.id} (${removedBookings} related booking(s) removed)`);
    res.json({ ok: true });
  });

  // ── API: list staff ─────────────────────────────────────
  app.get('/api/staff', (req, res) => {
    res.json({ staff });
  });

  // ── Export helpers for in-process usage (discord commands)
  // Note: exported later via module.exports

  // ── API: add staff (admin only) ──────────────────────────
  app.post('/api/staff', requireAuth, requireAdmin, (req, res) => {
    const { id, username, role } = req.body;
    if (!id || !username || !role) return res.status(400).json({ error: 'id, username and role are required' });
    const exists = staff.find(s => s.id === id);
    if (exists) return res.status(409).json({ error: 'Staff member already exists' });
    const entry = { id, username, role };
    staff.push(entry);
    console.log(`👥 Added staff: ${username} (${role})`);
    try { dataManager.saveData({ FLIGHTS, staff, flightBookings }); } catch (e) { }
    res.status(201).json({ staff: entry });
  });

  // ── API: remove staff (admin only) ───────────────────────
  app.delete('/api/staff/:id', requireAuth, requireAdmin, (req, res) => {
    const idx = staff.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const removed = staff.splice(idx, 1)[0];
    console.log(`🗑️ Removed staff: ${removed.username}`);
    try { dataManager.saveData({ FLIGHTS, staff, flightBookings }); } catch (e) { }
    res.json({ ok: true });
  });

  console.log("🔐 Discord OAuth2 routes registered.");
}

module.exports = {
  registerOAuthRoutes,
  // Staff management helpers for Discord commands
  addStaff: async ({ id, username, role }) => {
    const exists = staff.find(s => s.id === id);
    if (exists) throw new Error("User already has staff access");
    const entry = { id, username, role: role.toLowerCase() };
    staff.push(entry);
    try { dataManager.saveData({ FLIGHTS, staff, flightBookings }); } catch (e) { }
    return entry;
  },
  removeStaff: async (userId) => {
    const idx = staff.findIndex(s => s.id === userId);
    if (idx === -1) throw new Error("Staff member not found");
    const removed = staff.splice(idx, 1)[0];
    try { dataManager.saveData({ FLIGHTS, staff, flightBookings }); } catch (e) { }
    return removed;
  },
  getStaff: () => staff,
  // helpers for in-process usage
  createFlight: createFlightEntry,
  isStaff: isStaffMemberId,
  isAdmin: isAdminId,
  _internal: { FLIGHTS, staff, flightBookings },
};