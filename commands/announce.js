// ============================================================
//  commands/announce.js  –  Post a formatted announcement
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Post a formatted announcement to this channel.")
    // String option — the text content of the announcement.
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The announcement text you want to broadcast.")
        .setRequired(true)         // Discord enforces this before execute() is called
        .setMaxLength(1000)        // Sane upper limit
    ),

  async execute(interaction) {
    // Retrieve the value the user typed for the "message" option.
    const announcementText = interaction.options.getString("message");

    // Build a rich embed for a polished look.
    const embed = new EmbedBuilder()
      .setTitle("📢 Announcement")
      .setDescription(announcementText)
      .setColor(0x5865f2)                        // Discord blurple
      .setFooter({ text: `Posted by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};