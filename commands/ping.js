// ============================================================
//  commands/ping.js  –  Basic latency test command
// ============================================================
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  // `data` defines how the command appears in Discord's UI.
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is responsive. Replies with Pong!"),

  // `execute` is called by the interactionCreate handler in index.js.
  async execute(interaction) {
    // interaction.client.ws.ping is the WebSocket heartbeat latency in ms.
    const latency = interaction.client.ws.ping;

    await interaction.reply(
      `🏓 Pong! WebSocket latency: **${latency}ms**`
    );
  },
};