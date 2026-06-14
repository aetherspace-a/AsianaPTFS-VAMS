// ============================================================
//  commands/config.js  –  Bot Configuration View
// ============================================================

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const dataService = require("../services/data-service");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("config")
        .setDescription("View current bot configuration.")
        .setDMPermission(false),

    async execute(interaction) {
        if (!dataService.isAdmin(interaction.user.id)) {
            return interaction.reply({ content: "❌ You do not have permission to view bot configuration.", ephemeral: true });
        }

        const config = dataService.getConfig();
        const embed = new EmbedBuilder()
            .setTitle("⚙️ Asiana Bot Configuration")
            .setColor(config.embedDefaults.color || 0xff3b30)
            .addFields(
                { name: "📢 Announcements", value: config.announcementChannel ? `<#${config.announcementChannel}>` : "*Not Set*", inline: true },
                { name: "📜 Logs", value: config.logChannel ? `<#${config.logChannel}>` : "*Not Set*", inline: true },
                { name: "🎫 Ticket Category", value: config.ticketCategory ? `<#${config.ticketCategory}>` : "*Not Set*", inline: true },
                { name: "👥 Staff Role", value: config.staffRole ? `<@&${config.staffRole}>` : "*Not Set*", inline: true },
                { name: "🛡️ Admin Role", value: config.adminRole ? `<@&${config.adminRole}>` : "*Not Set*", inline: true }
            )
            .setFooter({ text: config.embedDefaults.footer })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
