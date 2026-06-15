// ============================================================
//  auth-routes.js  –  Discord OAuth2 + API Routes
//
//  Import and call registerOAuthRoutes(app, client) in index.js
// ============================================================

require("dotenv").config();
const axios   = require("axios");
const session = require("express-session");
const dataManager = require('./data-manager');
const dataService = require('./services/data-service');

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

// ── Helper functions for in-process use ────────────────
const isAdminId = dataService.isAdmin;
const isStaffMemberId = dataService.isStaff;

function createFlightEntry({ id, origin, destination, departureTime, totalSeats, createdBy, aircraft, codeshare }) {
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
    status: 'Scheduled',
    aircraft: aircraft || null,
    codeshare: codeshare || null,
  };
  dataService.addFlight(flight);
  return flight;
}

function registerOAuthRoutes(app, client) {

  // ── Session ───────────────────────────────────────────────
  app.use(session({
    secret: process.env.SESSION_SECRET || "asiana-ptfs-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, 
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  app.use(require("express").json());

  // ── Auth Middleware ───────────────────────────────────────
  function requireAuth(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
    next();
  }

  function requireAdmin(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
    if (!isAdminId(req.session.user.id)) return res.status(403).json({ error: "Admin only" });
    next();
  }

  function requireStaff(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
    if (!isStaffMemberId(req.session.user.id)) return res.status(403).json({ error: "Staff only" });
    next();
  }

  // ── Auth Routes ───────────────────────────────────────────
  app.get("/auth/discord", (req, res) => {
    // If already logged in, just go to pilot or returnTo
    if (req.session.user) {
      return res.redirect(req.query.returnTo || "/pilot.html");
    }

    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo;
    }

    const params = new URLSearchParams({
      client_id:     process.env.DISCORD_CLIENT_ID,
      redirect_uri:  process.env.DISCORD_REDIRECT_URI,
      response_type: "code",
      scope:         "identify",
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  });

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

      // Handle new Discord username system (discriminator "0")
      let avatarUrl;
      if (avatar) {
        avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`;
      } else {
        // For new system, default avatar depends on User ID. For old system, on discriminator.
        const defaultAvatarNum = (discriminator === "0" || !discriminator) 
          ? Number(BigInt(id) >> 22n) % 6 
          : Number(discriminator) % 5;
        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`;
      }

      req.session.user = {
        id,
        username,
        discriminator,
        avatar: avatarUrl,
      };

      const returnTo = req.session.returnTo || "/pilot.html";
      delete req.session.returnTo;
      res.redirect(returnTo);
    } catch (err) {
      console.error("[OAuth] Callback error:", err.response?.data || err.message);
      res.redirect("/?error=oauth_failed");
    }
  });

  app.get("/auth/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
  });

  // ── API Routes ────────────────────────────────────────────
  app.get("/api/user", (req, res) => {
    if (!req.session.user) return res.status(401).json({ user: null });
    res.json({ user: req.session.user });
  });

  app.get("/api/check-admin", (req, res) => {
    if (!req.session.user) return res.status(401).json({ isAdmin: false });
    res.json({ isAdmin: isAdminId(req.session.user.id) });
  });

  app.get("/api/check-staff", (req, res) => {
    if (!req.session.user) return res.status(401).json({ isStaff: false });
    res.json({ isStaff: isStaffMemberId(req.session.user.id) });
  });

  app.get("/api/destinations", (req, res) => {
    res.json({ destinations: DESTINATIONS });
  });

  app.get("/api/finance", (req, res) => {
    res.json(dataService.getFinance());
  });

  app.get("/api/fleet", (req, res) => {
    res.json({ fleet: dataService.getFleet() });
  });

  app.get("/api/flights", (req, res) => {
    const userId = req.session?.user?.id;
    const flights = dataService.getFlights();
    if (userId && isAdminId(userId)) return res.json({ flights });
    const visible = flights.filter(f => !!f.createdBy);
    res.json({ flights: visible });
  });

  app.get('/api/flight/:id', (req, res) => {
    const f = dataService.getFlightById(req.params.id);
    if (!f) return res.status(404).json({ error: 'Flight not found' });
    const userId = req.session?.user?.id;
    if (!f.createdBy && (!userId || !isAdminId(userId))) return res.status(404).json({ error: 'Flight not found' });
    res.json({ flight: f });
  });

  app.get('/api/mybookings', requireAuth, (req, res) => {
    const my = dataService.getBookings().filter(f => f.userId === req.session.user.id);
    res.json({ bookings: my });
  });

  app.post("/api/book", requireAuth, (req, res) => {
    const { flightId, seatId, passengerName, robloxUsername, discordId, destination } = req.body;

    if (flightId || seatId) {
      if (!flightId) return res.status(400).json({ error: 'flightId is required' });
      if (!seatId) return res.status(400).json({ error: 'seatId is required' });

      const flight = dataService.getFlightById(flightId);
      if (!flight) return res.status(400).json({ error: 'Unknown flightId' });

      if (flight.bookedSeats.includes(seatId)) {
        return res.status(409).json({ error: 'Seat already taken' });
      }

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
      dataService.addRevenue(250);
      dataService.addMiles(1200);

      console.log(`✈️  New booking: ${flight.id} seat ${seatId} by @${booking.username}`);
      return res.status(201).json({ booking });
    }

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

  app.get('/api/bookings', requireAuth, requireAdmin, (req, res) => {
    res.json({ bookings: dataService.getBookings() });
  });

  app.post('/api/flights', requireAuth, requireStaff, async (req, res) => {
    try {
      const flight = createFlightEntry({ ...req.body, createdBy: req.session.user.id });
      console.log(`🆕 Flight created by ${req.session.user.username}: ${flight.id} → ${flight.destination}`);

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

  app.patch('/api/flights/:id/status', requireAuth, requireStaff, async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const flight = dataService.updateFlightStatus(req.params.id, status);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });

    console.log(`🔄 Flight ${flight.id} status updated to ${status} by ${req.session.user.username}`);

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

  app.delete('/api/flights/:id', requireAuth, requireStaff, (req, res) => {
    const flight = dataService.getFlightById(req.params.id);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });

    dataService.removeFlight(req.params.id);
    const beforeCount = dataService.getBookings().length;
    dataService._internal.flightBookings = dataService.getBookings().filter(b => b.flightNumber !== flight.id);
    const removedBookings = beforeCount - dataService.getBookings().length;
    dataService.save();

    console.log(`🗑️ Flight deleted by ${req.session.user.username}: ${flight.id} (${removedBookings} related booking(s) removed)`);
    res.json({ ok: true });
  });

  app.get('/api/staff', (req, res) => {
    res.json({ staff: dataService.getStaff() });
  });

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
  createFlight: createFlightEntry,
  isStaff: isStaffMemberId,
  isAdmin: isAdminId,
  _internal: dataService._internal,
};
