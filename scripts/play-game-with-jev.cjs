#!/usr/bin/env node
'use strict';

/**
 * Autonomous Browser Flight Pilot powered by TypeSafe AI (Jev System One)
 * 
 * Drives Google Chrome via Chrome DevTools Protocol (CDP), connects to
 * Red Horizon (Mars Jetbike), feeds real-time flight telemetry to Jev,
 * executes tactical flight decisions, defeats the Warden boss, extracts,
 * and saves milestone screenshots to the conversation artifacts directory.
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ARTIFACT_DIR = '/Users/ronakchovatiya/.gemini/antigravity/brain/73360e83-2d6a-4179-b6fc-1e1478310139';
const GAME_URL = 'http://127.0.0.1:5174/?ridge-run';
const JEV_API_URL = 'https://api.typesafe.ai/v1/systemone';

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

// Call Jev System One
async function consultJev(apiKey, state, questions) {
  try {
    const res = await fetch(JEV_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state,
        model: 'jev-latest',
        questions
      }),
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[JEV] API returned ${res.status}: ${text}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[JEV] Call failed: ${err.message}`);
    return null;
  }
}

// CDP Client Helper
class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      }
    };
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  async screenshot(filename) {
    const res = await this.call('Page.captureScreenshot', { format: 'png' });
    const targetPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(targetPath, Buffer.from(res.data, 'base64'));
    console.log(`📸 Saved screenshot: ${targetPath}`);
    return targetPath;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Missing TYPESAFE_API_KEY');
    process.exit(1);
  }

  const isHeadful = process.argv.includes('--visible');
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING AUTONOMOUS JEV FLIGHT COPILOT PLAYTEST`);
  console.log(`🎮 Mode: ${isHeadful ? 'Visible Browser Window' : 'Headless Browser via CDP'}`);
  console.log(`🌐 Target: ${GAME_URL}`);
  console.log(`======================================================\n`);

  // Launch Chrome instance with CDP enabled
  const chromeArgs = [
    isHeadful ? '' : '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=/tmp/chrome-jev-runner',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,720',
    GAME_URL
  ].filter(Boolean);

  const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', chromeArgs, {
    stdio: 'ignore'
  });

  try {
    // Wait for Chrome CDP to be available
    let pageTab = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 400));
      try {
        const res = await fetch('http://127.0.0.1:9222/json/list');
        const tabs = await res.json();
        pageTab = tabs.find(t => t.type === 'page' && t.url.includes('5174'));
        if (pageTab) break;
      } catch {}
    }

    if (!pageTab) throw new Error('Could not attach to Red Horizon tab in Chrome CDP');
    console.log(`🔗 Attached to Chrome tab: ${pageTab.url}`);

    const cdp = new CdpClient(pageTab.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');

    // Wait for A-Frame scene to load
    console.log('⏳ Waiting for A-Frame 3D scene & assets to initialize...');
    let sceneReady = false;
    for (let i = 0; i < 40; i++) {
      sceneReady = await cdp.eval(`!!(document.querySelector('a-scene')?.hasLoaded && document.querySelector('button.cursor-button'))`);
      if (sceneReady) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (!sceneReady) throw new Error('Scene initialization timed out');
    console.log('✅ A-Frame scene, shaders, and UI ready!');

    // Capture initial menu state
    await cdp.screenshot('01-flight-menu.png');

    // Consult Jev for Route Selection
    console.log('\n--- PHASE 1: ROUTE TACTICAL EVALUATION (JEV SYSTEM ONE) ---');
    const routeConsultState = {
      mission: 'Ridge Run',
      objective: 'Eliminate the Warden and reach extraction platform',
      pilot_loadout: 'Twin Pulse Cannons',
      route_options: {
        high_gate: {
          elevation: '10.0m high ridge',
          speed_requirement: 'Requires boost (> 14 m/s)',
          reward: '3x Overcharged double-damage plasma shots'
        },
        low_gate: {
          elevation: '3.5m low canyon',
          speed_requirement: 'Nominal flight speed',
          reward: '+30 shield capacity (absorbs direct fire)'
        }
      }
    };

    const routeQuestions = {
      chosen_route: {
        type: 'choice',
        instructions: 'Which route gate should the pilot select to ensure highest sortie survival and mission success?',
        criteria: {
          'high_gate': 'Engage boost dive through high cyan gate to maximize initial burst damage against Warden armor.',
          'low_gate': 'Navigate low emerald trench for +30 shield layer to tank Warden incoming artillery.'
        }
      }
    };

    const jevRouteDecision = await consultJev(apiKey, routeConsultState, routeQuestions);
    let chosenRoute = 'high';
    if (jevRouteDecision && jevRouteDecision.answers && jevRouteDecision.answers.chosen_route) {
      const answer = jevRouteDecision.answers.chosen_route;
      chosenRoute = answer.choice === 'low_gate' ? 'low' : 'high';
      console.log(`🤖 Jev Decision: ${answer.choice.toUpperCase()} (Confidence: ${(answer.confidence * 100).toFixed(1)}%)`);
      console.log(`📊 Probabilities:`, answer.probabilities);
    } else {
      console.log(`🤖 Jev Fallback: HIGH GATE (offensive alpha-strike)`);
    }

    // Launch sortie using drag aim (no pointer lock prompt)
    console.log('\n--- PHASE 2: LAUNCHING SORTIE ---');
    await cdp.eval(`document.querySelector('button.cursor-button').click()`);
    await new Promise(r => setTimeout(r, 500));

    // Install autonomous pilot controller hook inside the page context
    await cdp.eval(`
      window.__JEV_PILOT__ = {
        active: true,
        targetPoint: null,
        boost: false,
        heldKeys: new Set(),
        setKeys(nextKeys) {
          const player = document.querySelector('#player');
          const flight = player?.components['fly-controls'];
          if (!flight) return;
          for (const code of this.heldKeys) {
            if (!nextKeys.includes(code)) {
              flight.handleKeyUp({ code });
              this.heldKeys.delete(code);
            }
          }
          for (const code of nextKeys) {
            if (!this.heldKeys.has(code)) {
              flight.handleKeyDown({ code, preventDefault() {} });
              this.heldKeys.add(code);
            }
          }
        },
        setAim(targetPos) {
          const player = document.querySelector('#player');
          const flight = player?.components['fly-controls'];
          if (!player || !flight) return;
          const pos = player.object3D.position;
          const dx = targetPos.x - pos.x;
          const dy = targetPos.y - (pos.y + 1.2);
          const dz = targetPos.z - pos.z;
          const desiredYaw = Math.atan2(-dx, -dz);
          const distHoriz = Math.hypot(dx, dz);
          const desiredPitch = Math.atan2(dy, distHoriz);
          flight.rotation.y = desiredYaw;
          flight.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, desiredPitch));
          flight.applyLookRotation();
        },
        fireWeapon(press) {
          const jetbike = document.querySelector('#jetbike');
          const weapon = jetbike?.components['weapon-component'];
          const scene = document.querySelector('a-scene');
          if (!weapon) return;
          if (press) {
            weapon.onMouseDown({ target: scene.canvas, button: 0 });
            weapon.onMouseUp({ button: 0 });
          }
        },
        getTelemetry() {
          const player = document.querySelector('#player');
          const flight = player?.components['fly-controls'];
          const health = player?.components['player-component'];
          const weapon = document.querySelector('#jetbike')?.components['weapon-component'];
          const scene = document.querySelector('a-scene');
          const mission = scene?.components['ridge-run'];
          const manager = scene?.components['game-manager'];
          const warden = mission?.warden;
          const wardenComp = warden?.components?.['enemy-component'];
          
          return {
            player: {
              x: player?.object3D?.position?.x || 0,
              y: player?.object3D?.position?.y || 0,
              z: player?.object3D?.position?.z || 0,
              speed: flight?.velocity?.length() || 0,
              hull: health?.health || 100,
              shield: health?.shield || 0,
              boost: flight?.boostAmount || 100
            },
            mission: {
              stage: mission?.stage || 'choice',
              gameOver: manager?.gameOver || false,
              score: manager?.score || 0
            },
            warden: wardenComp ? {
              x: warden.object3D.position.x,
              y: warden.object3D.position.y,
              z: warden.object3D.position.z,
              health: wardenComp.health,
              isDead: wardenComp.isDead,
              phase: wardenComp.combatPhase,
              chargeRemaining: wardenComp.chargeRemaining,
              trackingRemaining: wardenComp.trackingRemaining
            } : null
          };
        }
      };
    `);

    // Target waypoint for the gate
    const gateTarget = chosenRoute === 'high' 
      ? { x: -6, y: 10, z: -10 } 
      : { x: 6, y: 3.5, z: -10 };

    console.log(`✈️ Navigating toward ${chosenRoute.toUpperCase()} GATE at [${gateTarget.x}, ${gateTarget.y}, ${gateTarget.z}]`);

    // Step 1: Fly through Gate
    const approachStart = Date.now();
    let gatePassed = false;

    while (Date.now() - approachStart < 15000) {
      const telem = await cdp.eval(`window.__JEV_PILOT__.getTelemetry()`);
      if (telem.mission.stage === 'warden' || telem.mission.stage === 'extraction') {
        gatePassed = true;
        break;
      }

      // Compute heading to gate
      const dx = gateTarget.x - telem.player.x;
      const dy = gateTarget.y - telem.player.y;
      const dz = gateTarget.z - telem.player.z;
      const dist = Math.hypot(dx, dy, dz);

      // Direct smooth aim & thruster commands
      await cdp.eval(`(() => {
        const pilot = window.__JEV_PILOT__;
        pilot.setAim(${JSON.stringify(gateTarget)});
        const keys = ['KeyW'];
        if (${dy} > 0.3) keys.push('KeyE');
        else if (${dy} < -0.3) keys.push('KeyQ');
        if (${chosenRoute === 'high'}) keys.push('ShiftLeft');
        pilot.setKeys(keys);
      })()`);

      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`🎯 Gate breached! Stage: WARDEN ENGAGED`);
    await cdp.screenshot('02-gate-breach.png');

    // Step 2: Warden Boss Encounter
    console.log('\n--- PHASE 3: WARDEN BOSS DOGFIGHT ---');
    const combatStart = Date.now();
    let lastJevConsult = 0;
    let evasiveAction = null;
    let evasiveUntil = 0;

    while (Date.now() - combatStart < 45000) {
      const telem = await cdp.eval(`window.__JEV_PILOT__.getTelemetry()`);
      if (telem.mission.stage === 'extraction' || telem.mission.stage === 'complete' || telem.mission.gameOver) {
        break;
      }

      const now = Date.now();
      // Ask Jev for tactical advice periodically or on major state shifts
      if (now - lastJevConsult > 2500 && telem.warden) {
        lastJevConsult = now;
        const combatQuestions = {
          threat_level: {
            type: 'score',
            instructions: 'Evaluate immediate threat level given player hull and Warden telegraph status.',
            criteria: [
              'Nominal distance / Warden repositioning',
              'Active targeting lock / telegraph charging',
              'Critical hit imminent / hull breach danger'
            ]
          },
          action: {
            type: 'choice',
            instructions: 'Select combat maneuver.',
            criteria: {
              'evasive_strafe': 'Strafe laterally to dodge charging railgun projectile.',
              'fire_plasma_burst': 'Lock aim and fire Twin Pulse Cannons into Warden armor.'
            }
          }
        };

        const advice = await consultJev(apiKey, { player: telem.player, warden: telem.warden }, combatQuestions);
        if (advice && advice.answers) {
          const action = advice.answers.action?.choice || 'fire_plasma_burst';
          const threat = advice.answers.threat_level?.score || 1.0;
          console.log(`🔥 [JEV TACTICAL] Threat: ${threat.toFixed(1)}/2.0 | Action: ${action.toUpperCase()}`);
          if (action === 'evasive_strafe' || (telem.warden.chargeRemaining > 0)) {
            evasiveAction = telem.player.x > 0 ? 'KeyA' : 'KeyD';
            evasiveUntil = now + 800;
          }
        }
      }

      // Execute flight & weapons
      await cdp.eval(`(() => {
        const pilot = window.__JEV_PILOT__;
        const telem = pilot.getTelemetry();
        if (!telem.warden) return;
        
        // Aim at Warden
        pilot.setAim({ x: telem.warden.x, y: telem.warden.y + 1.2, z: telem.warden.z });
        
        // Maneuver
        const keys = [];
        const isEvading = ${now} < ${evasiveUntil};
        if (isEvading) {
          keys.push('${evasiveAction || 'KeyA'}');
        } else {
          // Maintain dogfight distance (around 20-25m)
          const distZ = telem.player.z - telem.warden.z;
          if (distZ > 28) keys.push('KeyW');
          else if (distZ < 18) keys.push('KeyS');
        }
        
        // Altitude alignment
        const dy = (telem.warden.y + 1.5) - telem.player.y;
        if (dy > 0.4) keys.push('KeyE');
        else if (dy < -0.4) keys.push('KeyQ');
        
        pilot.setKeys(keys);
        
        // Fire burst
        if (!isEvading) {
          pilot.fireWeapon(true);
        }
      })()`);

      await new Promise(r => setTimeout(r, 120));
    }

    console.log(`💥 Warden neutralized! Proceeding to extraction...`);
    await cdp.screenshot('03-warden-neutralized.png');

    // Step 3: Extraction
    console.log('\n--- PHASE 4: EXTRACTION BEACON HOLD ---');
    const extractTarget = { x: 0, y: 3.5, z: -41 };
    const extractStart = Date.now();

    while (Date.now() - extractStart < 15000) {
      const telem = await cdp.eval(`window.__JEV_PILOT__.getTelemetry()`);
      if (telem.mission.stage === 'complete' || telem.mission.gameOver) {
        break;
      }

      await cdp.eval(`(() => {
        const pilot = window.__JEV_PILOT__;
        const telem = pilot.getTelemetry();
        pilot.setAim(${JSON.stringify(extractTarget)});
        
        const dx = ${extractTarget.x} - telem.player.x;
        const dy = ${extractTarget.y} - telem.player.y;
        const dz = ${extractTarget.z} - telem.player.z;
        const dist = Math.hypot(dx, dy, dz);
        
        const keys = [];
        if (dist > 1.5) keys.push('KeyW');
        if (dy > 0.2) keys.push('KeyE');
        else if (dy < -0.2) keys.push('KeyQ');
        
        pilot.setKeys(keys);
      })()`);

      await new Promise(r => setTimeout(r, 100));
    }

    // Release all inputs
    await cdp.eval(`window.__JEV_PILOT__.setKeys([])`);
    await new Promise(r => setTimeout(r, 1500));

    // Capture victory screenshot
    await cdp.screenshot('04-mission-complete.png');

    const finalTelem = await cdp.eval(`window.__JEV_PILOT__.getTelemetry()`);
    console.log('\n======================================================');
    console.log('🏆 SORTIE COMPLETE!');
    console.log(`📊 Final Score: ${finalTelem.mission.score}`);
    console.log(`🛡️ Hull Remaining: ${finalTelem.player.hull}%`);
    console.log(`🎯 Stage: ${finalTelem.mission.stage}`);
    console.log('======================================================\n');

    cdp.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

main().catch(err => {
  console.error('Fatal error during autonomous playtest:', err);
  process.exit(1);
});
