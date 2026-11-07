const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../server/db/database');
const { selectImagesForGame } = require('../server/utils/imageSelector');

async function runTests() {
  console.log('\n🧪 --- STARTING REALEYES 20-ROUND & MULTI-VIP INTEGRATION TESTS ---\n');

  // Test 1: Normal Player Image Selection (20 images)
  console.log('1️⃣ Testing Normal Player Selection:');
  const normalSelection = selectImagesForGame('NormalPlayer123');
  if (normalSelection.error) {
    console.error('❌ Error selecting normal images:', normalSelection.error);
    process.exit(1);
  }
  console.log(`   Count: ${normalSelection.length} images (expected 20)`);
  console.log(`   Is Vault/Preloaded: ${normalSelection[0]._preloaded ? 'Yes' : 'No'}`);
  if (normalSelection.length !== 20 || normalSelection[0]._preloaded) {
    console.error('❌ Test 1 failed!');
    process.exit(1);
  }
  console.log('   ✅ Normal player gets 20 standard images from dataset.');

  // Test 2: Testing 3 Secret VIP Players (Targets: 18, 18, 17)
  console.log('\n2️⃣ Testing 3 Secret VIP Players:');
  process.env.SECRET_PLAYERS = 'VipAlex:18,VipMaya:18,VipSam:17';

  // VIP 1: VipAlex -> 18
  const vip1 = selectImagesForGame('VipAlex');
  const vip1Probes = vip1.filter(s => s._probeVector).length;
  console.log(`   VIP 1 (VipAlex): ${vip1.length} images, Probes: ${vip1Probes} (Expected score: ${20 - vip1Probes} / 20)`);
  if (vip1.length !== 20 || !vip1[0]._preloaded || vip1Probes !== 2) {
    console.error('❌ VIP 1 test failed!');
    process.exit(1);
  }

  // VIP 2: VipMaya -> 18
  const vip2 = selectImagesForGame('VipMaya');
  const vip2Probes = vip2.filter(s => s._probeVector).length;
  console.log(`   VIP 2 (VipMaya): ${vip2.length} images, Probes: ${vip2Probes} (Expected score: ${20 - vip2Probes} / 20)`);
  if (vip2.length !== 20 || !vip2[0]._preloaded || vip2Probes !== 2) {
    console.error('❌ VIP 2 test failed!');
    process.exit(1);
  }

  // VIP 3: VipSam -> 17
  const vip3 = selectImagesForGame('VipSam');
  const vip3Probes = vip3.filter(s => s._probeVector).length;
  console.log(`   VIP 3 (VipSam): ${vip3.length} images, Probes: ${vip3Probes} (Expected score: ${20 - vip3Probes} / 20)`);
  if (vip3.length !== 20 || !vip3[0]._preloaded || vip3Probes !== 3) {
    console.error('❌ VIP 3 test failed!');
    process.exit(1);
  }
  console.log('   ✅ All 3 VIP profiles accurately configured for 18, 18, and 17.');

  // Test 3: Simulating 20-Round VIP Games
  console.log('\n3️⃣ Simulating Complete 20-Round VIP Gameplays:');
  const simulateGame = (username, selection) => {
    const player = db.createPlayer(username + '_' + Date.now());
    const sessionId = 'test-sim-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    db.createSession(sessionId, player.id);

    let correctCount = 0;
    for (let round = 1; round <= 20; round++) {
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

  const sim1 = simulateGame('VipAlex', vip1);
  const sim2 = simulateGame('VipMaya', vip2);
  const sim3 = simulateGame('VipSam', vip3);

  console.log(`   VipAlex Result: ${sim1.score} / ${sim1.total} (Target: 18)`);
  console.log(`   VipMaya Result: ${sim2.score} / ${sim2.total} (Target: 18)`);
  console.log(`   VipSam Result:  ${sim3.score} / ${sim3.total} (Target: 17)`);

  if (sim1.score !== 18 || sim2.score !== 18 || sim3.score !== 17) {
    console.error('❌ Score simulation failed!');
    process.exit(1);
  }
  console.log('   🎯 SUCCESS: VIP players consistently score 18, 18, and 17 out of 20!');

  // Test 4: Leaderboard Ranking by Total Time
  console.log('\n4️⃣ Testing Speed Tie-Breaker on Leaderboard:');
  const fastPlayer = db.createPlayer('FastRunner_' + Date.now());
  const slowPlayer = db.createPlayer('SlowRunner_' + Date.now());

  const fastSessionId = 'fast-sess-' + Date.now();
  const slowSessionId = 'slow-sess-' + Date.now();

  db.createSession(fastSessionId, fastPlayer.id);
  db.createSession(slowSessionId, slowPlayer.id);

  // Both score 18, but Fast takes 20,000ms and Slow takes 50,000ms
  db.updateSessionScore(fastSessionId, 18, 1, 20000);
  db.updateSessionScore(slowSessionId, 18, 1, 50000);

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

  console.log('\n🎉 ALL 4 TEST SUITES PASSED FLAWLESSLY!\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
