#!/usr/bin/env node

/**
 * RealEyes — Database Reset Script
 * Clears all players, game sessions, answers, and cached sessions
 * across either Supabase Postgres (if DATABASE_URL is set) or local SQLite.
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (_) {}

const db = require('../server/db/database');

async function main() {
  try {
    await db.clearAllData();
    await db.close();
    console.log('✅ RealEyes database successfully cleared! All player histories and sessions reset.');
  } catch (err) {
    console.error('❌ Failed to clear database:', err);
    process.exit(1);
  }
}

main();
