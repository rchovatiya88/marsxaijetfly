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

async function researchAFrameImprovements() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('ERROR: TYPESAFE_API_KEY not found in environment or .env file');
    process.exit(1);
  }

  console.log('=== TYPE SAFE AI (JEV SYSTEM ONE) A-FRAME REGISTRY RESEARCH ===');
  console.log('Analyzing A-Frame Registry patterns (https://aframe.io/aframe-registry/) for Mars Jetbike Red Horizon...\n');

  const state = {
    game: "Mars Red Horizon (Ridge Run 60 FPS Flight Combat)",
    stack: "A-Frame 1.4.0, Three.js r160, React 18, WebGL",
    telemetry_audit_findings: {
      flight_duration: "Expanded from 14.88s to 33.30s (+124%) in latest flight video",
      combat_record: "Player defeated Warden and shot down 2 pursuit interceptors at 25 m/s",
      usability_gaps: [
        "Extraction ring is a flat ground torus at z=-41; when flying high at 10m-20m altitude, it is hidden by canyon rocks",
        "When all pursuit interceptors are eliminated (HOSTILES 0), copilot banner remains stuck on warning instead of declaring airspace secured",
        "Tactical off-screen chevrons exist in codebase for fullMode/ipadMode but were omitted in Ridge Run",
        "Engine thrusters need dynamic high-speed ribbon/plume trails during boost and banking"
      ]
    },
    registry_candidates: {
      extraction_sky_pillar: "Vertical 40m glowing beacon column (aframe-tube / cylinder / shader) with inner pulse core visible across canyon from any altitude",
      hud_threat_chevrons: "3D off-screen HUD chevrons (aframe-ui-widgets pattern) projecting distance, altitude delta, and direction for hostiles and extraction",
      airspace_secured_event: "State-reactive triumphant copilot broadcast + audio chime when activeDrones === 0 in extraction phase",
      thruster_ribbon_plumes: "High-speed twin engine ribbon trails & boost plume flare (aframe-trail pattern)",
      explosive_death_shockwaves: "Multi-stage particle shockwave rings and spark bursts on enemy destruction (aframe-particle-system pattern)"
    }
  };

  const questions = {
    registry_component_priority: {
      type: "choice",
      instructions: "Rank which A-Frame registry component pattern will deliver the highest immediate improvement to gameplay readability, flow, and player satisfaction.",
      criteria: {
        "extraction_sky_pillar": "Vertical 40m glowing beacon column visible above all canyon rocks and terrain from any altitude and orientation.",
        "hud_threat_chevrons": "3D directional HUD indicators showing position, distance, and altitude of off-screen interceptors and extraction point.",
        "airspace_secured_event": "Triumphant copilot announcement and audio fanfare when all pursuers are eliminated, signaling clear path to extraction.",
        "thruster_ribbon_plumes": "Dynamic engine plume and ribbon trail effects communicating velocity, boost state, and flight maneuvers.",
        "explosive_death_shockwaves": "Expanding explosive shockwaves and particle debris on drone destruction."
      }
    },
    sky_beacon_legibility_score: {
      type: "score",
      instructions: "Score the necessity of a vertical volumetric/shader sky pillar for the extraction beacon in 3D dogfighting where players fly at high altitude above ground obstacles.",
      criteria: [
        "Low utility; players can locate flat ground rings using mini-map alone",
        "Moderate utility; improves visual recognition in open terrain",
        "High/Critical utility; in vertical canyon combat, flat ground rings get occluded by geometry, making a sky-reaching pillar essential for clear extraction navigation"
      ]
    },
    tactical_hud_chevrons_score: {
      type: "score",
      instructions: "Score the value of wiring 3D off-screen directional chevrons into Ridge Run mode for tracking fast interceptors that flank behind the player.",
      criteria: [
        "Cosmetic only; audio and radar are sufficient",
        "Helpful; reduces disorientation when enemies circle out of forward camera frustum",
        "Essential; provides instantaneous spatial awareness during high-speed turns and dogfights"
      ]
    },
    performance_budget_60fps: {
      type: "score",
      instructions: "Evaluate the technical safety of implementing these improvements using procedural Three.js primitives and lightweight CSS/DOM HUD overlays within a 60 FPS WebGL budget on A-Frame 1.4.",
      criteria: [
        "Risky; could introduce frame drops and GC pauses",
        "Manageable with careful pooling and draw call budgeting",
        "Highly safe and optimized; using shared geometries, additive flat shaders, and DOM HUD overlays adds near-zero GPU/CPU overhead"
      ]
    },
    combat_loop_production_readiness: {
      type: "noul",
      instructions: "Does implementing the Vertical Extraction Beacon, Tactical HUD Chevrons, Airspace Secured Copilot Event, and Dynamic Thruster Plumes elevate the Ridge Run sortie into a fully commercial-feeling, polished flight combat loop?",
      criteria: {
        "true": "Yes; the combination of vertical navigation beacons, off-screen threat tracking, triumphant pacing resolution, and dynamic motion cues completes the arcade flight combat experience.",
        "false": "No; fundamental architectural gaps remain that prevent this from feeling like a finished game loop."
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
      throw new Error(`TypeSafe API responded with HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log('=== JEV SYSTEM ONE EVALUATION RESULTS ===');
    console.log(JSON.stringify(data, null, 2));

    // Save evaluation artifact
    const artifactPath = path.resolve('reports/jev-aframe-research.json');
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, JSON.stringify({ timestamp: new Date().toISOString(), state, results: data }, null, 2));
    console.log(`\nResearch findings persisted to: ${artifactPath}`);

    return data;
  } catch (err) {
    console.error('Error during Jev research consultation:', err);
    process.exit(1);
  }
}

researchAFrameImprovements();
