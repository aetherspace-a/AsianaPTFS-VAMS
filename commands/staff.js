// ============================================================
//  commands/staff.js  –  Manage pilots and staff access
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("staff")
    .setDescription("Manage pilot and staff access to the website")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add a user as pilot or staff")
        .addUserOption(opt => opt.setName("user").setDescription("Discord user").setRequired(true))
        .addStringOption(opt =>
          opt
            .setName("role")
            .setDescription("Role: pilot or staff")
            .setRequired(true)
            .addChoices(
              { name: "Pilot", value: "pilot" },
              { name: "Staff", value: "staff" }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove a user's staff/pilot access")
        .addUserOption(opt => opt.setName("user").setDescription("Discord user").setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List all pilots and staff members")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const { addStaff, removeStaff, getStaff } = require("../auth-routes");

    if (subcommand === "add") {
      const user = interaction.options.getUser("user");
      const role = interaction.options.getString("role");

      try {
        await addStaff({
          id: user.id,
          username: user.username,
          role,
        });

        return interaction.reply({
          content: `✅ Added **${user.username}** as **${role}** to website access.`,
          ephemeral: true,
        });
      } catch (err) {
        return interaction.reply({
          content: `❌ Error: ${err.message}`,
          ephemeral: true,
        });
      }
    }

    if (subcommand === "remove") {
      const user = interaction.options.getUser("user");

      try {
        await removeStaff(user.id);

        return interaction.reply({
          content: `✅ Removed **${user.username}** from staff access.`,
          ephemeral: true,
        });
      } catch (err) {
        return interaction.reply({
          content: `❌ Error: ${err.message}`,
          ephemeral: true,
        });
      }
    }

    if (subcommand === "list") {
      const staffList = getStaff();

      if (!staffList || staffList.length === 0) {
        return interaction.reply({
          content: "📋 No staff or pilots configured yet.",
          ephemeral: true,
        });
      }

      const list = staffList
        .map(s => `• **${s.username}** (${s.role.toUpperCase()})`)
        .join("\n");

      return interaction.reply({
        content: `📋 **Current Staff & Pilots:**\n${list}`,
        ephemeral: true,
      });
    }
  },
};
