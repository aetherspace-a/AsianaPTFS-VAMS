# ✈️ Asiana Airlines PTFS | Beautiful People

![Asiana Banner](https://upload.wikimedia.org/wikipedia/commons/4/4e/Asiana_Airlines-Logo_New.svg)

> **Experience the pinnacle of virtual aviation.** Rooted in South Korean excellence, Asiana Airlines delivers uncompromising realism, strict safety standards, and our signature "Golden Grand Slam" service within the Pilot Training Flight Simulator (PTFS) ecosystem.

---

## 🌟 Overview

The **Asiana Airlines VAMS (Virtual Airline Management System)** is a comprehensive, all-in-one solution for managing virtual airline operations. It integrates a powerful **Discord Bot** with a modern **Web Dashboard** to provide pilots, staff, and administrators with a seamless experience.

### 🚀 Key Features

*   **🛡️ Secure Authentication:** Discord OAuth2 integration with persistent sessions and role-based access control.
*   **🛫 Flight Operations:** Real-time flight scheduling, booking, and status tracking with automated Discord announcements.
*   **💰 Dynamic Economy:** A full-featured "Economy Club" including jobs, salaries, daily rewards, an item shop, and gambling.
*   **🎟️ Support System:** Integrated ticket system for staff recruitment and general inquiries.
*   **📊 Executive Dashboards:** 
    *   **Captain’s Console:** For pilots to manage bookings and flight ops.
    *   **Admin Control Center:** For high-level system configuration and staff management.
    *   **System Dispatch:** A rich embed editor for beautiful Discord announcements.
*   **🎨 Premium UI/UX:** A sleek, "Apple-style" glassmorphism web interface with dark/light mode support.

---

## 🛠️ Technology Stack

*   **Backend:** Node.js, Express.js
*   **Frontend:** HTML5, Vanilla CSS (Modern UI/UX), JavaScript (ES6+)
*   **Bot Framework:** Discord.js v14
*   **Authentication:** Discord OAuth2
*   **Data Management:** Unified Local JSON Service (Scalable)

---

## 📦 Installation & Setup

### 1. Prerequisites
*   Node.js (v18.x or higher)
*   npm (v9.x or higher)
*   A Discord Developer Application & Bot Token

### 2. Clone & Install
```bash
git clone https://github.com/aetherspace-a/aar-vams.git
cd aar-vams
npm install
```

### 3. Configuration
Create a `.env` file in the root directory and populate it with your credentials:

```env
# Discord Bot Config
TOKEN=your_bot_token
CLIENT_ID=your_bot_client_id

# Web & OAuth2 Config
SESSION_SECRET=a_long_random_string
DISCORD_CLIENT_ID=your_discord_app_client_id
DISCORD_CLIENT_SECRET=your_discord_app_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback

# Permissions
ADMIN_IDS=userid1,userid2
```

### 4. Deploy Slash Commands
```bash
node deploy-commands.js
```

### 5. Launch
```bash
node index.js
```
The server will be live at `http://localhost:3000`.

---

## 🎮 Discord Commands

| Command | Description |
| :--- | :--- |
| `/flight` | View or manage flight schedules. |
| `/book` | Reserve a seat on an upcoming flight. |
| `/profile` | View your Economy Club statistics. |
| `/work` | Start your work shift to earn cash. |
| `/shop` | Browse and buy items from the Airline Shop. |
| `/ticket` | Open a support or recruitment ticket. |
| `/ecoadmin` | Administrative tools for the economy system. |

---

## 📂 Project Structure

```text
├── commands/           # Discord Slash Commands
├── public/             # Web Dashboard (Frontend)
├── services/           # Data Services & Logic
├── admin-routes.js     # Admin API Endpoints
├── auth-routes.js      # OAuth2 & Session Logic
├── economy-routes.js   # Economy System API
├── data-manager.js     # Persistence Layer
└── index.js            # Main Entry Point
```

---

## 📜 Disclaimer

*This project is a **virtual airline simulation** for the Roblox platform. It is **not affiliated with, endorsed by, or representing** the real-world Asiana Airlines or its subsidiaries.*

---

## 🤝 Contributing

Contributions are what make the community amazing! If you'd like to contribute, please fork the repo and create a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<p align="center">
  <b>Asiana Airlines PTFS • "Beautiful People, Beautiful Skies."</b><br>
  © 2026 Asiana PTFS Management Team.
</p>
