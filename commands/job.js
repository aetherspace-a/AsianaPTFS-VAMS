// ============================================================
//  commands/job.js  –  Airline careers list, application and resignation
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("job")
    .setDescription("View available airline positions, apply, or resign.")
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List all available jobs and level requirements.")
    )
    .addSubcommand(sub =>
      sub
        .setName("apply")
        .setDescription("Apply for an airline role.")
        .addStringOption(opt =>
          opt
            .setName("job_id")
            .setDescription("The ID of the job (e.g. baggage, attendant, officer, captain)")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("resign")
        .setDescription("Resign from your current position.")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);

    if (subcommand === "list") {
      const embed = new EmbedBuilder()
        .setTitle("✈️ Asiana Airlines Positions & Careers")
        .setColor(0x00b0f4)
        .setDescription("Earn salaries by applying for positions. Higher roles pay much more but require experience!")
        .setTimestamp();

      for (const [key, job] of Object.entries(economy.JOBS)) {
        const reqStr = user.level >= job.minLevel ? "✅ Met" : `❌ Requires Level ${job.minLevel}`;
        const isCurrent = user.job === key ? "➡️ **Currently Employed**" : "";
        
        embed.addFields({
          name: `${job.name} (ID: \`${key}\`)`,
          value: `💵 Pay: $${job.payoutMin}-$${job.payoutMax}/shift\n⚠️ Failure chance: ${Math.floor(job.failChance*100)}%\n🔒 Requirement: ${reqStr}\n${isCurrent}`,
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === "apply") {
      const jobId = interaction.options.getString("job_id").toLowerCase();
      const job = economy.JOBS[jobId];

      if (!job) {
        return interaction.reply({
          content: "❌ Invalid Job ID. Run `/job list` to see valid job IDs.",
          ephemeral: true
        });
      }

      if (user.job === jobId) {
        return interaction.reply({
          content: `⚠️ You are already employed as a **${job.name}**!`,
          ephemeral: true
        });
      }

      if (user.level < job.minLevel) {
        return interaction.reply({
          content: `❌ You do not meet the level requirement for **${job.name}**. You need to be **Level ${job.minLevel}** (Current: Level ${user.level}).`,
          ephemeral: true
        });
      }

      user.job = jobId;
      economy.saveEconomy();
      return interaction.reply({
        content: `🎉 Congratulations! Your application was accepted. You are now employed as a **${job.name}**!`
      });
    }

    if (subcommand === "resign") {
      if (!user.job) {
        return interaction.reply({
          content: "⚠️ You are currently unemployed. There is nothing to resign from.",
          ephemeral: true
        });
      }

      const job = economy.JOBS[user.job];
      user.job = null;
      economy.saveEconomy();
      return interaction.reply({
        content: `Successfully resigned from your position as **${job.name}**. You are now unemployed.`
      });
    }
  }
};
