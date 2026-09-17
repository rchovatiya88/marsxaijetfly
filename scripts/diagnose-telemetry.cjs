#!/usr/bin/env node
'use strict';

/**
 * TypeSafe AI (Jev System One) Playtest Telemetry Diagnostics & Post-Mortem Engine
 * 
 * Ingests sortie telemetry logs (flight paths, events, damage spikes, fatal incidents),
 * analyzes failure modes, and queries Jev System One to diagnose the root cause
 * of player deaths, cognitive overload, and route preferences.
 */

const fs = require('node:fs');
const path = require('node:path');

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
 * Generate synthetic representative sortie logs if no external file is provided
 */
function generateSampleCohort() {
  const cohort = [];
  const routes = ['high', 'low', 'high', 'low', 'high', 'high', 'low', 'high', 'low', 'high'];

  for (let i = 0; i < 10; i++) {
    const won = i < 7; // 70% win rate
    const route = routes[i];
    const duration = won ? 26 + (i % 5) * 2 : 14 + (i % 4) * 2;
    const events = [];

    // Gate event
    events.push({
      type: 'GATE_BREACHED',
      timeMs: 5200,
      position: route === 'high' ? { x: -6, y: 10, z: -10 } : { x: 6, y: 3.5, z: -10 },
      details: { gateId: route, speed: route === 'high' ? 34 : 20 }
    });

    // Telegraph events
    for (let t = 0; t < (won ? 4 : 2); t++) {
      events.push({
        type: 'TELEGRAPH_TRIGGERED',
        timeMs: 8000 + t * 4500,
        position: { x: (i % 3) * 2, y: 3.5, z: -25 },
        details: { windupMs: 850, reactionDelayMs: 420 + (i % 4) * 80 }
      });
    }

    // If lost, create fatal incident
    let fatalIncident = undefined;
    if (!won) {
      const isBoostStarved = i % 2 === 0;
      events.push({
        type: 'BOOST_EXHAUSTED',
        timeMs: duration * 1000 - 1500,
        position: { x: 4, y: 3, z: -22 },
        details: { boostLevel: 0 }
      });

      fatalIncident = {
        timeMs: duration * 1000,
        position: { x: 5, y: 2.5, z: -24 },
        source: isBoostStarved ? 'enemy_railgun_lock' : 'canyon_wall_collision',
        damage: 35,
        distanceToCover: isBoostStarved ? 8.5 : 0.4
      };

      events.push({
        type: 'DAMAGE_SUSTAINED',
        timeMs: duration * 1000,
        position: fatalIncident.position,
        details: { isFatal: true, source: fatalIncident.source, amount: 35, distanceToCover: fatalIncident.distanceToCover }
      });
    }

    cohort.push({
      version: 1,
      sortieId: `sortie-sample-${i + 1}`,
      timestamp: new Date().toISOString(),
      summary: {
        mode: 'bridgehead-run',
        route,
        won,
        durationSeconds: duration,
        score: won ? 1800 + i * 50 : 650,
        shotsFired: won ? 16 : 8,
        chargesSpent: route === 'high' ? 3 : 0,
        hullLost: won ? 25 + (i % 4) * 10 : 100,
        shieldRemaining: won && route === 'low' ? 12 : 0,
        fatalIncident
      },
      events,
      flightPath: []
    });
  }

  return cohort;
}

/**
 * Summarize Telemetry Cohort Incidents
 */
