// ============================================================
//  commands/ticket.js  –  Support Ticket System
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const dataService = require("../services/data-service");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Open a support ticket with Asiana Airlines staff.")
        .addStringOption(option => 
            option.setName("subject")
                .setDescription("What is the reason for your ticket?")
                .setRequired(true)
        ),

    async execute(interaction) {
        const config = dataService.getConfig();
        const subject = interaction.options.getString("subject");
        
        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            const categoryId = config.ticketCategory;
            const category = categoryId ? await guild.channels.fetch(categoryId) : null;

            // Create ticket channel
            const channel = await guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: category && category.type === ChannelType.GuildCategory ? category.id : null,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                    {
                        id: config.staffRole || guild.ownerId, // Fallback to owner if no staff role
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    }
                ],
            });

            // Save to data service
            const ticket = {
                id: channel.id,
                userId: interaction.user.id,
                username: interaction.user.username,
                subject: subject,
                status: 'open',
                createdAt: new Date().toISOString()
            };
            dataService.addTicket(ticket);

            // Welcome embed
            const embed = new EmbedBuilder()
                .setTitle("✈️ Asiana Support Ticket")
                .setDescription(`${config.ticketWelcomeMessage}\n\n**Subject:** ${subject}\n**User:** <@${interaction.user.id}>`)
                .setColor(config.embedDefaults.color || 0xff3b30)
                .setTimestamp()
                .setFooter({ text: config.embedDefaults.footer });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: config.staffRole ? `<@&${config.staffRole}>` : null, embeds: [embed], components: [row] });

            await interaction.editReply(`✅ Ticket created: <#${channel.id}>`);

        } catch (error) {
            console.error("[ticket] Error:", error);
            await interaction.editReply("❌ Failed to create ticket. Please ensure the bot has proper permissions.");
        }
    }
};
