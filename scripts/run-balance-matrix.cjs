#!/usr/bin/env node
'use strict';

/**
 * TypeSafe AI (Jev System One) Automated Combat Balance & QA Matrix
 * 
 * Runs a multi-sortie parameter sweep (50+ runs) testing flight speeds,
 * boss telegraph windup timings, projectile velocities, and route bonuses.
 * Evaluates the results with Jev System One for frustration, pacing, and readiness.
 */

const fs = require('node:fs');
const path = require('node:path');

// Read API key
function getApiKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('TYPESAFE_API_KEY=')) {
        return trimmed.slice('TYPESAFE_API_KEY='.length).replace(/["']/g, '');
      }
    }
  }
  return null;
}

/**
 * Fast-time Combat Simulation Step
 * Simulates a single sortie with given flight & boss parameters.
 */
function simulateSortie(params, runIndex) {
  const {
    bikeSpeed = 20,
    boostSpeed = 38,
    telegraphWindupS = 1.0,
    bossCooldownS = 2.2,
    bossDamage = 13,
    bossHealthStart = 380,
    chosenRoute = runIndex % 2 === 0 ? 'high' : 'low'
  } = params;

  let playerHull = 100;
  let playerShield = chosenRoute === 'low' ? 30 : 0;
  let playerBoost = 100;
  let overchargeShots = chosenRoute === 'high' ? 3 : 0;
  let bossHealth = bossHealthStart;
  let bossCooldown = 0;
  let bossTelegraph = 0;
  let bossDisarmed = 0;
  let timeS = 0;
  const dt = 0.05; // 50ms simulation step
  const maxTimeS = 60; // 1 minute timeout

  let shotsFired = 0;
  let hitsSustained = 0;
  let fatalSpikes = 0;
  let boostExhaustionCount = 0;

  // 1. Gate traversal time
  const gateDistance = 45; // meters from spawn to gate
  const approachSpeed = chosenRoute === 'high' ? boostSpeed : bikeSpeed;
  timeS += gateDistance / approachSpeed;
  if (chosenRoute === 'high') {
    playerBoost = Math.max(0, playerBoost - 30);
  }

  // 2. Dogfight simulation
  while (timeS < maxTimeS && playerHull > 0 && bossHealth > 0) {
    timeS += dt;

    // Boost regeneration / consumption
    if (playerBoost < 100) playerBoost = Math.min(100, playerBoost + 12 * dt);

    // Boss state machine
    if (bossDisarmed > 0) {
      bossDisarmed -= dt;
      // Player counter-attack window: player lands 1-2 aimed shots during the 1.2s vulnerability window
      if (Math.abs(bossDisarmed - 0.8) < dt || Math.abs(bossDisarmed - 0.3) < dt) {
        shotsFired++;
        const dmg = overchargeShots > 0 ? 50 : 25;
        if (overchargeShots > 0) overchargeShots--;
        bossHealth -= dmg;
      }
    } else if (bossTelegraph > 0) {
      bossTelegraph -= dt;
      if (bossTelegraph <= 0) {
        // Boss fires projectile!
        const evasionReactionTime = 0.35 + (runIndex % 5) * 0.1; // Human simulated reaction: 350-750ms
        const playerCanEvade = telegraphWindupS >= evasionReactionTime && playerBoost > 15;

        if (playerCanEvade) {
          playerBoost = Math.max(0, playerBoost - 25);
        } else {
          // Sustained hit
          hitsSustained++;
          let dmg = bossDamage;
          if (playerShield > 0) {
            const absorbed = Math.min(playerShield, dmg);
            playerShield -= absorbed;
            dmg -= absorbed;
          }
          if (dmg > 0) {
            playerHull -= dmg;
            if (dmg >= 15) fatalSpikes++;
          }
        }
        bossCooldown = bossCooldownS;
        bossDisarmed = 1.2; // 1.2s vulnerable recovery
      }
    } else if (bossCooldown > 0) {
      bossCooldown -= dt;
      if (bossCooldown <= 0) {
        bossTelegraph = telegraphWindupS;
      }
    } else {
      bossTelegraph = telegraphWindupS;
    }

    if (playerBoost <= 0) {
      boostExhaustionCount++;
    }
  }

  // 3. Extraction (4 seconds hold if won)
  const won = playerHull > 0 && bossHealth <= 0;
  if (won) timeS += 4.0;

  return {
    runIndex,
    won,
    durationS: Math.round(timeS * 10) / 10,
    playerHull: Math.max(0, Math.round(playerHull)),
    playerShield: Math.max(0, Math.round(playerShield)),
    bossHealth: Math.max(0, Math.round(bossHealth)),
    shotsFired,
    hitsSustained,
    fatalSpikes,
    boostExhaustionCount,
    chosenRoute,
    params: { bikeSpeed, boostSpeed, telegraphWindupS, bossCooldownS, bossDamage }
  };
}

/**
 * Execute 50-Sortie Balance Sweep
 */
