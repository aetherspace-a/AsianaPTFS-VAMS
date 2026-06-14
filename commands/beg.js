// ============================================================
//  commands/beg.js  –  Beg for airport change
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const economy = require("../economy-manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("beg")
    .setDescription("Beg for some spare change at the airport terminal."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId, interaction.user.username);

    const now = Date.now();
    const begCooldown = 5 * 60 * 1000; // 5 minutes
    const last = user.cooldowns.beg || 0;

    if (now - last < begCooldown) {
      const timeLeftMs = begCooldown - (now - last);
      const minutes = Math.floor(timeLeftMs / (60 * 1000));
      const seconds = Math.floor((timeLeftMs % (60 * 1000)) / 1000);
      return interaction.reply({
        content: `⚠️ Stop begging so much! Please wait **${minutes}m ${seconds}s** before begging again.`,
        ephemeral: true
      });
    }

    const success = Math.random() < 0.8;
    user.cooldowns.beg = now;

    if (!success) {
      economy.saveEconomy();
      const failReplies = [
        "A grumpy pilot told you to go clean the engine exhaust. You got nothing.",
        "An airport security guard stared at you. You walked away quickly.",
        "A passenger offered you an empty plastic cup. Gee, thanks.",
        "The flight attendant rolled their eyes and walked past you."
      ];
      return interaction.reply({
        content: `😢 ${failReplies[Math.floor(Math.random() * failReplies.length)]}`
      });
    }

    const reward = Math.floor(Math.random() * 61) + 20; // $20 to $80
    user.wallet += reward;
    economy.saveEconomy();

    const successReplies = [
      `A passenger running late for a flight dropped a bill. You picked up **$${reward}**!`,
      `A generous flight captain handed you **$${reward}** for pocket change.`,
      `You found **$${reward}** wedged under a waiting area seat!`,
      `A tourist gave you **$${reward}** in foreign currency conversion.`
    ];

    return interaction.reply({
      content: `💵 ${successReplies[Math.floor(Math.random() * successReplies.length)]}`
    });
  }
};
