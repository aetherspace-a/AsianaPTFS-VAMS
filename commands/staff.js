const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { supabase } = require("../services/supabase");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("staff")
    .setDescription("Fetch staff profile details from Supabase.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Select a Discord user to check")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user");
    const discordId = targetUser.id;

    try {
      const { data: staffMember, error } = await supabase
        .from("staff")
        .select("*")
        .eq("discord_id", discordId)
        .maybeSingle();

      if (error) {
        console.error("Supabase staff fetch error:", error);
        return interaction.editReply({
          content: `❌ Error querying the database: ${error.message}`,
        });
      }

      if (!staffMember) {
        return interaction.editReply({
          content: `⚠️ No staff profile found for **${targetUser.tag}** (ID: \`${discordId}\`).`,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Staff Profile — ${staffMember.display_name || staffMember.username}`)
        .setColor(0x00b0f4)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: "Discord Account", value: `<@${staffMember.discord_id}>`, inline: true },
          { name: "Username", value: `@${staffMember.username}`, inline: true },
          { name: "Role", value: staffMember.role || "N/A", inline: true },
          { name: "Rank", value: staffMember.rank || "N/A", inline: true },
          { name: "Department", value: staffMember.department || "N/A", inline: true },
          { name: "Status", value: staffMember.status || "N/A", inline: true },
          {
            name: "Joined Date",
            value: staffMember.joined_date ? new Date(staffMember.joined_date).toLocaleDateString() : "N/A",
            inline: false,
          }
        )
        .setTimestamp()
        .setFooter({ text: "Asiana Airlines PTFS Staff Directory" });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Staff command error:", err);
      return interaction.editReply({
        content: `❌ Unexpected error: ${err.message || err}`,
      });
    }
  },
};
