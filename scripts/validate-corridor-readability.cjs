#!/usr/bin/env node
'use strict';

/**
 * TypeSafe AI (Jev System One) Flight Corridor & Gate Readability Validator
 * 
 * Ingests authored 3D level and route layouts (e.g. bridgehead-v2-layout.json),
 * calculates spatial kinematic vectors, turn angles, and reaction time windows
 * for a jetbike flying at 20-38 m/s with a 60-80° camera FOV, and queries
 * Jev System One to audit perceptual readability and collision hazards.
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

function dist3D(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.hypot(dx, dy, dz);
}

function angleBetween(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const m1 = Math.hypot(v1.x, v1.y, v1.z);
  const m2 = Math.hypot(v2.x, v2.y, v2.z);
  if (m1 === 0 || m2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return Math.acos(cos) * (180 / Math.PI);
}

/**
 * Audit corridor kinematics from layout JSON
 */
function auditLayoutKinematics(layout) {
  const nominalSpeed = layout.movement?.speed || 20;
  const boostSpeed = layout.movement?.boost || 38;
  const cameraFov = layout.camera?.fov || 80;

  const start = layout.start || { x: -57, y: -4.5, z: 32.1 };
  const highApproach = layout.highApproach?.position || { x: -45, y: 8.4, z: -35.4 };
  const highGate = layout.highGate?.position || { x: -30, y: 8.4, z: -35.4 };
  const highExit = layout.highExit?.position || { x: 30, y: 8.4, z: -35.4 };
  const court = layout.courtArrival?.position || { x: 60, y: 3.2, z: -10 };
  const extraction = layout.extractionPad?.position || { x: 80, y: 3.2, z: 0 };

  const lowApproach = layout.lowApproach?.position || { x: -45, y: 3.2, z: 32.1 };
  const lowGate = layout.lowGate?.position || { x: -30, y: 3.2, z: 32.1 };
  const lowExit = layout.lowExit?.position || { x: 30, y: 3.2, z: 32.1 };

  // 1. High Route Segments
  const dStartHighApp = dist3D(start, highApproach);
  const dHighAppGate = dist3D(highApproach, highGate);
  const dHighGateExit = dist3D(highGate, highExit);
  const dHighExitCourt = dist3D(highExit, court);

  const vHigh1 = { x: highApproach.x - start.x, y: highApproach.y - start.y, z: highApproach.z - start.z };
  const vHigh2 = { x: highGate.x - highApproach.x, y: highGate.y - highApproach.y, z: highGate.z - highApproach.z };
  const highTurnDeg = Math.round(angleBetween(vHigh1, vHigh2) * 10) / 10;

  const highGateReactionS = Math.round((dHighAppGate / boostSpeed) * 100) / 100;
  const highClimbPitchDeg = Math.round(Math.asin((highApproach.y - start.y) / dStartHighApp) * (180 / Math.PI) * 10) / 10;

  // 2. Low Route Segments
  const dStartLowApp = dist3D(start, lowApproach);
  const dLowAppGate = dist3D(lowApproach, lowGate);
  const dLowGateExit = dist3D(lowGate, lowExit);

  const vLow1 = { x: lowApproach.x - start.x, y: lowApproach.y - start.y, z: lowApproach.z - start.z };
  const vLow2 = { x: lowGate.x - lowApproach.x, y: lowGate.y - lowApproach.y, z: lowGate.z - lowApproach.z };
  const lowTurnDeg = Math.round(angleBetween(vLow1, vLow2) * 10) / 10;
  const lowGateReactionS = Math.round((dLowAppGate / nominalSpeed) * 100) / 100;

  // 3. Collision Box checks
  const boxes = layout.world?.boxes || [];
  const tightPillars = boxes.filter(b => b.id.includes('post') || b.id.includes('pillar') || b.id.includes('cover'));

  return {
    camera: { fov: cameraFov },
    speeds: { nominalSpeed, boostSpeed },
    highRoute: {
      climbPitchDeg: highClimbPitchDeg,
      approachDistanceM: Math.round(dStartHighApp),
      approachToGateDistanceM: Math.round(dHighAppGate),
      turnAngleDeg: highTurnDeg,
      reactionTimeBoostS: highGateReactionS,
      gateRadiusM: layout.highGate?.radius || 4,
      isFovVisible: highTurnDeg < (cameraFov / 2)
    },
    lowRoute: {
      approachDistanceM: Math.round(dStartLowApp),
      approachToGateDistanceM: Math.round(dLowAppGate),
      turnAngleDeg: lowTurnDeg,
      reactionTimeNominalS: lowGateReactionS,
      gateRadiusM: layout.lowGate?.radius || 4,
      isFovVisible: lowTurnDeg < (cameraFov / 2)
    },
    geometry: {
      totalCollisionBoxes: boxes.length,
      tightObstacleCount: tightPillars.length
    }
  };
}

