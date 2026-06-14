// ============================================================
//  index.js  –  Asiana Airlines PTFS | Main Entry Point
//  Discord Bot + Express Web Server + OAuth2
//
//  SETUP:
//    npm install discord.js express dotenv express-session axios
//
//  .env required keys:
//    TOKEN=
//    CLIENT_ID=
//    DISCORD_CLIENT_ID=
//    DISCORD_CLIENT_SECRET=
//    DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
//    SESSION_SECRET=any_long_random_string
// ============================================================

require("dotenv").config();

const fs      = require("fs");
const path    = require("path");
const express = require("express");
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { registerOAuthRoutes } = require("./auth-routes");
const { registerEconomyRoutes } = require("./economy-routes");

// ── Discord Client ────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// ── Dynamic Command Loader ────────────────────────────────────
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: /${command.data.name}`);
  } else {
    console.warn(`⚠️  Skipped ${file} — missing "data" or "execute".`);
  }
}

// ── Discord Events ────────────────────────────────────────────
client.once("ready", () => {
  console.log(`\n🚀 Logged in as ${client.user.tag}`);
  console.log(`✈️  Asiana Airlines PTFS Bot is airborne!\n`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error in /${interaction.commandName}:`, error);
    const payload = { content: "⚠️ Something went wrong.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

// ── Express Server ────────────────────────────────────────────
const app  = express();
const PORT = 3000;

// Register OAuth2 + API routes (must come before static middleware)
registerOAuthRoutes(app);
registerEconomyRoutes(app);

// Serve everything in public/ — index.html, style.css, etc.
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
  console.log(`📡 Serving static files from /public`);
});

// ── Bot Login (always last) ───────────────────────────────────
client.login(process.env.TOKEN);