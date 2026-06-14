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

// ── Configuration ────────────────────────────────────────────
// Centralise IDs here so future changes only need one edit.
const ANNOUNCEMENT_CHANNEL_ID = "1507312279736029264";
const ANNOUNCEMENT_ROLE_PING  = "<@&1507385048779984906>";

// Asiana Airlines brand palette
// Primary red from their livery, deep navy for contrast, soft grey footer
const COLOR_ASIANA_RED  = 0xC40030;  // Asiana's signature red
const COLOR_ASIANA_NAVY = 0x0A1F44;  // Deep navy accent


// ── Core Function (shared by slash command AND future API route) ──
/**
 * Builds and sends a branded Asiana Airlines announcement.
 *
 * @param {import("discord.js").Client} client     - The logged-in Discord client.
 * @param {string}                      messageText - The body text of the announcement.
 * @param {string}                      authorTag   - Display name/tag of who triggered it.
 * @returns {Promise<import("discord.js").Message>} The sent message.
 *
 * Usage from an Express route:
 *   const { sendAnnouncement } = require("./commands/announce");
 *   await sendAnnouncement(client, "Flights resume at 18:00Z", "Web Dashboard");
 */
async function sendAnnouncement(client, messageText, authorTag) {
  // Fetch the target channel from Discord's cache (or via API if not cached).
  const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);

  if (!channel || !channel.isTextBased()) {
    throw new Error(
      `Announcement channel ${ANNOUNCEMENT_CHANNEL_ID} not found or is not a text channel.`
    );
  }

  // ── Embed ───────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    // Sleek dark navy side-bar accent
    .setColor(COLOR_ASIANA_NAVY)

    // Header: airline logo wordmark feel via the title
    .setAuthor({
      name: "Asiana Airlines PTFS",
      // Replace this URL with your airline's official logo hosted online
      // for it to appear as a small icon next to the author name.
      // iconURL: "hhttps://cdn.discordapp.com/attachments/1507309063363493889/1514895142576980049/Asiana_Airlines_-_Logo_2.png?ex=6a2db04b&is=6a2c5ecb&hm=2af7c96a99d239cd9a881d78e1334bc15985b82e011b4a68d83a5aed219f382f&",
    })

    .setTitle("📢  Official Announcement")

    // The user-supplied announcement body
    .setDescription(messageText)

    // Visual divider field — gives the embed a polished, structured look
    .addFields({
      name: "\u200B",   // Zero-width space = invisible field name (acts as spacer)
      value:
        "─────────────────────────────────\n" +
        "✈️  *Safe skies and smooth landings.*",
    })

    .setFooter({
      text: `Asiana Airlines PTFS • Automated System  │  Issued by ${authorTag}`,
      // iconURL: "https://cdn.discordapp.com/attachments/1507309063363493889/1514895142576980049/Asiana_Airlines_-_Logo_2.png?ex=6a2db04b&is=6a2c5ecb&hm=2af7c96a99d239cd9a881d78e1334bc15985b82e011b4a68d83a5aed219f382f&",
    })

    // Automatically renders as Discord's localised date/time
    .setTimestamp();

  // ── Send ────────────────────────────────────────────────────
  // The role ping is sent as plain `content` — embeds alone
  // do NOT trigger role notification sounds/badges.
  return channel.send({
    content: `${ANNOUNCEMENT_ROLE_PING}`,
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