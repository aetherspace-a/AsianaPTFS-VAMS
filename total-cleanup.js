require("dotenv").config();
const { REST, Routes } = require("discord.js");

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔥 TOTAL CLEANUP: Deleting all commands from all scopes...");

    // 1. Burahin lahat ng GLOBAL commands
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log("✅ Global commands cleared.");

    // 2. Burahin lahat ng GUILD commands (Palitan mo ang 'YOUR_GUILD_ID' ng mismong ID ng server mo)
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, "1506932959855251468"), { body: [] });
    console.log("✅ Guild commands cleared for 1506932959855251468.");

    console.log("🎉 Cleanup complete! Restart Discord (Ctrl+R).");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
})();