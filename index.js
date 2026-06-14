// ============================================================
//  index.js  –  Flight Management Bot | Core Entry Point
//  Dynamic command handler + Express uptime server
// ============================================================

// --- 1. Environment variables --------------------------------
require("dotenv").config();

// --- 2. Node built-ins for scanning the commands/ folder ----
const fs   = require("fs");
const path = require("path");

// --- 3. Discord.js ------------------------------------------
const { Client, GatewayIntentBits, Collection } = require("discord.js");

// --- 4. Express ---------------------------------------------
const express = require("express");


// ============================================================
//  DISCORD CLIENT SETUP
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,   // Required for slash commands to fire
  ],
});

// client.commands is a custom Collection (Discord's extended Map).
// Every loaded command is stored here, keyed by its name.
// e.g.  client.commands.get("ping")  →  the ping command object
client.commands = new Collection();


// ============================================================
//  DYNAMIC COMMAND LOADER
//  Reads every .js file inside commands/ and loads it into
//  client.commands at startup — no manual imports ever needed.
// ============================================================

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command  = require(filePath);

  // Each command file must export both `data` (builder) and `execute` (handler).
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: /${command.data.name}`);
  } else {
    console.warn(`⚠️  Skipped ${file} — missing "data" or "execute" export.`);
  }
}


// ============================================================
//  DISCORD EVENTS
// ============================================================

// ----- ready -------------------------------------------------
client.once("ready", () => {
  console.log(`\n🚀 Logged in as ${client.user.tag}`);
  console.log(`✈️  Flight Management Bot is airborne!\n`);
});

// ----- interactionCreate -------------------------------------
// All slash command interactions are routed through here.
client.on("interactionCreate", async (interaction) => {

  // Ignore anything that is not a slash command.
  if (!interaction.isChatInputCommand()) return;

  // Look up the matching command object by name.
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ No handler found for: ${interaction.commandName}`);
    return interaction.reply({
      content: "Unknown command. It may need to be re-deployed.",
      ephemeral: true,
    });
  }

  // Run the command. Errors are caught so one bad command never
  // crashes the entire bot process.
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error in /${interaction.commandName}:`, error);

    const payload = {
      content: "⚠️ Something went wrong while running that command.",
      ephemeral: true,
    };

    // Use followUp if we already replied/deferred, otherwise reply.
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});


// ============================================================
//  EXPRESS KEEP-ALIVE SERVER  (port 3000, for UptimeRobot)
// ============================================================

const app  = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Bot Status</title>
        <style>
          body { font-family:Arial,sans-serif; display:flex; justify-content:center;
                 align-items:center; height:100vh; margin:0;
                 background:#1a1a2e; color:#e0e0e0; }
          .card { text-align:center; background:#16213e; padding:2rem 3rem;
                  border-radius:12px; border:1px solid #0f3460;
                  box-shadow:0 4px 20px rgba(0,0,0,.4); }
          .dot  { display:inline-block; width:12px; height:12px; background:#4ade80;
                  border-radius:50%; margin-right:8px; animation:pulse 1.5s infinite; }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        </style>
      </head>
      <body>
        <div class="card">
          <h1><span class="dot"></span>Bot is online and ready for UptimeRobot.</h1>
          <p>Flight Management Bot process is running normally.</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 Express keep-alive server running on port ${PORT}`);
});


// ============================================================
//  BOT LOGIN  (always last — after all listeners are registered)
// ============================================================
client.login(process.env.TOKEN);