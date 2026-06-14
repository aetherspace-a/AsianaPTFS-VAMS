// ============================================================
//  admin-routes.js  –  Dashboard & Embed API Routes
// ============================================================

const express = require('express');
const { EmbedBuilder } = require('discord.js');
const dataService = require('./services/data-service');

function registerAdminRoutes(app, client) {
    const router = express.Router();

    // Middleware to check if user is admin
    const isAdmin = (req, res, next) => {
        if (req.session.user && dataService.isAdmin(req.session.user.id)) {
            return next();
        }
        res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    };

    // Get Bot Config
    router.get('/config', isAdmin, (req, res) => {
        res.json(dataService.getConfig());
    });

    // Update Bot Config
    router.post('/config', isAdmin, express.json(), (req, res) => {
        const updates = req.body;
        const config = dataService.updateConfig(updates);
        res.json({ message: 'Configuration updated successfully', config });
    });

    // Send Rich Embed
    router.post('/send-embed', isAdmin, express.json(), async (req, res) => {
        const { channelId, embed, content, components, embeds } = req.body;
        
        if (!channelId) return res.status(400).json({ error: 'Channel ID is required' });

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                return res.status(400).json({ error: 'Invalid or non-text channel' });
            }

            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const messagePayload = { content: content || null, embeds: [], components: [] };

            // Handle legacy single 'embed' object
            if (embed && !embeds) {
                const discordEmbed = new EmbedBuilder()
                    .setTitle(embed.title || null)
                    .setDescription(embed.description || null)
                    .setURL(embed.url || null)
                    .setColor(embed.color || dataService.getConfig().embedDefaults.color)
                    .setTimestamp(embed.timestamp ? new Date() : null);

                if (embed.author?.name) discordEmbed.setAuthor({ name: embed.author.name, iconURL: embed.author.icon_url || null });
                if (embed.footer?.text) discordEmbed.setFooter({ text: embed.footer.text, iconURL: embed.footer.icon_url || null });
                if (embed.thumbnail?.url) discordEmbed.setThumbnail(embed.thumbnail.url);
                if (embed.image?.url) discordEmbed.setImage(embed.image.url);
                if (Array.isArray(embed.fields)) {
                    embed.fields.forEach(f => { if (f.name && f.value) discordEmbed.addFields({ name: f.name, value: f.value, inline: !!f.inline }); });
                }
                messagePayload.embeds.push(discordEmbed);
            }

            // Handle multiple 'embeds'
            if (Array.isArray(embeds)) {
                embeds.forEach(e => {
                    const de = new EmbedBuilder()
                        .setTitle(e.title || null)
                        .setDescription(e.description || null)
                        .setColor(e.color || dataService.getConfig().embedDefaults.color);
                    if (e.image?.url) de.setImage(e.image.url);
                    if (e.footer?.text) de.setFooter({ text: e.footer.text });
                    messagePayload.embeds.push(de);
                });
            }

            // Handle buttons
            if (Array.isArray(components)) {
                const row = new ActionRowBuilder();
                components.forEach(c => {
                    if (c.type === 2) { // Button
                        const btn = new ButtonBuilder()
                            .setLabel(c.label)
                            .setStyle(c.style || ButtonStyle.Link)
                            .setURL(c.url || null);
                        if (c.emoji) btn.setEmoji(c.emoji);
                        row.addComponents(btn);
                    }
                });
                if (row.components.length) messagePayload.components.push(row);
            }

            await channel.send(messagePayload);
            res.json({ success: true, message: 'Rich message dispatched' });
        } catch (err) {
            console.error('[admin-routes] send-embed error:', err);
            res.status(500).json({ error: 'Failed to send: ' + err.message });
        }
    });

    // Support Tickets API
    router.get('/tickets', isAdmin, (req, res) => {
        res.json({ tickets: dataService.getTickets() });
    });

    router.get('/ticket-panels', isAdmin, (req, res) => {
        res.json({ panels: dataService.getConfig().ticketPanels || [] });
    });

    router.post('/setup-ticket-panel', isAdmin, express.json(), async (req, res) => {
        const { channelId, panelId } = req.body;
        const config = dataService.getConfig();
        const panel = config.ticketPanels.find(p => p.id === panelId);
        
        if (!panel) return res.status(400).json({ error: 'Panel not found' });

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) return res.status(400).json({ error: 'Invalid channel' });

            const embed = new EmbedBuilder()
                .setTitle(`${panel.icon} ${panel.name}`)
                .setDescription(panel.description + "\n\nClick the button below to open a ticket.")
                .setColor(config.embedDefaults.color)
                .setFooter({ text: config.embedDefaults.footer });

            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`open_ticket_${panel.id}`)
                    .setLabel(`Open ${panel.name}`)
                    .setEmoji(panel.icon)
                    .setStyle(ButtonStyle.Primary)
            );

            await channel.send({ embeds: [embed], components: [row] });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/tickets/:id/claim', isAdmin, async (req, res) => {
        const ticketId = req.params.id;
        const user = req.session.user;
        const ticket = dataService.getTickets().find(t => t.id === ticketId);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        try {
            const channel = await client.channels.fetch(ticketId);
            if (channel) {
                await channel.send(`🙋‍♂️ **Ticket Claimed**\nThis ticket is now being handled by <@${user.id}>.`);
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
            }
            dataService.updateTicket(ticketId, { status: 'claimed', claimedBy: user.id, claimedByName: user.username });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/tickets/:id/close', isAdmin, async (req, res) => {
        const ticketId = req.params.id;
        const ticket = dataService.getTickets().find(t => t.id === ticketId);
        
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        try {
            const channel = await client.channels.fetch(ticketId);
            if (channel) {
                await channel.send('🔒 This ticket has been closed from the Admin Dashboard. Deleting in 10 seconds...');
                setTimeout(() => channel.delete().catch(() => {}), 10000);
            }
            dataService.updateTicket(ticketId, { status: 'closed', closedAt: new Date().toISOString() });
            res.json({ success: true });
        } catch (err) {
            // Even if channel fetch fails, mark as closed in DB
            dataService.updateTicket(ticketId, { status: 'closed', closedAt: new Date().toISOString() });
            res.json({ success: true, warning: 'Ticket closed in system, but Discord channel could not be reached.' });
        }
    });

    app.use('/api/admin', router);
}

module.exports = { registerAdminRoutes };
