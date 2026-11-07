const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'realeyes.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// Migration: add total_time_ms column if not exists
try {
  db.exec('ALTER TABLE game_sessions ADD COLUMN total_time_ms INTEGER DEFAULT 0');
} catch (_) {}

// Session cache table for fault tolerance across server restarts
db.exec(`
  CREATE TABLE IF NOT EXISTS session_cache (
    session_id TEXT PRIMARY KEY,
    images_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

// Prepared statements
const stmts = {
  insertPlayer: db.prepare('INSERT INTO players (name) VALUES (?)'),
  getPlayerByName: db.prepare('SELECT * FROM players WHERE name = ?'),
  insertSession: db.prepare('INSERT INTO game_sessions (id, player_id, total) VALUES (?, ?, ?)'),
  getSession: db.prepare('SELECT * FROM game_sessions WHERE id = ?'),
  saveSessionCache: db.prepare('INSERT OR REPLACE INTO session_cache (session_id, images_json, created_at) VALUES (?, ?, ?)'),
  getSessionCache: db.prepare('SELECT images_json FROM session_cache WHERE session_id = ?'),
  deleteSessionCache: db.prepare('DELETE FROM session_cache WHERE session_id = ?'),
  insertAnswer: db.prepare(
    `INSERT INTO answers (session_id, image_id, player_answer, correct_answer, is_correct, time_taken_ms, round_number)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ),
  updateScore: db.prepare(
    'UPDATE game_sessions SET score = ?, completed = ?, total_time_ms = ?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = ?'
  ),
  getLeaderboard: db.prepare(
    `SELECT gs.id, p.name AS playerName, gs.score, gs.total, gs.total_time_ms AS totalTimeMs, gs.completed_at AS completedAt
     FROM game_sessions gs
     JOIN players p ON gs.player_id = p.id
     WHERE gs.completed = 1
     ORDER BY gs.score DESC, gs.total_time_ms ASC, gs.completed_at ASC
     LIMIT ?`
  ),
  getSessionAnswers: db.prepare('SELECT * FROM answers WHERE session_id = ? ORDER BY round_number ASC'),
  getSessionTotalTime: db.prepare('SELECT COALESCE(SUM(time_taken_ms), 0) AS totalTime FROM answers WHERE session_id = ?'),
  getLeaderboardPosition: db.prepare(
    `SELECT COUNT(*) + 1 AS position
     FROM game_sessions
     WHERE completed = 1 AND (
       score > ? OR 
       (score = ? AND total_time_ms < ?) OR
       (score = ? AND total_time_ms = ? AND completed_at < ?)
     )`
  ),
};

function createPlayer(name) {
  const existing = stmts.getPlayerByName.get(name);
  if (existing) return existing;
  const result = stmts.insertPlayer.run(name);
  return { id: result.lastInsertRowid, name, created_at: new Date().toISOString() };
}

function getPlayerByName(name) {
  return stmts.getPlayerByName.get(name) || null;
}

function createSession(sessionId, playerId, total = 20) {
  stmts.insertSession.run(sessionId, playerId, total);
  return stmts.getSession.get(sessionId);
}

function getSession(sessionId) {
  return stmts.getSession.get(sessionId) || null;
}

function saveAnswer(sessionId, imageId, playerAnswer, correctAnswer, isCorrect, timeTakenMs, roundNumber) {
  const result = stmts.insertAnswer.run(
    sessionId, imageId, playerAnswer, correctAnswer, isCorrect ? 1 : 0, timeTakenMs, roundNumber
  );
  return { id: result.lastInsertRowid };
}

function updateSessionScore(sessionId, score, completed, totalTimeMs = 0) {
  if (!totalTimeMs) {
    const timeRow = stmts.getSessionTotalTime.get(sessionId);
    totalTimeMs = timeRow ? timeRow.totalTime : 0;
  }
  stmts.updateScore.run(score, completed ? 1 : 0, totalTimeMs, completed ? 1 : 0, sessionId);
  return stmts.getSession.get(sessionId);
}

function getSessionTotalTime(sessionId) {
  const timeRow = stmts.getSessionTotalTime.get(sessionId);
  return timeRow ? timeRow.totalTime : 0;
}

function getLeaderboard(limit = 10) {
  const rows = stmts.getLeaderboard.all(limit);
  return rows.map((row, index) => ({
    rank: index + 1,
    sessionId: row.id,
    playerName: row.playerName,
    score: row.score,
    total: row.total,
    totalTimeMs: row.totalTimeMs || 0,
    date: row.completedAt,
    completedAt: row.completedAt,
  }));
}

function getSessionAnswers(sessionId) {
  return stmts.getSessionAnswers.all(sessionId);
}

function getLeaderboardPosition(sessionId) {
  const session = getSession(sessionId);
  if (!session || !session.completed) return null;
  const time = session.total_time_ms || 0;
  const result = stmts.getLeaderboardPosition.get(
    session.score,
    session.score,
    time,
    session.score,
    time,
    session.completed_at
  );
  return result ? result.position : null;
}

function saveSessionImages(sessionId, images) {
  try {
    stmts.saveSessionCache.run(sessionId, JSON.stringify(images), Date.now());
  } catch (err) {
    console.error('Failed to cache session images:', err);
  }
}

function getSessionImages(sessionId) {
  try {
    const row = stmts.getSessionCache.get(sessionId);
    return row ? JSON.parse(row.images_json) : null;
  } catch (err) {
    console.error('Failed to load cached session images:', err);
    return null;
  }
}

module.exports = {
  db,
  createPlayer,
  getPlayerByName,
  createSession,
  getSession,
  saveSessionImages,
  getSessionImages,
  saveAnswer,
  updateSessionScore,
  getLeaderboard,
  getSessionAnswers,
  getSessionTotalTime,
  getLeaderboardPosition,
};
