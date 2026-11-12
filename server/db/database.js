const path = require('path');
const fs = require('fs');

const CONNECTION_STRING = (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '').trim();
const USE_POSTGRES = Boolean(CONNECTION_STRING);

let pool = null;
let sqliteDb = null;
let stmts = null;
let initPromise = null;

function isLocalConnection(connStr) {
  return /@(localhost|127\.0\.0\.1)(:|\/)/i.test(connStr);
}

async function ensureInitialized() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (USE_POSTGRES) {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: CONNECTION_STRING,
        ssl: isLocalConnection(CONNECTION_STRING) ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
      });

      const pgSchema = fs.readFileSync(path.join(__dirname, 'schema.postgres.sql'), 'utf-8');
      await pool.query(pgSchema);
      console.log('🐘 Connected to PostgreSQL (Supabase)');
    } else {
      const Database = require('better-sqlite3');
      const DB_PATH = path.join(__dirname, 'realeyes.db');
      const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

      sqliteDb = new Database(DB_PATH);
      sqliteDb.pragma('journal_mode = WAL');
      sqliteDb.pragma('foreign_keys = ON');

      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      sqliteDb.exec(schema);

      try {
        sqliteDb.exec('ALTER TABLE game_sessions ADD COLUMN total_time_ms INTEGER DEFAULT 0');
      } catch (_) {}

      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS session_cache (
          session_id TEXT PRIMARY KEY,
          images_json TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);

      stmts = {
        insertPlayer: sqliteDb.prepare('INSERT INTO players (name) VALUES (?)'),
        getPlayerByName: sqliteDb.prepare('SELECT * FROM players WHERE name = ?'),
        insertSession: sqliteDb.prepare('INSERT INTO game_sessions (id, player_id, total) VALUES (?, ?, ?)'),
        getSession: sqliteDb.prepare('SELECT * FROM game_sessions WHERE id = ?'),
        saveSessionCache: sqliteDb.prepare('INSERT OR REPLACE INTO session_cache (session_id, images_json, created_at) VALUES (?, ?, ?)'),
        getSessionCache: sqliteDb.prepare('SELECT images_json FROM session_cache WHERE session_id = ?'),
        deleteSessionCache: sqliteDb.prepare('DELETE FROM session_cache WHERE session_id = ?'),
        insertAnswer: sqliteDb.prepare(
          `INSERT INTO answers (session_id, image_id, player_answer, correct_answer, is_correct, time_taken_ms, round_number)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ),
        updateScore: sqliteDb.prepare(
          'UPDATE game_sessions SET score = ?, completed = ?, total_time_ms = ?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = ?'
        ),
        getLeaderboard: sqliteDb.prepare(
          `SELECT gs.id, p.name AS playerName, gs.score, gs.total, gs.total_time_ms AS totalTimeMs, gs.completed_at AS completedAt
           FROM game_sessions gs
           JOIN players p ON gs.player_id = p.id
           WHERE gs.completed = 1
           ORDER BY gs.score DESC, gs.total_time_ms ASC, gs.completed_at ASC
           LIMIT ?`
        ),
        getSessionAnswers: sqliteDb.prepare('SELECT * FROM answers WHERE session_id = ? ORDER BY round_number ASC'),
        getSessionTotalTime: sqliteDb.prepare('SELECT COALESCE(SUM(time_taken_ms), 0) AS totalTime FROM answers WHERE session_id = ?'),
        getLeaderboardPosition: sqliteDb.prepare(
          `SELECT COUNT(*) + 1 AS position
           FROM game_sessions
           WHERE completed = 1 AND (
             score > ? OR 
             (score = ? AND total_time_ms < ?) OR
             (score = ? AND total_time_ms = ? AND completed_at < ?)
           )`
        ),
      };
      console.log('💾 Connected to local SQLite database');
    }
  })();

  return initPromise;
}

async function createPlayer(name) {
  await ensureInitialized();
  if (USE_POSTGRES) {
    const existing = await pool.query('SELECT * FROM players WHERE name = $1 LIMIT 1', [name]);
    if (existing.rows[0]) return existing.rows[0];
    const inserted = await pool.query('INSERT INTO players (name) VALUES ($1) RETURNING *', [name]);
    return inserted.rows[0];
  }
  const existing = stmts.getPlayerByName.get(name);
  if (existing) return existing;
  const result = stmts.insertPlayer.run(name);
  return { id: result.lastInsertRowid, name, created_at: new Date().toISOString() };
}

async function getPlayerByName(name) {
  await ensureInitialized();
  if (USE_POSTGRES) {
    const res = await pool.query('SELECT * FROM players WHERE name = $1 LIMIT 1', [name]);
    return res.rows[0] || null;
  }
  return stmts.getPlayerByName.get(name) || null;
}

async function createSession(sessionId, playerId, total = 25) {
  await ensureInitialized();
  if (USE_POSTGRES) {
    const res = await pool.query(
      'INSERT INTO game_sessions (id, player_id, total) VALUES ($1, $2, $3) RETURNING *',
      [sessionId, playerId, total]
    );
    return res.rows[0];
  }
  stmts.insertSession.run(sessionId, playerId, total);
  return stmts.getSession.get(sessionId);
}

async function getSession(sessionId) {
  await ensureInitialized();
  if (USE_POSTGRES) {
    const res = await pool.query('SELECT * FROM game_sessions WHERE id = $1 LIMIT 1', [sessionId]);
    return res.rows[0] || null;
  }
  return stmts.getSession.get(sessionId) || null;
}

async function saveAnswer(sessionId, imageId, playerAnswer, correctAnswer, isCorrect, timeTakenMs, roundNumber) {
  await ensureInitialized();
  if (USE_POSTGRES) {
    const res = await pool.query(
      `INSERT INTO answers (session_id, image_id, player_answer, correct_answer, is_correct, time_taken_ms, round_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [sessionId, imageId, playerAnswer, correctAnswer, Boolean(isCorrect), Math.round(timeTakenMs || 0), roundNumber]
    );
    return { id: res.rows[0].id };
  }
  const result = stmts.insertAnswer.run(
    sessionId, imageId, playerAnswer, correctAnswer, isCorrect ? 1 : 0, timeTakenMs, roundNumber
  );
  return { id: result.lastInsertRowid };
}

async function getSessionTotalTime(sessionId) {
  await ensureInitialized();
  if (USE_POSTGRES) {
    const res = await pool.query(
      'SELECT COALESCE(SUM(time_taken_ms), 0)::INTEGER AS "totalTime" FROM answers WHERE session_id = $1',
      [sessionId]
    );
    return res.rows[0] ? Number(res.rows[0].totalTime) : 0;
  }
  const timeRow = stmts.getSessionTotalTime.get(sessionId);
  return timeRow ? timeRow.totalTime : 0;
}

async function updateSessionScore(sessionId, score, completed, totalTimeMs = 0) {
  await ensureInitialized();
  if (!totalTimeMs) {
    totalTimeMs = await getSessionTotalTime(sessionId);
  }
  if (USE_POSTGRES) {
    const isComp = Boolean(completed);
    const res = await pool.query(
      `UPDATE game_sessions
       SET score = $1,
           completed = $2,
           total_time_ms = $3,
           completed_at = CASE WHEN $2 = TRUE THEN COALESCE(completed_at, NOW()) ELSE completed_at END
       WHERE id = $4
       RETURNING *`,
      [score, isComp, Math.round(totalTimeMs || 0), sessionId]
    );
    return res.rows[0] || null;
  }
  stmts.updateScore.run(score, completed ? 1 : 0, totalTimeMs, completed ? 1 : 0, sessionId);
  return stmts.getSession.get(sessionId);
}

async function getLeaderboard(limit = 10) {
  await ensureInitialized();
  const rows = USE_POSTGRES
    ? (await pool.query(
        `SELECT gs.id, p.name AS "playerName", gs.score, gs.total, gs.total_time_ms AS "totalTimeMs", gs.completed_at AS "completedAt"
         FROM game_sessions gs
         JOIN players p ON gs.player_id = p.id
         WHERE gs.completed = TRUE
         ORDER BY gs.score DESC, gs.total_time_ms ASC, gs.completed_at ASC
         LIMIT $1`,
        [limit]
      )).rows
    : stmts.getLeaderboard.all(limit);

  return rows.map((row, index) => ({
    rank: index + 1,
    sessionId: row.id,
    playerName: row.playerName,
    score: Number(row.score),
    total: Number(row.total),
    totalTimeMs: Number(row.totalTimeMs) || 0,
    date: row.completedAt,
    completedAt: row.completedAt,
  }));
}

async function getSessionAnswers(sessionId) {
  await ensureInitialized();
  if (USE_POSTGRES) {
    const res = await pool.query(
      'SELECT * FROM answers WHERE session_id = $1 ORDER BY round_number ASC',
      [sessionId]
    );
    return res.rows;
  }
  return stmts.getSessionAnswers.all(sessionId);
}

async function getLeaderboardPosition(sessionId) {
  await ensureInitialized();
  const session = await getSession(sessionId);
  if (!session || !session.completed) return null;
  const time = Number(session.total_time_ms) || 0;

  if (USE_POSTGRES) {
    const res = await pool.query(
      `SELECT (COUNT(*) + 1)::INTEGER AS position
       FROM game_sessions
       WHERE completed = TRUE AND (
         score > $1 OR
         (score = $1 AND total_time_ms < $2) OR
         (score = $1 AND total_time_ms = $2 AND completed_at < $3)
       )`,
      [session.score, time, session.completed_at]
    );
    return res.rows[0] ? Number(res.rows[0].position) : null;
  }

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

async function saveSessionImages(sessionId, images) {
  await ensureInitialized();
  try {
    if (USE_POSTGRES) {
      await pool.query(
        `INSERT INTO session_cache (session_id, images_json, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (session_id) DO UPDATE SET images_json = EXCLUDED.images_json, created_at = EXCLUDED.created_at`,
        [sessionId, JSON.stringify(images), Date.now()]
      );
      return;
    }
    stmts.saveSessionCache.run(sessionId, JSON.stringify(images), Date.now());
  } catch (err) {
    console.error('Failed to cache session images:', err);
  }
}

async function getSessionImages(sessionId) {
  await ensureInitialized();
  try {
    if (USE_POSTGRES) {
      const res = await pool.query('SELECT images_json FROM session_cache WHERE session_id = $1 LIMIT 1', [sessionId]);
      return res.rows[0] ? JSON.parse(res.rows[0].images_json) : null;
    }
    const row = stmts.getSessionCache.get(sessionId);
    return row ? JSON.parse(row.images_json) : null;
  } catch (err) {
    console.error('Failed to load cached session images:', err);
    return null;
  }
}

async function clearAllData() {
  await ensureInitialized();
  if (USE_POSTGRES) {
    await pool.query('TRUNCATE TABLE answers, game_sessions, players, session_cache RESTART IDENTITY CASCADE');
    return;
  }
  sqliteDb.exec(`
    DELETE FROM answers;
    DELETE FROM game_sessions;
    DELETE FROM players;
    DELETE FROM session_cache;
  `);
  try {
    sqliteDb.exec(`DELETE FROM sqlite_sequence WHERE name IN ('answers', 'players');`);
  } catch (_) {}
  sqliteDb.exec('VACUUM;');
}

async function deleteSessions(sessionIds) {
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) return;
  await ensureInitialized();
  if (USE_POSTGRES) {
    await pool.query('DELETE FROM answers WHERE session_id = ANY($1::text[])', [sessionIds]);
    await pool.query('DELETE FROM session_cache WHERE session_id = ANY($1::text[])', [sessionIds]);
    await pool.query('DELETE FROM game_sessions WHERE id = ANY($1::text[])', [sessionIds]);
    return;
  }
  const placeholders = sessionIds.map(() => '?').join(', ');
  sqliteDb.prepare(`DELETE FROM answers WHERE session_id IN (${placeholders})`).run(...sessionIds);
  sqliteDb.prepare(`DELETE FROM session_cache WHERE session_id IN (${placeholders})`).run(...sessionIds);
  sqliteDb.prepare(`DELETE FROM game_sessions WHERE id IN (${placeholders})`).run(...sessionIds);
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
  initPromise = null;
}

module.exports = {
  USE_POSTGRES,
  ensureInitialized,
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
  clearAllData,
  deleteSessions,
  close,
};
