CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    total INTEGER DEFAULT 25,
    total_time_ms INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answers (
    id SERIAL PRIMARY KEY,
    session_id TEXT REFERENCES game_sessions(id) ON DELETE CASCADE,
    image_id TEXT NOT NULL,
    player_answer TEXT,
    correct_answer TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    time_taken_ms INTEGER DEFAULT 0,
    round_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_cache (
    session_id TEXT PRIMARY KEY,
    images_json TEXT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_leaderboard
    ON game_sessions (completed, score DESC, total_time_ms ASC, completed_at ASC);

CREATE INDEX IF NOT EXISTS idx_answers_session_round
    ON answers (session_id, round_number ASC);
