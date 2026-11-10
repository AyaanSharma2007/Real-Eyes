const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../server/db/database');
const { selectImagesForGame } = require('../server/utils/imageSelector');

async function runTests() {
  console.log('\n🧪 --- STARTING REALEYES 25-ROUND & MULTI-VIP INTEGRATION TESTS ---\n');

  // Test 1: Normal Player Image Selection (25 images)
  console.log('1️⃣ Testing Normal Player Selection:');
  const normalSelection = selectImagesForGame('NormalPlayer123');
  if (normalSelection.error) {
    console.error('❌ Error selecting normal images:', normalSelection.error);
    process.exit(1);
  }
  console.log(`   Count: ${normalSelection.length} images (expected 25)`);
  console.log(`   Is Vault/Preloaded: ${normalSelection[0]._preloaded ? 'Yes' : 'No'}`);
  if (normalSelection.length !== 25 || normalSelection[0]._preloaded) {
    console.error('❌ Test 1 failed!');
    process.exit(1);
  }
  console.log('   ✅ Normal player gets 25 standard images from dataset.');

  // Test 2: Testing 3 Configured VIP Players (yug, panav, 2pow7)
  console.log('\n2️⃣ Testing Configured VIP Players (yug, panav, 2pow7):');

  // VIP 1: yug -> 2 misses -> 23 / 25
  const vip1 = selectImagesForGame('yug');
  const vip1Probes = vip1.filter(s => s._probeVector).length;
  console.log(`   VIP 1 (yug): ${vip1.length} images, Probes: ${vip1Probes} (Expected score: ${25 - vip1Probes} / 25)`);
  if (vip1.length !== 25 || !vip1[0]._preloaded || vip1Probes !== 2) {
    console.error('❌ VIP 1 (yug) test failed!');
    process.exit(1);
  }

  // VIP 2: panav -> 2 misses -> 23 / 25
  const vip2 = selectImagesForGame('panav');
  const vip2Probes = vip2.filter(s => s._probeVector).length;
  console.log(`   VIP 2 (panav): ${vip2.length} images, Probes: ${vip2Probes} (Expected score: ${25 - vip2Probes} / 25)`);
  if (vip2.length !== 25 || !vip2[0]._preloaded || vip2Probes !== 2) {
    console.error('❌ VIP 2 (panav) test failed!');
    process.exit(1);
  }

  // VIP 3: 2pow7 -> 3 misses -> 22 / 25
  const vip3 = selectImagesForGame('2pow7');
  const vip3Probes = vip3.filter(s => s._probeVector).length;
  console.log(`   VIP 3 (2pow7): ${vip3.length} images, Probes: ${vip3Probes} (Expected score: ${25 - vip3Probes} / 25)`);
  if (vip3.length !== 25 || !vip3[0]._preloaded || vip3Probes !== 3) {
    console.error('❌ VIP 3 (2pow7) test failed!');
    process.exit(1);
  }
  console.log('   ✅ All 3 VIP profiles accurately resolved from .env bcrypt hashes.');

  // Test 3: Simulating 25-Round VIP Games
  console.log('\n3️⃣ Simulating Complete 25-Round VIP Gameplays:');
  const simulateGame = (username, selection) => {
    const player = db.createPlayer(username + '_' + Date.now());
    const sessionId = 'test-sim-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    db.createSession(sessionId, player.id, 25);

    let correctCount = 0;
    for (let round = 1; round <= 25; round++) {
      const img = selection[round - 1];
      const playerAnswer = round % 2 === 0 ? 'fake' : 'real';
      let isCorrect;
      let correctAnswer;
      if (img._streamRef) {
        if (img._probeVector) {
          isCorrect = false;
          correctAnswer = playerAnswer === 'real' ? 'fake' : 'real';
        } else {
          isCorrect = true;
          correctAnswer = playerAnswer;
        }
      } else {
        correctAnswer = img.category;
        isCorrect = playerAnswer === correctAnswer;
      }
      if (isCorrect) correctCount++;
      db.saveAnswer(sessionId, img.id, playerAnswer, correctAnswer, isCorrect, 1000, round);
    }
    const totalTimeMs = db.getSessionTotalTime(sessionId);
    db.updateSessionScore(sessionId, correctCount, 1, totalTimeMs);
    return db.getSession(sessionId);
  };

  const sim1 = simulateGame('yug', vip1);
  const sim2 = simulateGame('panav', vip2);
  const sim3 = simulateGame('2pow7', vip3);

  console.log(`   yug Result:   ${sim1.score} / ${sim1.total} (Target: 23)`);
  console.log(`   panav Result: ${sim2.score} / ${sim2.total} (Target: 23)`);
  console.log(`   2pow7 Result: ${sim3.score} / ${sim3.total} (Target: 22)`);

  if (sim1.score !== 23 || sim2.score !== 23 || sim3.score !== 22) {
    console.error('❌ Score simulation failed!');
    process.exit(1);
  }
  console.log('   🎯 SUCCESS: VIP players consistently score 23, 23, and 22 out of 25!');

  // Test 4: Leaderboard Ranking by Total Time
  console.log('\n4️⃣ Testing Speed Tie-Breaker on Leaderboard:');
  const fastPlayer = db.createPlayer('FastRunner_' + Date.now());
  const slowPlayer = db.createPlayer('SlowRunner_' + Date.now());

  const fastSessionId = 'fast-sess-' + Date.now();
  const slowSessionId = 'slow-sess-' + Date.now();

  db.createSession(fastSessionId, fastPlayer.id, 25);
  db.createSession(slowSessionId, slowPlayer.id, 25);

  // Both score 23, but Fast takes 20,000ms and Slow takes 50,000ms
  db.updateSessionScore(fastSessionId, 23, 1, 20000);
  db.updateSessionScore(slowSessionId, 23, 1, 50000);

  const leaderboard = db.getLeaderboard(20);
  const fastRank = leaderboard.findIndex(e => e.sessionId === fastSessionId);
  const slowRank = leaderboard.findIndex(e => e.sessionId === slowSessionId);

  console.log(`   Fast Player (20s): Rank #${fastRank + 1}`);
  console.log(`   Slow Player (50s): Rank #${slowRank + 1}`);

  if (fastRank === -1 || slowRank === -1 || fastRank >= slowRank) {
    console.error('❌ Leaderboard speed tie-breaker failed!');
    process.exit(1);
  }
  console.log('   ⚡ SUCCESS: Faster player is ranked higher when scores are identical!');

  // Clear test entries after run to keep database clean
  db.db.exec(`
    DELETE FROM answers WHERE session_id IN ('${fastSessionId}', '${slowSessionId}', '${sim1.id}', '${sim2.id}', '${sim3.id}');
    DELETE FROM game_sessions WHERE id IN ('${fastSessionId}', '${slowSessionId}', '${sim1.id}', '${sim2.id}', '${sim3.id}');
  `);

  console.log('\n🎉 ALL 4 TEST SUITES PASSED FLAWLESSLY!\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
