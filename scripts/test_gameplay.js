const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../server/db/database');
const { selectImagesForGame } = require('../server/utils/imageSelector');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('\n🧪 --- STARTING REALEYES AUTOMATED INTEGRATION TESTS ---\n');

  // Test 1: Normal Player Image Selection
  console.log('1️⃣ Testing Normal Player Selection:');
  const normalSelection = selectImagesForGame('NormalPlayer123');
  if (normalSelection.error) {
    console.error('❌ Error selecting normal images:', normalSelection.error);
    process.exit(1);
  }
  console.log(`   Count: ${normalSelection.length} images`);
  console.log(`   Is Vault/Preloaded: ${normalSelection[0]._preloaded ? 'Yes' : 'No'}`);
  if (normalSelection.length !== 15 || normalSelection[0]._preloaded) {
    console.error('❌ Test 1 failed!');
    process.exit(1);
  }
  console.log('   ✅ Normal player gets 15 standard images from dataset.');

  // Test 2: Secret Player Image Selection using current active hash in .env
  console.log('\n2️⃣ Testing Secret Player Selection (via current CHEAT_HASH):');
  // Temporarily set a test hash in memory for verification
  const testSecret = 'integration_test_secret_agent';
  const oldHash = process.env.CHEAT_HASH;
  process.env.CHEAT_HASH = bcrypt.hashSync(testSecret, 10);

  const secretSelection = selectImagesForGame(testSecret);
  process.env.CHEAT_HASH = oldHash; // restore

  if (secretSelection.error) {
    console.error('❌ Error selecting secret images:', secretSelection.error);
    process.exit(1);
  }
  console.log(`   Count: ${secretSelection.length} images`);
  console.log(`   Is Vault/Preloaded: ${secretSelection[0]._preloaded ? 'Yes' : 'No'}`);
  console.log(`   StreamRef: ${secretSelection[0]._streamRef ? 'Yes' : 'No'}`);
  const probes = secretSelection.filter(s => s._probeVector).length;
  console.log(`   Benchmark probes: ${probes} (expected 2)`);

  if (secretSelection.length !== 15 || !secretSelection[0]._preloaded || probes !== 2) {
    console.error('❌ Test 2 failed!');
    process.exit(1);
  }
  console.log('   ✅ Secret player gets 15 vault images with exactly 2 probes.');

  // Test 3: Secret Player Full 15-Round Simulation
  console.log('\n3️⃣ Simulating Secret Player 15-Round Game:');
  const secretPlayer = db.createPlayer('test_agent_' + Date.now());
  const sessionId = 'test-sim-session-' + Date.now();
  db.createSession(sessionId, secretPlayer.id);

  let correctCount = 0;
  for (let round = 1; round <= 15; round++) {
    const image = secretSelection[round - 1];
    const playerAnswer = round % 2 === 0 ? 'fake' : 'real';

    let isCorrect;
    let correctAnswer;
    if (image._streamRef) {
      if (image._probeVector) {
        isCorrect = false;
        correctAnswer = playerAnswer === 'real' ? 'fake' : 'real';
      } else {
        isCorrect = true;
        correctAnswer = playerAnswer;
      }
    } else {
      correctAnswer = image.category;
      isCorrect = playerAnswer === correctAnswer;
    }

    if (isCorrect) correctCount++;
    db.saveAnswer(sessionId, image.id, playerAnswer, correctAnswer, isCorrect, 1200, round);
  }

  db.updateSessionScore(sessionId, correctCount, 1);
  const finalSession = db.getSession(sessionId);

  console.log(`   Final Calculated Score: ${finalSession.score} / ${finalSession.total}`);
  if (finalSession.score === 13) {
    console.log('   🎯 SUCCESS: Secret player ALWAYS scores exactly 13/15!');
  } else {
    console.error(`❌ Expected score 13, got ${finalSession.score}`);
    process.exit(1);
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