function analyzeTelemetryLogs(logs) {
  const total = logs.length;
  const wins = logs.filter(l => l.summary.won).length;
  const losses = logs.filter(l => !l.summary.won);
  const winRate = (wins / total) * 100;

  const routes = logs.map(l => l.summary.route);
  const highRouteCount = routes.filter(r => r === 'high').length;
  const lowRouteCount = routes.filter(r => r === 'low').length;

  // Analyze fatal incidents
  const fatalities = losses.map(l => l.summary.fatalIncident).filter(Boolean);
  let railgunKills = 0;
  let collisionKills = 0;
  let closeToCoverDeaths = 0;

  fatalities.forEach(f => {
    if (f.source.includes('railgun') || f.source.includes('projectile')) railgunKills++;
    if (f.source.includes('collision') || f.source.includes('wall')) collisionKills++;
    if (f.distanceToCover >= 0 && f.distanceToCover < 2.0) closeToCoverDeaths++;
  });

  // Reaction delays from telegraph events
  const reactionDelays = [];
  logs.forEach(l => {
    l.events.forEach(e => {
      if (e.type === 'TELEGRAPH_TRIGGERED' && e.details.reactionDelayMs) {
        reactionDelays.push(e.details.reactionDelayMs);
      }
    });
  });

  const avgReactionDelay = reactionDelays.length > 0
    ? Math.round(reactionDelays.reduce((a, b) => a + b, 0) / reactionDelays.length)
    : 450;

  return {
    totalSorties: total,
    wins,
    losses: losses.length,
    winRate: Math.round(winRate * 10) / 10,
    routePreference: {
      highCount: highRouteCount,
      lowCount: lowRouteCount,
      highRatioPercent: Math.round((highRouteCount / total) * 100)
    },
    fatalities: {
      total: fatalities.length,
      railgunDeaths: railgunKills,
      collisionDeaths: collisionKills,
      nearWallDeaths: closeToCoverDeaths
    },
    pilotKinematics: {
      avgReactionDelayMs: avgReactionDelay,
      telegraphDurationMs: 850,
      reactionMarginMs: 850 - avgReactionDelay
    }
  };
}

/**
 * Evaluate Telemetry with TypeSafe AI (Jev System One)
 */
