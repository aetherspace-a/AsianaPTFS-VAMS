// ============================================================
//  commands/flight.js  –  Flight management commands
//  Current subcommands:  create
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const auth = require("../auth-routes");

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

      // Permission check: only server staff or admins may create flights via bot
      const uid = interaction.user.id;
      const allowed = auth.isStaff(uid) || auth.isAdmin(uid);
      if (!allowed) {
        return interaction.reply({ content: "⚠️ You are not authorized to create flights.", ephemeral: true });
      }

      // Generate a simple flight number from the current timestamp.
      const flightNumber = `FM${Date.now().toString().slice(-5)}`;

      // Create a flight entry in the server's in-memory schedule
      try {
        const flight = auth.createFlight({
          id: flightNumber,
          origin: 'TBD',
          destination,
          departureTime: new Date().toISOString(),
          totalSeats: 60,
          createdBy: interaction.user.id,
        });

        const embed = new EmbedBuilder()
          .setTitle("✈️ New Flight Created")
          .setColor(0x00b0f4)
          .addFields(
            { name: "Flight Number", value: flight.id,   inline: true },
            { name: "Destination",   value: flight.destination,    inline: true },
            { name: "Status",        value: "🟢 Scheduled", inline: true }
          )
          .setFooter({ text: `Created by ${interaction.user.tag}` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({ content: `Error creating flight: ${err.message}`, ephemeral: true });
      }
    }

    // Add more subcommand branches here as the bot grows:
    // if (subcommand === "cancel") { ... }
    // if (subcommand === "status") { ... }
  },
};