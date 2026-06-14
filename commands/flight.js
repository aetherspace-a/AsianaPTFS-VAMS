const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { supabase } = require("../services/supabase");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("flight")
    .setDescription("Fetch details of a flight from Supabase.")
    .addStringOption((option) =>
      option
        .setName("flight_number")
        .setDescription("The flight number to search (e.g., OZ101)")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const flightNumber = interaction.options.getString("flight_number").trim();

    try {
      const { data: flight, error } = await supabase
        .from("flights")
        .select("*")
        .eq("flight_number", flightNumber)
        .maybeSingle();

      if (error) {
        console.error("Supabase flight fetch error:", error);
        return interaction.editReply({
          content: `❌ Error querying the database: ${error.message}`,
        });
      }

      if (!flight) {
        return interaction.editReply({
          content: `⚠️ No flight found with flight number **${flightNumber}**.`,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`✈️ Flight Details — ${flight.flight_number}`)
        .setColor(0x00b0f4)
        .addFields(
          { name: "Origin", value: flight.origin || "N/A", inline: true },
          { name: "Destination", value: flight.destination || "N/A", inline: true },
          { name: "Status", value: flight.status || "N/A", inline: true },
          { name: "Aircraft Type", value: flight.aircraft_type || "N/A", inline: true },
          { name: "Registration", value: flight.registration || "N/A", inline: true },
          { name: "Gate", value: flight.gate || "N/A", inline: true },
          { name: "Terminal", value: flight.terminal || "N/A", inline: true },
          {
            name: "Departure (UTC)",
            value: flight.departure_time ? new Date(flight.departure_time).toUTCString() : "N/A",
            inline: false,
          },
          {
            name: "Arrival (UTC)",
            value: flight.arrival_time ? new Date(flight.arrival_time).toUTCString() : "N/A",
            inline: false,
          }
        )
        .setTimestamp()
        .setFooter({ text: "Asiana Airlines PTFS Flight Operations" });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Flight command error:", err);
      return interaction.editReply({
        content: `❌ Unexpected error: ${err.message || err}`,
      });
    }
  },
};