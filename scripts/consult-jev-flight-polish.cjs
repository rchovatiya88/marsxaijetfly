const fs = require('fs');
const path = require('path');

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

async function consultFlightPolish() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('ERROR: TYPESAFE_API_KEY not found');
    process.exit(1);
  }

  console.log('=== TYPE SAFE AI (JEV SYSTEM ONE) FLIGHT COMBAT POLISH CONSULTATION ===\n');

  const state = {
    game: "Mars Red Horizon (Ridge Run 60 FPS Flight Combat)",
    status: "Extraction sky pillar, 3D HUD chevrons, and airspace secured event are live and tested",
    next_opportunities: {
      dynamic_engine_audio: "Velocity-coupled synthesizer where engine pitch scales from 42Hz idle up to 210Hz screaming turbine during boost",
      ground_dust_wash: "Dynamic ground particle wake/dust wash beneath bike when flying at low altitude (y < 4.5m) to heighten speed sensation",
      arcade_sortie_grading: "Post-mission S/A/B/C Pilot Evaluation screen grading time, accuracy, and hull integrity",
      muzzle_flash_recoil: "Instantaneous twin muzzle flash flares and crosshair kick on pulse cannon fire"
    }
  };

  const questions = {
    top_polish_priority: {
      type: "choice",
      instructions: "Which sensory enhancement will provide the most visceral and immediate upgrade to the jetbike piloting feel?",
      criteria: {
        "dynamic_engine_audio": "Real-time engine throttle pitch shifting (42Hz -> 210Hz) directly tied to flight velocity and boost.",
        "ground_dust_wash": "Ground dust wash beneath bike when flying low over Martian sand.",
        "arcade_sortie_grading": "Post-mission S/A/B/C performance rating breakdown with pilot badges.",
        "muzzle_flash_recoil": "Twin muzzle flashes and crosshair recoil kick on weapon discharge."
      }
    },
    engine_pitch_immersion_score: {
      type: "score",
      instructions: "Score the importance of replacing a static 42Hz ambient drone with dynamic throttle pitch coupling for high-speed arcade flight games.",
      criteria: [
        "Low utility; player focuses on visuals and weapon sounds",
        "Moderate utility; adds background atmosphere",
        "Critical utility; audio RPM feedback is fundamental to player perception of momentum, speed, and boost engagement"
      ]
    },
    ground_dust_wash_score: {
      type: "score",
      instructions: "Score the value of low-altitude ground dust wash particles for giving intuitive vertical awareness without looking away at the altimeter.",
      criteria: [
        "Low value; unnecessary visual clutter",
        "Moderate value; nice cosmetic touch",
        "High value; ground proximity cues drastically improve terrain clearance judgment and high-speed rushing feel"
      ]
    },
    arcade_ranking_replayability: {
      type: "noul",
      instructions: "Will an arcade debrief screen with S/A/B/C letter grades, time breakdown, and pilot title motivate players to replay sorties for mastery?",
      criteria: {
        "true": "Yes; arcade scoring and rank tiers transform a one-time prototype run into a high-replayability time-attack combat game.",
        "false": "No; players only care about completion rather than rank."
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
      throw new Error(`API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    console.log('=== JEV EVALUATION RESULTS ===');
    console.log(JSON.stringify(data, null, 2));

    const outPath = path.resolve('reports/jev-flight-polish.json');
    fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), state, results: data }, null, 2));
    console.log(`\nPersisted to ${outPath}`);
  } catch (err) {
    console.error('Error:', err);
  }
}

consultFlightPolish();
