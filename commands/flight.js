// ============================================================
//  commands/flight.js  –  Flight management commands
//  Current subcommands:  create
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("flight")
    .setDescription("Manage flights for the server.")
    // Subcommand: /flight create
    // Subcommands allow you to group related actions under one
    // top-level command and add more (e.g. `cancel`, `status`) later.
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create and announce a new flight.")
        .addStringOption((option) =>
          option
            .setName("destination")
            .setDescription("The destination of the flight (e.g. EGLL, London Heathrow).")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    // Read which subcommand was used.
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const destination = interaction.options.getString("destination");

      // Generate a simple flight number from the current timestamp.
      const flightNumber = `FM${Date.now().toString().slice(-5)}`;

      const embed = new EmbedBuilder()
        .setTitle("✈️ New Flight Created")
        .setColor(0x00b0f4)
        .addFields(
          { name: "Flight Number", value: flightNumber,   inline: true },
          { name: "Destination",   value: destination,    inline: true },
          { name: "Status",        value: "🟢 Scheduled", inline: true }
        )
        .setFooter({ text: `Created by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // Add more subcommand branches here as the bot grows:
    // if (subcommand === "cancel") { ... }
    // if (subcommand === "status") { ... }
  },
};