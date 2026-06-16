// ============================================================
//  deploy-commands.js – Total Cleanup & Register
// ============================================================
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
    console.log(`📦 Queued: /${command.data.name}`);
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("\n🧹 Cleaning up Global commands (removing 'ghost' commands)...");
    // Burahin ang lahat ng Global Commands (para mawala ang duplicates)
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log("✅ Global commands cleared.");

    console.log(`🔄 Registering ${commands.length} Guild commands...`);
    // I-register ang bago at malinis na commands sa iyong server
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, "1506932959855251468"),
      { body: commands }
    );

    console.log("✅ Successfully deployed clean commands to your server.\n");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
})();