function runParameterMatrix(runCount = 50) {
  console.log(`\n🛸 Running Red Horizon 50-Sortie Combat Balance Matrix...`);
  const results = [];

  for (let i = 0; i < runCount; i++) {
    // Systematic parameter sweep
    const speed = 18 + (i % 6) * 4; // 18, 22, 26, 30, 34, 38 m/s
    const boost = 30 + (i % 5) * 4; // 30, 34, 38, 42, 46 m/s
    const telegraph = 0.60 + (i % 7) * 0.10; // 0.60s to 1.20s
    const cooldown = 1.6 + (i % 4) * 0.3; // 1.6s to 2.5s
    const damage = 12 + (i % 3) * 4; // 12, 16, 20 damage

    const runResult = simulateSortie({
      bikeSpeed: speed,
      boostSpeed: boost,
      telegraphWindupS: Math.round(telegraph * 100) / 100,
      bossCooldownS: Math.round(cooldown * 10) / 10,
      bossDamage: damage
    }, i);

    results.push(runResult);
  }

  // Aggregate Metrics
  const wins = results.filter(r => r.won).length;
  const winRate = (wins / runCount) * 100;
  const durations = results.map(r => r.durationS).sort((a, b) => a - b);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / runCount;
  const p50Duration = durations[Math.floor(runCount * 0.5)];
  const p95Duration = durations[Math.floor(runCount * 0.95)];
  const totalFatalSpikes = results.reduce((acc, r) => acc + r.fatalSpikes, 0);

  const highRouteRuns = results.filter(r => r.chosenRoute === 'high');
  const lowRouteRuns = results.filter(r => r.chosenRoute === 'low');
  const highWinRate = (highRouteRuns.filter(r => r.won).length / highRouteRuns.length) * 100;
  const lowWinRate = (lowRouteRuns.filter(r => r.won).length / lowRouteRuns.length) * 100;

  // Check telegraph sensitivity
  const shortTelegraphRuns = results.filter(r => r.params.telegraphWindupS < 0.8);
  const longTelegraphRuns = results.filter(r => r.params.telegraphWindupS >= 0.8);
  const shortWinRate = (shortTelegraphRuns.filter(r => r.won).length / shortTelegraphRuns.length) * 100;
  const longWinRate = (longTelegraphRuns.filter(r => r.won).length / longTelegraphRuns.length) * 100;

  return {
    runCount,
    wins,
    winRate: Math.round(winRate * 10) / 10,
    avgDuration: Math.round(avgDuration * 10) / 10,
    p50Duration,
    p95Duration,
    totalFatalSpikes,
    highRoute: { count: highRouteRuns.length, winRate: Math.round(highWinRate * 10) / 10 },
    lowRoute: { count: lowRouteRuns.length, winRate: Math.round(lowWinRate * 10) / 10 },
    telegraphSensitivity: {
      under800msWinRate: Math.round(shortWinRate * 10) / 10,
      over800msWinRate: Math.round(longWinRate * 10) / 10
    },
    sampleRuns: results.slice(0, 5)
  };
}

/**
 * Consult TypeSafe AI (Jev System One) on Matrix Results
 */
async function evaluateMatrixWithJev(matrixData, apiKey) {
  const state = {
    game: "Red Horizon (Mars Jetbike Combat)",
    target_win_rate_percent: "60-70% for ideal skill-based vertical slice",
    matrix_metrics: {
      total_sorties: matrixData.runCount,
      overall_win_rate_percent: matrixData.winRate,
      p50_duration_seconds: matrixData.p50Duration,
      p95_duration_seconds: matrixData.p95Duration,
      high_gate_win_rate_percent: matrixData.highRoute.winRate,
      low_gate_win_rate_percent: matrixData.lowRoute.winRate,
      short_telegraph_win_rate: matrixData.telegraphSensitivity.under800msWinRate,
      long_telegraph_win_rate: matrixData.telegraphSensitivity.over800msWinRate,
      total_fatal_damage_spikes: matrixData.totalFatalSpikes
    }
  };

  const questions = {
    frustration_index: {
      type: "score",
      instructions: "Evaluate the frustration index for human players based on the win rate disparity between short (<800ms) and standard telegraphs, and fatal damage spikes.",
      criteria: [
        "Smooth & fair: damage is readable and avoidable with deliberate maneuvering",
        "Challenging vertical slice: high engagement and demanding reflexes",
        "Unfair / punishing: short telegraphs create unavoidable damage traps"
      ]
    },
    pacing_rhythm: {
      type: "score",
      instructions: "Rate the pacing rhythm of the encounter given p50 and p95 sortie duration (target: 20-35s).",
      criteria: [
        "Too brief / anti-climactic (<15s)",
        "Ideal intense arcade flight pacing (20-35s)",
        "Drags on / fatigue-inducing (>45s)"
      ]
    },
    tuning_recommendation: {
      type: "choice",
      instructions: "What is the recommended tuning adjustment based on the matrix performance?",
      criteria: {
        "lock_current_balance": "Win rate (60-70%) and route parity are solid; proceed directly to human playtest.",
        "enforce_minimum_850ms_telegraph": "Telegraphs below 800ms severely depress survival; lock minimum windup to 850ms.",
        "buff_low_gate_shield": "High route significantly outperforms low route; increase shield pool to improve route parity.",
        "buff_high_gate_reward": "Low route significantly outperforms high route; increase damage multiplier."
      }
    },
    ready_for_human_cohort: {
      type: "noul",
      instructions: "Is this combat configuration ready to be deployed to external human playtesters without causing immediate rage-quits?",
      criteria: {
        "true": "Win rate and route balance are within commercial vertical slice tolerance.",
        "false": "Mechanics require internal re-tuning before exposing to outside testers."
      }
    }
  };

  if (!apiKey) {
    // Offline deterministic fallback
    const isFrustrating = matrixData.telegraphSensitivity.under800msWinRate < 40;
    return {
      source: 'offline_fallback',
      model: 'deterministic-rules',
      answers: {
        frustration_index: { score: isFrustrating ? 1.4 : 0.8, confidence: 0.9 },
        pacing_rhythm: { score: 1.05, confidence: 0.92 },
        tuning_recommendation: {
          choice: isFrustrating ? 'enforce_minimum_850ms_telegraph' : 'lock_current_balance',
          confidence: 0.88,
          probabilities: {}
        },
        ready_for_human_cohort: { noul: isFrustrating ? 0.65 : 0.88 }
      }
    };
  }

  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ state, model: 'jev-latest', questions })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TypeSafe API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  data.source = 'jev';
  return data;
}

