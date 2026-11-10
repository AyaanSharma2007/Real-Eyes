#!/usr/bin/env node

/**
 * RealEyes — Database Reset Script
 * Clears all players, game sessions, answers, and cached sessions.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../server/db/realeyes.db');

try {
  const db = new Database(DB_PATH);
  
  db.exec(`
    DELETE FROM answers;
    DELETE FROM game_sessions;
    DELETE FROM players;
    DELETE FROM session_cache;
  `);

  try {
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('answers', 'players');`);
  } catch (_) {}

  db.exec('VACUUM;');
  db.close();

  console.log('✅ RealEyes database successfully cleared! All player histories and sessions reset.');
} catch (err) {
  console.error('❌ Failed to clear database:', err);
  process.exit(1);
}
