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

async function consult() {
  const apiKey = getApiKey();
  const state = {
    game: "Red Horizon (Mars Jetbike)",
    current_state: {
      flight_model: "WASD + mouse look/cursor aim; forward velocity accelerates to max speed; Shift engages boost",
      gates: "High gate (cyan) awards 3x double damage; Low gate (amber) awards 30 shield; low gate has weak contrast against orange terrain",
      combat: "Warden boss has 850ms telegraph windup and 1.2s disarmed recovery; player has 30 rounds with R reload",
      feedback_gaps: [
        "Vehicle does not roll/bank visibly into turns",
        "Low gate color blurs into the Martian orange sand",
        "Player needs real-time tactical voice/HUD guidance on when to boost or strike",
        "Camera FOV does not dynamically kick back during boost"
      ]
    },
    player_goal: "Pick up the game and immediately feel an exhilarating, readable jetbike combat flight loop, defeat the Warden, and extract."
  };

  const questions = {
    top_flight_enhancement: {
      type: "choice",
      instructions: "Which flight or camera visual enhancement will most immediately elevate the jetbike flight sensation?",
      criteria: {
        "bank_roll_on_turn": "Add dynamic bike roll/banking when turning so the vehicle leans into corners like a racing jetbike.",
        "dynamic_fov_boost": "Kick out the camera FOV slightly during boost to create a cinematic speed-tunnel rush.",
        "gate_contrast_overhaul": "Recolor the low gate to high-contrast neon/emerald so both routes are unmissable from launch.",
        "hud_copilot_callouts": "Wire the live Jev copilot into the flight HUD to give real-time tactical warnings."
      }
    },
    flight_fun_rating: {
      type: "score",
      instructions: "Rate how critical adding dynamic banking/roll and high-contrast gates is to transforming this from a tech demo into a commercial-feeling game.",
      criteria: [
        "Minor cosmetic polish; gameplay works without it",
        "Important enhancement; significantly improves flight feel and route legibility",
        "Essential requirement; without responsive vehicle feel and route clarity the flight loop fails"
      ]
    },
    is_ready_for_immediate_play: {
      type: "noul",
      instructions: "If we polish vehicle banking, boost FOV/speed response, gate contrast, and HUD copilot callouts, will this provide an engaging, playable loop for immediate user testing?",
      criteria: {
        "true": "Yes, tight flight controls + clear route decisions + readable boss telegraphs create a complete, fun sortie loop.",
        "false": "No, fundamental architecture rework is needed first."
      }
    }
  };

  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: 'jev-latest', questions })
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

consult();