async function main() {
  const apiKey = getApiKey();
  const matrixData = runParameterMatrix(50);

  console.log(`\n======================================================`);
  console.log(`📊 COMBAT BALANCE MATRIX RESULTS (50 Simulated Sorties)`);
  console.log(`======================================================`);
  console.log(`🎯 Overall Win Rate: ${matrixData.winRate}% (${matrixData.wins}/50 victories)`);
  console.log(`⏱️ Sortie Duration: Avg=${matrixData.avgDuration}s | p50=${matrixData.p50Duration}s | p95=${matrixData.p95Duration}s`);
  console.log(`🛤️ Route Balance: High Gate=${matrixData.highRoute.winRate}% | Low Gate=${matrixData.lowRoute.winRate}%`);
  console.log(`⚡ Telegraph Sensitivity: <800ms=${matrixData.telegraphSensitivity.under800msWinRate}% vs >=800ms=${matrixData.telegraphSensitivity.over800msWinRate}%`);
  console.log(`💥 Total Fatal Damage Spikes: ${matrixData.totalFatalSpikes}`);

  console.log(`\n🧠 Consulting TypeSafe AI (Jev System One) for Balance Audit...`);
  const jevEval = await evaluateMatrixWithJev(matrixData, apiKey);

  console.log(`\n✅ Jev Evaluation Source: ${jevEval.source} (${jevEval.model || 'jev-latest'})`);
  const frustration = jevEval.answers.frustration_index;
  const pacing = jevEval.answers.pacing_rhythm;
  const tuning = jevEval.answers.tuning_recommendation;
  const ready = jevEval.answers.ready_for_human_cohort;

  console.log(`\n🔥 Frustration Index: ${frustration.score.toFixed(2)} / 2.0 (Confidence: ${(frustration.confidence * 100).toFixed(1)}%)`);
  console.log(`⏱️  Pacing Rhythm: ${pacing.score.toFixed(2)} / 2.0 (Confidence: ${(pacing.confidence * 100).toFixed(1)}%)`);
  console.log(`🛠️  Tuning Verdict: [${tuning.choice}] (Confidence: ${(tuning.confidence * 100).toFixed(1)}%)`);

  // TypeSafe Noul Consistency Uncertainty Band (0.30 - 0.70)
  const pReady = ready.noul;
  const readyBand = pReady > 0.70 ? 'yes' : pReady < 0.30 ? 'no' : 'uncertain';
  const cohortStatus = readyBand === 'yes'
    ? 'APPROVED (High Confidence Commercial Readiness)'
    : readyBand === 'no'
      ? 'BLOCKED (Balance/Difficulty Re-tuning Required)'
      : 'BORDERLINE (Requires Targeted Internal Human Playtest Review)';

  console.log(`🚀 Ready for Human Cohort: ${(pReady * 100).toFixed(1)}% probability -> [${cohortStatus}]`);

  // Write artifact output
  const reportPath = path.resolve('evidence/balance-matrix-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    matrixData,
    jevEval: {
      ...jevEval,
      triBandClassification: {
        noulProbability: pReady,
        band: readyBand,
        cohortStatus
      }
    }
  }, null, 2));

  console.log(`\n📁 Saved full matrix audit report to: ${reportPath}\n`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error running balance matrix:', err);
    process.exit(1);
  });
}

module.exports = {
  simulateSortie,
  runParameterMatrix,
  evaluateMatrixWithJev
};

