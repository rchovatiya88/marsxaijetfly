#!/usr/bin/env node
'use strict';

/**
 * TypeSafe AI (Jev) Combat Balance & Telemetry Audit Tool
 * 
 * Uses Jev System One primitives (Choice, Score, Noul) to evaluate
 * current combat tuning parameters against premium vertical slice targets.
 */

const fs = require('node:fs');
const path = require('node:path');

// Read API key from .env if not in process.env
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

async function auditCombatBalance() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: TYPESAFE_API_KEY not found in process.env or .env file.');
    process.exit(1);
  }

  console.log('🛸 Red Horizon — Auditing combat balance with TypeSafe AI (Jev)...');

  // Ground-truth combat tuning extracted from src/components/enemy-component.ts & ridge-run.ts
  const state = {
    game: "Red Horizon (Mars Jetbike Combat Flight)",
    genre: "Premium paid vertical slice / flight combat",
    targets: {
      frame_time_p95_target_ms: 20.0,
      current_frame_time_p95_ms: 33.0,
      combat_win_rate_target_percent: 65.0
    },
    player: {
      hull: 100,
      boost_speed: 38,
      normal_speed: 20,
      weapon_damage: 25,
      fire_rate_hz: 5,
      high_gate_bonus: "3x double-damage shots",
      low_gate_bonus: "+30 shield capacity"
    },
    warden_boss: {
      health: 100,
      weapon_damage: 15,
      weapon_cooldown_s: 2.0,
      telegraph_windup_s: 0.85,
      disarmed_recovery_s: 1.2,
      accuracy: 0.70,
      projectile_speed: 45
    },
    qa_observations: [
      "101 automated regression tests pass.",
      "Telegraph windup of 850ms gives clear visual warning before firing.",
      "Disarmed recovery window of 1.2s gives player clear counter-attack opportunity.",
      "P95 frame time is currently ~33ms at 720p (target is <=20ms)."
    ]
  };

  const questions = {
    difficulty_curve: {
      type: "score",
      instructions: "Rate the difficulty curve of the Warden boss encounter for a premium arcade flight game based on `player` and `warden_boss` parameters.",
      criteria: [
        "Too forgiving / negligible boss threat",
        "Challenging, readable, and rewarding (ideal vertical slice)",
        "Overly punishing / unavoidable damage traps"
      ]
    },
    recommended_tuning_action: {
      type: "choice",
      instructions: "What is the single most impactful tuning or optimization step recommended next?",
      criteria: {
        "optimize_frame_budget": "P95 frame time (33ms) exceeds the 20ms gate; profile and optimize render overhead before changing combat math.",
        "extend_telegraph_window": "Lengthen the Warden 850ms windup to grant newer players more reaction time.",
        "buff_low_gate_shield": "Increase the +30 shield bonus to make the low canyon route more viable.",
        "maintain_current_combat": "Current telegraph (850ms) and recovery (1.2s) balance is sound; proceed to human playtesting."
      }
    },
    vertical_slice_ready: {
      type: "noul",
      instructions: "Does the current combat configuration satisfy the design requirements for a responsive, readable vertical slice prototype?",
      criteria: {
        "true": "Mechanics, telegraphs, and recovery windows form a readable, skill-based loop.",
        "false": "Combat mechanics are too rough or unreadable for players."
      }
    }
  };

  try {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state,
        model: 'jev-latest',
        questions
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log(`\n✅ Evaluated by Jev (${data.model}) — Tokens: in=${data.usage.input_tokens}, out=${data.usage.output_tokens}\n`);

    const difficulty = data.answers.difficulty_curve;
    console.log(`🎯 Difficulty Curve Rating: ${difficulty.score.toFixed(2)} / 2.0 (Confidence: ${(difficulty.confidence * 100).toFixed(1)}%)`);
    console.log(`   Level distribution:`, difficulty.probabilities);

    const action = data.answers.recommended_tuning_action;
    console.log(`\n🛠️  Recommended Next Step: [${action.choice}] (Confidence: ${(action.confidence * 100).toFixed(1)}%)`);
    console.log(`   Action probabilities:`, action.probabilities);

    const ready = data.answers.vertical_slice_ready;
    console.log(`\n🚀 Vertical Slice Combat Readiness: ${(ready.noul * 100).toFixed(1)}% probability`);

  } catch (err) {
    console.error('Audit failed:', err.message);
    process.exit(1);
  }
}

auditCombatBalance();
