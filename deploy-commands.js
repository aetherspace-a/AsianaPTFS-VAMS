// ============================================================
//  deploy-commands.js  –  One-time Slash Command Registrar
//
//  Run this script whenever you ADD or CHANGE a command:
//    node deploy-commands.js
//
//  You do NOT need to re-run it on every bot restart — Discord
//  stores the command definitions on their servers.
// ============================================================

require("dotenv").config();

const fs   = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

// Collect the `data` (SlashCommandBuilder JSON) from every command file.
const commands     = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));

  if ("data" in command && "execute" in command) {
    // .toJSON() converts the builder object into the raw JSON Discord expects.
    commands.push(command.data.toJSON());
    console.log(`📦 Queued: /${command.data.name}`);
  } else {
    console.warn(`⚠️  Skipped ${file} — missing "data" or "execute".`);
  }
}

// Build a REST client authenticated with your bot token.
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// Self-invoking async function so we can use await at the top level.
(async () => {
  try {
    console.log(`\n🔄 Registering ${commands.length} slash command(s) with Discord...`);

    // PUT /applications/:CLIENT_ID/commands  →  replaces ALL global commands.
    // Global commands are visible in every server the bot is in.
    // They can take up to 1 hour to propagate — use guild commands for
    // instant updates during development (see the commented line below).
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID, "1506932959855251468node deploy-commands.js"),
      { body: commands }
    );

    // For instant dev updates, replace the line above with:
    // Routes.applicationGuildCommands(process.env.CLIENT_ID, "YOUR_GUILD_ID")

    console.log(`✅ Successfully registered ${data.length} command(s).\n`);
  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
})();