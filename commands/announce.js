// ============================================================
//  commands/announce.js  –  Asiana Airlines PTFS
//  Sends a branded announcement to a dedicated channel.
//
//  MODULAR DESIGN NOTE:
//  The core embed-building and sending logic is exported as
//  `sendAnnouncement(client, message, authorTag)` — a standalone
//  async function that your Express API route can import and call
//  directly without needing a Discord interaction object.
//  See the bottom of this file for the export.
// ============================================================

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const dataService = require("../services/data-service");

// ── Core Function (shared by slash command AND future API route) ──
async function sendAnnouncement(client, messageText, authorTag) {
  const config = dataService.getConfig();
  const channelId = config.announcementChannel || "1507312279736029264";
  
  // Fetch the target channel from Discord's cache (or via API if not cached).
  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    throw new Error(`Announcement channel ${channelId} not found or is not a text channel.`);
  }

  // ── Embed ───────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(config.embedDefaults.color || 0x0A1F44)
    .setAuthor({
      name: "Asiana Airlines PTFS",
      iconURL: config.embedDefaults.thumbnail || null
    })
    .setTitle("📢  Official Announcement")
    .setDescription(messageText)
    .addFields({
      name: "\u200B",
      value: "─────────────────────────────────\n✈️  *Safe skies and smooth landings.*",
    })
    .setFooter({
      text: `${config.embedDefaults.footer}  │  Issued by ${authorTag}`,
    })
    .setTimestamp();

  // ── Send ────────────────────────────────────────────────────
  const ping = config.staffRole ? `<@&${config.staffRole}>` : "@everyone";
  return channel.send({
    content: `${ping}`,
    embeds: [embed],
  });
}


// ── Slash Command Definition ─────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send an official Asiana Airlines announcement.")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The announcement text to broadcast.")
        .setRequired(true)
        .setMaxLength(2000)
    ),

  // Expose the core function so Express routes can import it.
  sendAnnouncement,

  async execute(interaction) {
    const messageText = interaction.options.getString("message");

    // Defer ephemerally first — fetching a channel + sending can
    // take a moment, and Discord will show "failed" if we exceed 3 s.
    await interaction.deferReply({ ephemeral: true });

    try {
      await sendAnnouncement(
        interaction.client,
        messageText,
        interaction.user.tag   // e.g. "AdminUser#0001"
      );

      // Only the admin who ran the command sees this confirmation.
      await interaction.editReply("✅ Announcement sent successfully!");

    } catch (error) {
      console.error("[announce] Failed to send announcement:", error);

      await interaction.editReply(
        "❌ Could not send the announcement. " +
        "Please check that the bot has access to the announcement channel."
      );
    }
  },
};