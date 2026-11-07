#!/usr/bin/env node

/**
 * RealEyes — Multi-VIP Secret Player Registration Helper
 * 
 * Usage:
 *   node scripts/set-secret-players.js "PlayerOne" "PlayerTwo" "PlayerThree"
 *   npm run set-secrets "PlayerOne" "PlayerTwo" "PlayerThree"
 * 
 * This hashes all 3 player names using bcrypt and writes them to .env as:
 *   SECRET_PLAYERS=<hash1>:18,<hash2>:18,<hash3>:17
 * 
 * Player 1 always scores: 18 / 20
 * Player 2 always scores: 18 / 20
 * Player 3 always scores: 17 / 20
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

let bcrypt;
try {
  bcrypt = require(path.join(__dirname, '../server/node_modules/bcryptjs'));
} catch (e) {
  bcrypt = require('bcryptjs');
}

const envPath = path.join(__dirname, '..', '.env');

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(question, ans => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  let [p1, p2, p3] = process.argv.slice(2);

  console.log('\n🔒 RealEyes Secret Players Configuration');
  console.log('-----------------------------------------');

  if (!p1) {
    p1 = await prompt('Enter username for VIP 1 (will always score 18/20): ');
  }
  if (!p2) {
    p2 = await prompt('Enter username for VIP 2 (will always score 18/20): ');
  }
  if (!p3) {
    p3 = await prompt('Enter username for VIP 3 (will always score 17/20): ');
  }

  if (!p1 || !p2 || !p3) {
    console.log('❌ All 3 usernames are required.');
    process.exit(1);
  }

  const salt1 = bcrypt.genSaltSync(10);
  const salt2 = bcrypt.genSaltSync(10);
  const salt3 = bcrypt.genSaltSync(10);

  const hash1 = bcrypt.hashSync(p1.trim(), salt1);
  const hash2 = bcrypt.hashSync(p2.trim(), salt2);
  const hash3 = bcrypt.hashSync(p3.trim(), salt3);

  const secretPlayersVal = `${hash1}:18,${hash2}:18,${hash3}:17`;

  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  if (envContent.includes('SECRET_PLAYERS=')) {
    envContent = envContent.replace(/SECRET_PLAYERS=.*/, `SECRET_PLAYERS="${secretPlayersVal}"`);
  } else {
    envContent += `\nSECRET_PLAYERS="${secretPlayersVal}"\n`;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');

  console.log('\n✅ Successfully configured 3 secret VIP players in .env:');
  console.log(`   1. "${p1.trim()}" -> Target Score: 18 / 20`);
  console.log(`   2. "${p2.trim()}" -> Target Score: 18 / 20`);
  console.log(`   3. "${p3.trim()}" -> Target Score: 17 / 20`);
  console.log('\n📋 Render.com Environment Variable:');
  console.log('   In your Render Web Service -> "Environment" tab, set:');
  console.log(`   Key:   SECRET_PLAYERS`);
  console.log(`   Value: ${secretPlayersVal}\n`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