/**
 * Audit with TypeSafe AI (Jev System One)
 */
async function evaluateCorridorWithJev(audit, apiKey) {
  const state = {
    game: "Red Horizon (Mars Jetbike Flight)",
    layout_kinematics: audit,
    flight_contract: {
      nominal_speed: `${audit.speeds.nominalSpeed} m/s`,
      boost_speed: `${audit.speeds.boostSpeed} m/s`,
      camera_fov: `${audit.camera.fov}° horizontal`,
      high_gate_reaction_time: `${audit.highRoute.reactionTimeBoostS}s at boost speed`,
      high_gate_turn_angle: `${audit.highRoute.turnAngleDeg}°`,
      low_gate_reaction_time: `${audit.lowRoute.reactionTimeNominalS}s at nominal speed`,
      low_gate_turn_angle: `${audit.lowRoute.turnAngleDeg}°`
    }
  };

  const questions = {
    reaction_time_adequacy: {
      type: "score",
      instructions: "Evaluate whether the reaction times and turn angles grant sufficient perceptual window for a human pilot flying at boost speed through the high gate and nominal speed through the low gate.",
      criteria: [
        "Ample reaction window (>2.5s): pilot easily identifies and aligns flight vector with minimal pressure",
        "Engaging arcade reflex (1.0s - 2.5s): tight, thrilling, and readable with active steering",
        "Blind corner hazard (<0.8s): impossible reaction window leading to unfair high-speed crashes"
      ]
    },
    corridor_geometry_verdict: {
      type: "choice",
      instructions: "What is the kinematic verdict for this authored corridor layout?",
      criteria: {
        "approved_for_flight": "Sightlines, FOV visibility, and turn angles are within valid flight tolerance.",
        "widen_approach_turn": "Turn angle exceeds camera FOV; widen turn radius to prevent loss of visual target.",
        "reposition_gate_forward": "Gate is placed too close to the approach turn; advance gate along trajectory.",
        "increase_beacon_contrast": "Kinematics are sound, but beacon glow/contrast must be elevated against terrain."
      }
    },
    blind_corner_hazard: {
      type: "noul",
      instructions: "Does the approach trajectory force a blind corner entry where obstacles are hidden from camera FOV until within fatal proximity?",
      criteria: {
        "true": "Sharp yaw delta or terrain occlusion hides the gate or obstacle until under 1s reaction distance.",
        "false": "Sightlines remain open and the target stays within camera FOV throughout the turn."
      }
    }
  };

  if (!apiKey) {
    const hasBlindCorner = audit.highRoute.turnAngleDeg > (audit.camera.fov / 2);
    return {
      source: 'offline_fallback',
      model: 'deterministic-rules',
      answers: {
        reaction_time_adequacy: {
          score: audit.highRoute.reactionTimeBoostS >= 1.0 ? 1.05 : 1.8,
          confidence: 0.9
        },
        corridor_geometry_verdict: {
          choice: hasBlindCorner ? 'widen_approach_turn' : 'approved_for_flight',
          confidence: 0.88,
          probabilities: {}
        },
        blind_corner_hazard: { noul: hasBlindCorner ? 0.75 : 0.15 }
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
  const layoutPath = args.length > 0 
    ? path.resolve(args[0]) 
    : path.resolve('art/bridgehead/bridgehead-v2-layout.json');

  if (!fs.existsSync(layoutPath)) {
    console.error(`Error: Layout file not found at ${layoutPath}`);
    process.exit(1);
  }

  console.log(`\n🛸 Auditing Flight Corridor & Gate Readability: ${path.basename(layoutPath)}`);
  const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
  const audit = auditLayoutKinematics(layout);

  console.log(`\n======================================================`);
  console.log(`📐 SPATIAL KINEMATICS & SIGHTLINE AUDIT`);
  console.log(`======================================================`);
  console.log(`📷 Camera FOV: ${audit.camera.fov}° | Speeds: Nominal=${audit.speeds.nominalSpeed} m/s, Boost=${audit.speeds.boostSpeed} m/s`);
  console.log(`🔵 High Route: Turn=${audit.highRoute.turnAngleDeg}° | Pitch=${audit.highRoute.climbPitchDeg}° | Reaction Window=${audit.highRoute.reactionTimeBoostS}s @ ${audit.speeds.boostSpeed}m/s (FOV Visible: ${audit.highRoute.isFovVisible ? 'YES' : 'NO'})`);
  console.log(`🟢 Low Route:  Turn=${audit.lowRoute.turnAngleDeg}° | Reaction Window=${audit.lowRoute.reactionTimeNominalS}s @ ${audit.speeds.nominalSpeed}m/s (FOV Visible: ${audit.lowRoute.isFovVisible ? 'YES' : 'NO'})`);
  console.log(`🧱 Obstacles: ${audit.geometry.totalCollisionBoxes} solid boxes (${audit.geometry.tightObstacleCount} pillars/posts)`);

  console.log(`\n🧠 Consulting TypeSafe AI (Jev System One) for Readability Audit...`);
  const jevReport = await evaluateCorridorWithJev(audit, apiKey);

  console.log(`\n✅ Jev Evaluation Source: ${jevReport.source} (${jevReport.model || 'jev-latest'})`);
  const reaction = jevReport.answers.reaction_time_adequacy;
  const verdict = jevReport.answers.corridor_geometry_verdict;
  const hazard = jevReport.answers.blind_corner_hazard;

  console.log(`\n⏱️ Reaction Time Adequacy: ${reaction.score.toFixed(2)} / 2.0 (Confidence: ${(reaction.confidence * 100).toFixed(1)}%)`);
  console.log(`🎯 Geometry Verdict: [${verdict.choice}] (Confidence: ${(verdict.confidence * 100).toFixed(1)}%)`);

  // TypeSafe Noul Consistency Uncertainty Band (0.30 - 0.70)
  const pHazard = hazard.noul;
  const hazardBand = pHazard > 0.70 ? 'yes' : pHazard < 0.30 ? 'no' : 'uncertain';
  const hazardStatus = hazardBand === 'yes'
    ? 'CRITICAL BLIND CORNER (Turn angle/occlusion requires geometry rework)'
    : hazardBand === 'no'
      ? 'CLEAR SIGHTLINE (Verified safe for high-speed flight)'
      : 'MARGINAL SIGHTLINE (Recommend elevated neon beacon contrast & audio cue)';

  console.log(`⚠️ Blind Corner Hazard: ${(pHazard * 100).toFixed(1)}% probability -> [${hazardStatus}]`);

  // Write report
  const outPath = path.resolve('evidence/corridor-readability-report.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    layoutFile: path.basename(layoutPath),
    audit,
    jevReport: {
      ...jevReport,
      triBandClassification: {
        noulProbability: pHazard,
        band: hazardBand,
        hazardStatus
      }
    }
  }, null, 2));

  console.log(`\n📁 Saved corridor readability audit report to: ${outPath}\n`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error validating corridor readability:', err);
    process.exit(1);
  });
}

module.exports = {
  dist3D,
  angleBetween,
  auditLayoutKinematics,
  evaluateCorridorWithJev
};

