// ============================================================
//  commands/profile.js  –  User Economy Profile
// ============================================================

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economyManager = require("../economy-manager");
const dataService = require("../services/data-service");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("View your Asiana Airlines career profile.")
        .addUserOption(option => option.setName("user").setDescription("User to view profile of")),

    async execute(interaction) {
        const target = interaction.options.getUser("user") || interaction.user;
        const profile = economyManager.getProfile(target.id);
        const config = dataService.getConfig();

        const xpToNext = profile.level * 100;
        const progress = Math.floor((profile.xp / xpToNext) * 10);
        const bar = "█".repeat(progress) + "░".repeat(10 - progress);

        const embed = new EmbedBuilder()
            .setTitle(`✈️ ${target.username}'s Career Profile`)
            .setThumbnail(target.displayAvatarURL())
            .setColor(config.embedDefaults.color || 0xff3b30)
            .addFields(
                { name: "💼 Job", value: profile.job || "Unemployed", inline: true },
                { name: "⭐ Level", value: `${profile.level}`, inline: true },
                { name: "📈 XP", value: `${profile.xp} / ${xpToNext}\n\`${bar}\``, inline: false },
                { name: "💵 Wallet", value: `$${profile.wallet.toLocaleString()}`, inline: true },
                { name: "🏛️ Bank", value: `$${profile.bank.toLocaleString()} / $${profile.bankSpace.toLocaleString()}`, inline: true },
                { name: "🎒 Inventory", value: `${Object.keys(profile.inventory || {}).length} items`, inline: true }
            )
            .setFooter({ text: config.embedDefaults.footer })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
