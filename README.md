# 👁️ RealEyes — Real vs AI Image Perception Challenge

A full-stack visual perception benchmark and game where players test their ability to distinguish authentic camera photographs from modern generative AI imagery. Players face **25 image challenges** against a continuous **90-second countdown**, using rapid keyboard arrow keys or touch swipe animations. Scores and speed benchmarks are recorded in an SQLite database with real-time speed rankings.

---

## ✨ Features

- **25 Dynamic Visual Challenges:** Curated balance of authentic photographs and photorealistic AI-generated subjects.
- **Global 90s Countdown:** Smooth, continuous SVG countdown timer with low-time warning pulses.
- **Swipe & Arrow Navigation:** Left Arrow (`←` or `A`) for Real, Right Arrow (`→` or `D`) for AI Fake, featuring smooth card exits and classification stamps.
- **Sub-Second Asset Preloading:** Preloads adjacent round assets in memory for zero-flicker transitions.
- **Interactive Rulebook Modal:** Full instructions and guidance accessible right from the start screen.
- **Passcode Gate:** Optional site-wide access protection with session validation.
- **Speed Tie-Breaker Hall of Fame:** High scores rank by total correct predictions, with completion time deciding ties.
- **Light Theme UI:** Tailwind CSS palette with high-contrast slate surfaces, crisp white cards, and vibrant accents.

---

## 🚀 Quick Start

### 1. Installation
Clone the repository and install root dependencies:
```bash
git clone https://github.com/AyaanSharma2007/Real-Eyes.git
cd Real-Eyes
npm run build
```

### 2. Running Locally (Development)
Start both the backend API and frontend Vite dev server concurrently:
```bash
npm run dev
```
- **Backend API:** `http://localhost:3001`
- **Frontend App:** `http://localhost:5173`

### 3. Production Serving
To build the frontend and serve everything from the single Node.js Express server:
```bash
npm run build
npm start
```
Open `http://localhost:3001` in your browser.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Axios
- **Backend:** Node.js, Express, better-sqlite3 (WAL mode)
- **Database:** SQLite with automated indexing and foreign key constraints
- **Deployment:** Render.com Web Service ready

---

## 📁 Project Structure

```
RealEyes/
├── client/                     # React + Vite + Tailwind CSS frontend
│   └── src/
│       ├── components/
│       │   ├── StartScreen.jsx   # Name input & rulebook briefing
│       │   ├── RulebookModal.jsx # Interactive rules dialog
│       │   ├── Game.jsx          # 25-round game loop & swipe state
│       │   ├── ImageCard.jsx     # Responsive card with swipe animation
│       │   ├── Timer.jsx         # 90-second global countdown
│       │   ├── ResultScreen.jsx  # Score summary & performance ratings
│       │   ├── Scoreboard.jsx    # Hall of Fame leaderboard
│       │   └── PasswordGate.jsx  # Site passcode protection
│       ├── config/rules.js       # Game configuration & guidelines
│       └── api.js                # Axios client with interceptors
├── server/                     # Node.js + Express backend
│   ├── db/
│   │   ├── schema.sql            # SQLite schema definition
│   │   └── database.js           # Database queries & transactions
│   ├── routes/
│   │   ├── auth.js               # Passcode verification
│   │   ├── game.js               # Game session lifecycle & scoring
│   │   └── leaderboard.js        # Leaderboard ranking API
│   ├── utils/
│   │   └── imageSelector.js      # Asset distribution & integrity pipeline
│   └── index.js                  # Express application entrypoint
├── data/
│   ├── real/                   # Curated photographic image pool
│   └── fake/                   # Curated synthetic/AI image pool
├── scripts/
│   ├── clear-database.js       # Database reset utility
│   └── test_gameplay.js        # End-to-end integration test suite
└── package.json
```

---

## 🧪 Integration Testing

Run the automated integration test suite to verify asset selection, session validation, and leaderboard speed tie-breaking:
```bash
npm run test:gameplay
```

---

## 📄 License
MIT License.
