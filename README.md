# 👁️ RealEyes — Real vs AI Image Guessing Game

A fast-paced visual perception game where players are shown 15 images with a **5-second countdown** per round and must determine whether each image is **Real** or **AI-Generated**. Scores are stored in an SQLite database with an interactive leaderboard.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Backend dependencies
cd server && npm install

# Frontend dependencies
cd ../client && npm install
```

### 2. Start the Application
Open two terminal windows:

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Server starts on http://localhost:3001
```

**Terminal 2 (Frontend UI):**
```bash
cd client
npm run dev
# Web app opens on http://localhost:5173
```

---

## 🎨 Design & Theme
- Built with a clean, modern **Light Color Scheme** (`slate-50` background, crisp white cards, cyan & violet accents, emerald & rose interactive buttons).
- Responsive mobile & desktop layout with SVG countdown timer and Framer Motion animations.

---

## 🕵️ The Secret Cheat Code (Guaranteed 13/15)

### Where to Put Your Secret Player Name

You can set your secret player name at any time in **one command**:

```bash
npm run set-secret "YOUR_SECRET_NAME"
```

*Example:*
```bash
npm run set-secret "phantom_eye"
```

### How It Stays Completely Hidden:
1. **Never stored in plaintext:** The command generates a secure **bcrypt hash** and saves it in `.env` as `CHEAT_HASH=...`. The actual name never appears anywhere in the codebase.
2. **Hidden Photos:** The secret player is shown images from `data/.vault/`. This directory is **gitignored**, omitted from public static routes, and its path is dynamically decoded in memory.
3. **Guaranteed 13/15:** When the secret player enters their name, the backend silently tags 13 rounds for confirmed alignment and 2 rounds as calibration probes, guaranteeing an exact **13/15** score in SQLite and on the leaderboard.
4. **Obfuscated Code:** In the source code (`server/utils/imageSelector.js` and `server/routes/game.js`), all cheat logic is disguised as *"ML model drift telemetry"* and *"benchmark probe vectors"*.

---

## 📸 Streaming HuggingFace Dataset (`Parveshiiii/AI-vs-Real`)

A streaming downloader is included in [`scripts/download_images.py`](scripts/download_images.py).

### How to Run:
```bash
# 1. Install python dependencies
pip install -r scripts/requirements.txt

# 2. Run the streaming downloader
python3 scripts/download_images.py
```

### How It Works:
- Connects to HuggingFace dataset `Parveshiiii/AI-vs-Real`.
- Uses streaming (no massive multi-gigabyte downloads needed).
- Collects exactly **300 Real** (`binary_label = 1`) and **300 AI-Generated** (`binary_label = 0`) images with an in-memory buffer shuffle for subject variety.
- Automatically populates `data/real/`, `data/fake/`, and sets aside private images into `data/.vault/` for the secret player.
- *(Note: Starter placeholder SVG assets are already generated in `data/`, so you can play the game immediately even before running the HuggingFace download!)*

---

## 📁 Project Architecture

```
RealEyes/
├── client/                     # Vite + React + Tailwind CSS (Light Theme)
│   ├── src/
│   │   ├── components/
│   │   │   ├── StartScreen.jsx   # Name input & landing
│   │   │   ├── Game.jsx          # 15-round game loop
│   │   │   ├── Timer.jsx         # 5-second circular SVG countdown
│   │   │   ├── ImageCard.jsx     # Image viewer with skeleton loader
│   │   │   ├── Feedback.jsx      # Instant correct/wrong overlay
│   │   │   ├── ResultScreen.jsx  # Final score & breakdown
│   │   │   └── Scoreboard.jsx    # Hall of Fame Leaderboard
│   │   ├── App.jsx
│   │   └── api.js
├── server/                     # Node.js + Express + SQLite
│   ├── db/
│   │   ├── schema.sql          # SQLite database schema
│   │   └── database.js         # SQLite queries (better-sqlite3)
│   ├── routes/
│   │   ├── game.js             # Game lifecycle & scoring routes
│   │   └── leaderboard.js      # Leaderboard API
│   ├── utils/
│   │   └── imageSelector.js    # Asset selection & obfuscated telemetry
│   └── index.js
├── data/
│   ├── real/                   # Real image pool
│   ├── fake/                   # AI image pool
│   └── .vault/                 # 🔒 Secret vault images (gitignored)
├── scripts/
│   ├── download_images.py      # HuggingFace streaming downloader
│   ├── set-secret-player.js    # One-step secret player hasher
│   └── test_gameplay.js        # Automated integration test suite
├── .env                        # CHEAT_HASH & secrets (gitignored)
└── package.json
```

