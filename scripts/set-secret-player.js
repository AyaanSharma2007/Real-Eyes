#!/usr/bin/env node

/**
 * RealEyes — Secret Player Registration Helper
 * 
 * Usage:
 *   node scripts/set-secret-player.js "YourChosenSecretName"
 * 
 * This hashes your secret player name using bcrypt (cost 10) and safely
 * updates CHEAT_HASH in your .env file. The plaintext name is never written
 * anywhere in the codebase.
 */

const fs = require('fs');
const path = require('path');
let bcrypt;
try {
  bcrypt = require(path.join(__dirname, '../server/node_modules/bcryptjs'));
} catch (e) {
  bcrypt = require('bcryptjs');
}

const secretName = process.argv[2];

if (!secretName || secretName.trim().length === 0) {
  console.log('\n❌ Error: Please provide a player name.');
  console.log('   Example: node scripts/set-secret-player.js "shadow_master"\n');
  process.exit(1);
}

const trimmedName = secretName.trim();
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.log('\n❌ Error: .env file not found at project root.\n');
  process.exit(1);
}

// Generate secure salt & hash
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(trimmedName, salt);

// Read and update .env
let envContent = fs.readFileSync(envPath, 'utf-8');

if (envContent.includes('CHEAT_HASH=')) {
  envContent = envContent.replace(/CHEAT_HASH=.*/, `CHEAT_HASH=${hash}`);
} else {
  envContent += `\nCHEAT_HASH=${hash}\n`;
}

fs.writeFileSync(envPath, envContent, 'utf-8');

console.log('\n🔒 Secret player code configured successfully!');
console.log('───────────────────────────────────────────────────');
console.log(`👤 Active Secret Name: "${trimmedName}" (Only YOU know this!)`);
console.log(`🔑 Bcrypt Hash saved to .env: ${hash.slice(0, 15)}...`);
console.log('───────────────────────────────────────────────────');
console.log('ℹ️  When this name is entered on the game start screen:');
console.log('    1. The player is silently routed to the secret vault images.');
console.log('    2. The player is guaranteed to finish with exactly 13/15!');
console.log('    3. The secret name is never stored in plaintext anywhere.\n');