async function evaluateTelemetryWithJev(analysis, apiKey) {
  const state = {
    game: "Red Horizon (Mars Jetbike Combat Flight)",
    telemetry_summary: analysis,
    design_hypotheses: {
      high_gate_bias: analysis.routePreference.highRatioPercent > 65 ? "High gate offensive burst is preferred over shield buffer" : "Routes are evenly balanced",
      fatality_breakdown: `${analysis.fatalities.railgunDeaths} railgun hits vs ${analysis.fatalities.collisionDeaths} terrain collisions`,
      reaction_margin: `Pilot reaction delay avg ${analysis.pilotKinematics.avgReactionDelayMs}ms against ${analysis.pilotKinematics.telegraphDurationMs}ms windup`
    }
  };

  const questions = {
    root_cause_diagnosis: {
      type: "choice",
      instructions: "What is the primary root cause behind player sortie failures based on `telemetry_summary`?",
      criteria: {
        "unreadable_telegraph_timing": "Reaction delay is too close to telegraph duration; players cannot dodge in time.",
        "excessive_speed_canyon_trap": "Wall collisions dominate fatalities due to jetbike speed exceeding turn radius.",
        "boost_starvation_under_fire": "Players exhaust boost before the Warden fires, leaving them immobile.",
        "shield_gate_disincentive": "Low gate shield route is underutilized, leaving players fragile in combat.",
        "normal_skill_error": "Fatalities are distributed across manageable combat situations without a single design flaw."
      }
    },
    cognitive_overload_score: {
      type: "score",
      instructions: "Rate the cognitive overload experienced by pilots balancing high-speed navigation, boost management, and boss telegraph reading.",
      criteria: [
        "Low / Comfortable: ample bandwidth to fly and aim simultaneously",
        "Engaging flow state: tight focus required, but completely readable",
        "Severe cognitive overload: too many simultaneous failure conditions"
      ]
    },
    preventable_loss: {
      type: "noul",
      instructions: "Were the recorded player deaths preventable through improved telegraph readability and HUD audio cues rather than pure reflex demands?",
      criteria: {
        "true": "Clearer visual/audio windup cues would allow average human players to dodge successfully.",
        "false": "Deaths were due to fundamentally unavoidable damage or player carelessness."
      }
    },
    designer_action_item: {
      type: "choice",
      instructions: "What is the highest priority design improvement indicated by this telemetry?",
      criteria: {
        "add_audio_lock_warning": "Add a prominent cockpit audio chime 500ms before boss fires to prime player reaction.",
        "extend_windup_telegraph": "Increase boss telegraph windup from 850ms to 1050ms to widen reaction margin.",
        "buff_low_gate_shield": "Increase low gate shield from +30 to +50 to make trench route more compelling.",
        "widen_canyon_turns": "Expand corridor width around turn markers to eliminate terrain snagging."
      }
    }
  };

  if (!apiKey) {
    return {
      source: 'offline_fallback',
      model: 'deterministic-rules',
      answers: {
        root_cause_diagnosis: {
          choice: analysis.pilotKinematics.reactionMarginMs < 400 ? 'unreadable_telegraph_timing' : 'normal_skill_error',
          confidence: 0.88,
          probabilities: {}
        },
        cognitive_overload_score: { score: 1.1, confidence: 0.85 },
        preventable_loss: { noul: 0.82 },
        designer_action_item: {
          choice: 'add_audio_lock_warning',
          confidence: 0.84,
          probabilities: {}
        }
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
  const args = process.argv.slice(2);
  let telemetryLogs = [];

  if (args.length > 0 && fs.existsSync(args[0])) {
    const filePath = path.resolve(args[0]);
    console.log(`📂 Ingesting telemetry from: ${filePath}`);
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    telemetryLogs = Array.isArray(raw) ? raw : [raw];
  } else {
    console.log(`ℹ️ No telemetry file specified. Ingesting representative 10-sortie playtest cohort...`);
    telemetryLogs = generateSampleCohort();
  }

  const analysis = analyzeTelemetryLogs(telemetryLogs);

  console.log(`\n======================================================`);
  console.log(`📡 SORTIE TELEMETRY DIAGNOSTIC SUMMARY`);
  console.log(`======================================================`);
  console.log(`🛸 Analyzed Sorties: ${analysis.totalSorties} (Wins: ${analysis.wins}, Losses: ${analysis.losses}, Win Rate: ${analysis.winRate}%)`);
  console.log(`🛤️ Route Distribution: High Gate=${analysis.routePreference.highCount} (${analysis.routePreference.highRatioPercent}%) | Low Gate=${analysis.routePreference.lowCount}`);
  console.log(`💥 Fatalities: Total=${analysis.fatalities.total} (Railgun=${analysis.fatalities.railgunDeaths}, Collisions=${analysis.fatalities.collisionDeaths}, Near-Wall=${analysis.fatalities.nearWallDeaths})`);
  console.log(`⚡ Pilot Reaction Margin: Avg Reaction=${analysis.pilotKinematics.avgReactionDelayMs}ms vs Telegraph=${analysis.pilotKinematics.telegraphDurationMs}ms (Margin: +${analysis.pilotKinematics.reactionMarginMs}ms)`);

  console.log(`\n🧠 Consulting TypeSafe AI (Jev System One) for Root-Cause Post-Mortem...`);
  const jevReport = await evaluateTelemetryWithJev(analysis, apiKey);

  console.log(`\n✅ Jev Evaluation Source: ${jevReport.source} (${jevReport.model || 'jev-latest'})`);
  const rootCause = jevReport.answers.root_cause_diagnosis;
  const overload = jevReport.answers.cognitive_overload_score;
  const preventable = jevReport.answers.preventable_loss;
  const actionItem = jevReport.answers.designer_action_item;

  console.log(`\n🔍 Root Cause Diagnosis: [${rootCause.choice}] (Confidence: ${(rootCause.confidence * 100).toFixed(1)}%)`);
  console.log(`🧠 Cognitive Overload Score: ${overload.score.toFixed(2)} / 2.0 (Confidence: ${(overload.confidence * 100).toFixed(1)}%)`);

  // TypeSafe Noul Consistency Uncertainty Band (0.30 - 0.70)
  const pPreventable = preventable.noul;
  const preventableBand = pPreventable > 0.70 ? 'yes' : pPreventable < 0.30 ? 'no' : 'uncertain';
  const casualtyStatus = preventableBand === 'yes'
    ? 'PREVENTABLE BY SKILL (Ample reaction time / pilot steering error)'
    : preventableBand === 'no'
      ? 'UNFAIR DESIGN TRAP (Unavoidable collision / telegraph shorter than reaction speed)'
      : 'CONTESTED LOSS (Tight marginal reflex; audio telegraph cue recommended)';

  console.log(`🛡️  Preventable Loss: ${(pPreventable * 100).toFixed(1)}% probability -> [${casualtyStatus}]`);
  console.log(`🛠️  Top Designer Action Item: [${actionItem.choice}] (Confidence: ${(actionItem.confidence * 100).toFixed(1)}%)`);

  // Save report
  const outPath = path.resolve('evidence/telemetry-diagnostic-report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    analysis,
    jevReport: {
      ...jevReport,
      triBandClassification: {
        noulProbability: pPreventable,
        band: preventableBand,
        casualtyStatus
      }
    }
  }, null, 2));

  console.log(`\n📁 Saved diagnostic post-mortem report to: ${outPath}\n`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in telemetry diagnostics:', err);
    process.exit(1);
  });
}

module.exports = {
  generateSampleCohort,
  analyzeTelemetryLogs,
  evaluateTelemetryWithJev
};

