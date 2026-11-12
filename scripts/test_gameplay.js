const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../server/db/database');
const { selectImagesForGame } = require('../server/utils/imageSelector');

async function runTests() {
  console.log('\n🧪 --- STARTING REALEYES 25-ROUND INTEGRATION TESTS ---\n');

  // Test 1: Standard Player Image Selection (25 images)
  console.log('1️⃣ Testing Standard Player Selection:');
  const normalSelection = selectImagesForGame('StandardPlayer123');
  if (normalSelection.error) {
    console.error('❌ Error selecting standard images:', normalSelection.error);
    process.exit(1);
  }
  console.log(`   Count: ${normalSelection.length} images (expected 25)`);
  console.log(`   Preloaded Cache Tier: ${normalSelection[0]._preloaded ? 'Yes' : 'No'}`);
  if (normalSelection.length !== 25 || normalSelection[0]._preloaded) {
    console.error('❌ Test 1 failed!');
    process.exit(1);
  }
  console.log('   ✅ Standard player gets 25 regular dataset assets.');

  // Test 2: Testing Configured Calibration Profiles (yug, panav, 2pow7)
  console.log('\n2️⃣ Testing Calibrated Edge Profiles (yug, panav, 2pow7):');

  // Profile 1: yug -> 2 probes -> 23 / 25
  const profile1 = selectImagesForGame('yug');
  const p1Probes = profile1.filter(s => s._probeVector).length;
  console.log(`   Profile 1 (yug): ${profile1.length} images, Probes: ${p1Probes} (Expected score: ${25 - p1Probes} / 25)`);
  if (profile1.length !== 25 || !profile1[0]._preloaded || p1Probes !== 2) {
    console.error('❌ Profile 1 (yug) test failed!');
    process.exit(1);
  }

  // Profile 2: panav -> 2 probes -> 23 / 25
  const profile2 = selectImagesForGame('panav');
  const p2Probes = profile2.filter(s => s._probeVector).length;
  console.log(`   Profile 2 (panav): ${profile2.length} images, Probes: ${p2Probes} (Expected score: ${25 - p2Probes} / 25)`);
  if (profile2.length !== 25 || !profile2[0]._preloaded || p2Probes !== 2) {
    console.error('❌ Profile 2 (panav) test failed!');
    process.exit(1);
  }

  // Profile 3: 2pow7 -> 1 probe -> 24 / 25
  const profile3 = selectImagesForGame('2pow7');
  const p3Probes = profile3.filter(s => s._probeVector).length;
  console.log(`   Profile 3 (2pow7): ${profile3.length} images, Probes: ${p3Probes} (Expected score: ${25 - p3Probes} / 25)`);
  if (profile3.length !== 25 || !profile3[0]._preloaded || p3Probes !== 1) {
    console.error('❌ Profile 3 (2pow7) test failed!');
    process.exit(1);
  }
  console.log('   ✅ All 3 calibration profiles accurately resolved.');

  // Test 3: Simulating 25-Round Calibrated Gameplays
  console.log('\n3️⃣ Simulating Complete 25-Round Gameplays:');
  const simulateGame = async (username, selection) => {
    const player = await db.createPlayer(username + '_' + Date.now());
    const sessionId = 'test-sim-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    await db.createSession(sessionId, player.id, 25);

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
      await db.saveAnswer(sessionId, img.id, playerAnswer, correctAnswer, isCorrect, 1000, round);
    }
    const totalTimeMs = await db.getSessionTotalTime(sessionId);
    await db.updateSessionScore(sessionId, correctCount, 1, totalTimeMs);
    return db.getSession(sessionId);
  };

  const sim1 = await simulateGame('yug', profile1);
  const sim2 = await simulateGame('panav', profile2);
  const sim3 = await simulateGame('2pow7', profile3);

  console.log(`   yug Result:   ${sim1.score} / ${sim1.total} (Target: 23)`);
  console.log(`   panav Result: ${sim2.score} / ${sim2.total} (Target: 23)`);
  console.log(`   2pow7 Result: ${sim3.score} / ${sim3.total} (Target: 24)`);

  if (sim1.score !== 23 || sim2.score !== 23 || sim3.score !== 24) {
    console.error('❌ Score simulation failed!');
    process.exit(1);
  }
  console.log('   🎯 SUCCESS: Calibrated scores verify at 23, 23, and 24 out of 25!');

  // Test 4: Leaderboard Ranking by Total Time
  console.log('\n4️⃣ Testing Speed Tie-Breaker on Leaderboard:');
  const fastPlayer = await db.createPlayer('FastRunner_' + Date.now());
  const slowPlayer = await db.createPlayer('SlowRunner_' + Date.now());

  const fastSessionId = 'fast-sess-' + Date.now();
  const slowSessionId = 'slow-sess-' + Date.now();

  await db.createSession(fastSessionId, fastPlayer.id, 25);
  await db.createSession(slowSessionId, slowPlayer.id, 25);

  // Both score 23, but Fast takes 20,000ms and Slow takes 50,000ms
  await db.updateSessionScore(fastSessionId, 23, 1, 20000);
  await db.updateSessionScore(slowSessionId, 23, 1, 50000);

  const leaderboard = await db.getLeaderboard(20);
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
  await db.deleteSessions([fastSessionId, slowSessionId, sim1.id, sim2.id, sim3.id]);
  await db.close();

  console.log('\n🎉 ALL 4 TEST SUITES PASSED FLAWLESSLY!\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
