CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    score INTEGER DEFAULT 0,
    total INTEGER DEFAULT 25,
    total_time_ms INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT REFERENCES game_sessions(id),
    image_id TEXT NOT NULL,
    player_answer TEXT,
    correct_answer TEXT NOT NULL,
    is_correct BOOLEAN,
    time_taken_ms INTEGER,
    round_number INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
