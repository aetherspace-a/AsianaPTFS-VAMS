// ============================================================
//  commands/help.js  –  Bot Commands Guide
// ============================================================

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const dataService = require("../services/data-service");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("View all available commands for Asiana Airlines."),

    async execute(interaction) {
        const config = dataService.getConfig();
        const embed = new EmbedBuilder()
            .setTitle("✈️ Asiana Airlines Command Guide")
            .setDescription("Welcome to the official Asiana Airlines PTFS bot. Here is a list of available commands.")
            .setColor(config.embedDefaults.color || 0xff3b30)
            .addFields(
                { name: "📋 General", value: "`/help`, `/ping`, `/ticket`", inline: false },
                { name: "💼 Career & Economy", value: "`/profile`, `/balance`, `/job`, `/work`, `/daily`, `/beg`", inline: false },
                { name: "🛒 Shopping & Items", value: "`/shop`, `/buy`, `/inventory`, `/use`, `/sell`", inline: false },
                { name: "🎰 Games", value: "`/slots`, `/coinflip`, `/blackjack`", inline: false },
                { name: "🛡️ Staff", value: "`/announce`, `/flight`, `/checkin`, `/config` (Admin)", inline: false }
            )
            .setFooter({ text: config.embedDefaults.footer })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
