// ============================================================
//  index.js  –  Asiana Airlines PTFS | Main Entry Point
//  Discord Bot + Express Web Server + OAuth2
//
//  SETUP:
//    npm install discord.js express dotenv express-session axios
//
//  .env required keys:
//    TOKEN=
//    CLIENT_ID=
//    DISCORD_CLIENT_ID=
//    DISCORD_CLIENT_SECRET=
//    DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
//    SESSION_SECRET=any_long_random_string
// ============================================================

require("dotenv").config();

const fs      = require("fs");
const path    = require("path");
const express = require("express");
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { registerOAuthRoutes } = require("./auth-routes");
const { registerEconomyRoutes } = require("./economy-routes");
const { registerAdminRoutes } = require("./admin-routes");
const dataService = require("./services/data-service");

// ── Discord Client ────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// ── Dynamic Command Loader ────────────────────────────────────
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: /${command.data.name}`);
  } else {
    console.warn(`⚠️  Skipped ${file} — missing "data" or "execute".`);
  }
}

// ── Discord Events ────────────────────────────────────────────
client.once("ready", () => {
  console.log(`\n🚀 Logged in as ${client.user.tag}`);
  console.log(`✈️  Asiana Airlines PTFS Bot is airborne!\n`);
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const dataService = require('./services/data-service');
    const config = dataService.getConfig();

    if (interaction.customId.startsWith('open_ticket_')) {
      const panelId = interaction.customId.replace('open_ticket_', '');
      const panel = config.ticketPanels.find(p => p.id === panelId);
      
      await interaction.deferReply({ ephemeral: true });

      try {
        const guild = interaction.guild;
        const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const channel = await guild.channels.create({
          name: `${panelId}-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: config.ticketCategory || null,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: config.staffRole || guild.ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ],
        });

        const ticket = {
          id: channel.id,
          userId: interaction.user.id,
          username: interaction.user.username,
          subject: panel.name,
          status: 'open',
          createdAt: new Date().toISOString()
        };
        dataService.addTicket(ticket);

        const embed = new EmbedBuilder()
          .setTitle(`${panel.icon} ${panel.name} — Ticket`)
          .setDescription(`${config.ticketWelcomeMessage}\n\n**User:** <@${interaction.user.id}>\n**Category:** ${panel.name}`)
          .setColor(config.embedDefaults.color)
          .setTimestamp()
          .setFooter({ text: config.embedDefaults.footer });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success)
        );

        await channel.send({ content: config.staffRole ? `<@&${config.staffRole}>` : null, embeds: [embed], components: [row] });
        await interaction.editReply(`✅ Ticket created: <#${channel.id}>`);
      } catch (e) {
        await interaction.editReply("❌ Failed to create ticket.");
      }
      return;
    }

    if (interaction.customId === 'claim_ticket') {
      const ticket = dataService.getTickets().find(t => t.id === interaction.channelId);
      if (ticket) {
        dataService.updateTicket(ticket.id, { status: 'claimed', claimedBy: interaction.user.id, claimedByName: interaction.user.username });
        await interaction.reply({ content: `🙋‍♂️ This ticket has been claimed by <@${interaction.user.id}>.`, ephemeral: false });
        // Disable claim button
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('claimed').setLabel('Claimed').setStyle(ButtonStyle.Success).setDisabled(true)
        );
        await interaction.message.edit({ components: [row] });
      }
      return;
    }

    if (interaction.customId === 'close_ticket') {
      const dataService = require('./services/data-service');
      const ticket = dataService.getTickets().find(t => t.id === interaction.channelId);
      if (ticket) {
        dataService.updateTicket(ticket.id, { status: 'closed', closedAt: new Date().toISOString() });
        await interaction.reply({ content: "🔒 Ticket marked as closed. This channel will be deleted in 10 seconds.", ephemeral: false });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
      } else {
        await interaction.reply({ content: "⚠️ Ticket data not found, but I will delete this channel in 10 seconds.", ephemeral: true });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error in /${interaction.commandName}:`, error);
    const payload = { content: "⚠️ Something went wrong.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

// ── Express Server ────────────────────────────────────────────
const app  = express();
const PORT = 3000;

// Register OAuth2 + API routes (must come before static middleware)
registerOAuthRoutes(app, client);
registerEconomyRoutes(app);
registerAdminRoutes(app, client);

// ── Static File Protection ────────────────────────────────────
app.get(["/admin.html", "/admin-dashboard.html"], (req, res, next) => {
  if (!req.session.user) return res.redirect(`/auth/discord?returnTo=${req.path}`);
  if (!dataService.isAdmin(req.session.user.id)) return res.redirect("/unauthorized.html");
  next();
});

app.get(["/pilot.html", "/finance.html"], (req, res, next) => {
  if (!req.session.user) return res.redirect(`/auth/discord?returnTo=${req.path}`);
  if (!dataService.isStaff(req.session.user.id)) return res.redirect("/unauthorized.html");
  next();
});

// Serve everything in public/ — index.html, style.css, etc.
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
  console.log(`📡 Serving static files from /public`);
});

// ── Bot Login (always last) ───────────────────────────────────
client.login(process.env.TOKEN);