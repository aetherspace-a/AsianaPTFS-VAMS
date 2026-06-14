// ============================================================
//  commands/checkin.js  –  Passenger check-in confirmation
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkin")
    .setDescription("Check in for your flight and receive a boarding confirmation."),

  async execute(interaction) {
    // interaction.user  →  the Discord user who ran the command.
    const user = interaction.user;

    // Generate a simple boarding pass reference.
    const boardingRef = `BP-${user.id.slice(-4).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const embed = new EmbedBuilder()
      .setTitle("🛂 Check-In Confirmed!")
      .setColor(0x57f287)          // Green — success colour
      .setDescription(`Welcome aboard, **${user.username}**! Your boarding pass is ready.`)
      .addFields(
        { name: "Passenger",     value: user.tag,      inline: true },
        { name: "Boarding Ref",  value: boardingRef,   inline: true },
        { name: "Seat",          value: "To be assigned at gate", inline: false }
      )
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: "Please proceed to the gate 30 minutes before departure." })
      .setTimestamp();

    // ephemeral: true  →  only the user who ran the command can see this reply.
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};