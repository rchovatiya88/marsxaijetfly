import * as THREE from 'three';
import {
  BRIDGEHEAD_EXITS, BRIDGEHEAD_GATES, BRIDGEHEAD_LOW_PEEK, BRIDGEHEAD_HIGH_DODGE,
  BRIDGEHEAD_ROUTE_PATHS, BRIDGEHEAD_EXTRACTION_PATH, BridgeheadRoute
} from './mission/bridgehead-run';
import type {Vec} from './arena-world';

type InputRun = {route: string; elapsedMs: number; shots: number; hull: number; stage: string; attackCycles:number; exposureWindows:number};
const frame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

// An engineering replay through the actual input handlers and A-Frame ticks.
// It never changes position, rotation, health, rewards, clocks or mission stages.
// Synthetic input is not an unassisted human playtest or captured-mouse proof.
export async function runBridgeheadInputCheck(
  scene: any, launch: () => void, report: (line: string) => void, stop: () => boolean = () => false
): Promise<InputRun[]> {
  const mission = scene.components['bridgehead-run'], manager = scene.components['game-manager'];
  if (!mission) throw new Error('Bridgehead Run is required.');
  const player = scene.querySelector('#player'), camera = scene.querySelector('#camera');
  const flight = player.components['fly-controls'], health = player.components['player-component'];
  const weapon = scene.querySelector('#jetbike').components['weapon-component'];
  const held = new Set<string>(), results: InputRun[] = [];
  const checkActive = () => {
    if (stop()) throw new Error('Input replay stopped.');
    if (!scene.isPlaying && !manager.gameOver) throw new Error('Input replay lost focus or paused; keep the browser visible.');
    if (manager.gameOver && mission.stage !== 'complete') throw new Error(`Sortie ended at ${mission.stage}, hull ${health.health}.`);
  };
  const setKeys = (next: string[]) => {
    for (const code of held) if (!next.includes(code)) {flight.handleKeyUp({code}); held.delete(code);}
    for (const code of next) if (!held.has(code)) {flight.handleKeyDown({code, preventDefault() {}}); held.add(code);}
  };
  const navigate = async (point: Vec, label: string, boost = false) => {
    const started = performance.now();
    const from={...player.object3D.position},legLength=Math.hypot(point.x-from.x,point.z-from.z);
    let best = Infinity, progressed = started;
    while (performance.now() - started < 18000) {
      checkActive();
      const position = player.object3D.position, dx = point.x-position.x, dy = point.y-position.y, dz = point.z-position.z;
      const distance = Math.hypot(dx,dy,dz), tolerance = boost ? .7 : .45;
      if (distance < tolerance) {
        setKeys([]);
        report(`${label}: ${mission.stage} at ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
        return;
      }
      if (distance < best-.12) {best = distance; progressed = performance.now();}
      if (performance.now()-progressed > 3500) throw new Error(`${label}: blocked at ${position.toArray().map((n:number)=>n.toFixed(2)).join(', ')}; ${distance.toFixed(2)} m remain.`);
      const horizontal = Math.hypot(dx,dz), yawError = wrap(Math.atan2(-dx,-dz)-flight.rotation.y);
      const keys: string[] = [];
      // Turn the bike using shipped keyboard yaw, then move forwards. Route
      // coverage cannot be obtained by strafing sideways through every bend.
      if (horizontal > .3 && Math.abs(yawError) > .035) keys.push(yawError > 0 ? 'ArrowLeft' : 'ArrowRight');
      if (horizontal > .3 && Math.abs(yawError) < .18) keys.push('KeyW');
      // Follow the authored altitude along the leg. Descending immediately at
      // a far marker's final height would cut under the measured safe slope.
      const fraction=legLength>.3?Math.min(1,Math.max(0,((position.x-from.x)*(point.x-from.x)+(position.z-from.z)*(point.z-from.z))/(legLength*legLength)+.35/legLength)):1;
      const altitudeError=from.y+(point.y-from.y)*fraction-position.y;
      if (Math.abs(altitudeError) > .12) keys.push(altitudeError > 0 ? 'KeyE' : 'KeyQ');
      if (boost) keys.push('ShiftLeft');
      setKeys(keys);
      await frame();
    }
    throw new Error(`${label}: input traversal timed out.`);
  };
  const origin = new THREE.Vector3(), aim = new THREE.Vector3();
  const aimWithMouse = (enemy: any) => {
    scene.object3D.updateMatrixWorld(true);
    camera.object3D.getWorldPosition(origin);
    aim.copy(enemy.el.object3D.position); aim.y += 1.05; aim.sub(origin);
    const yaw = Math.atan2(-aim.x,-aim.z), pitch = Math.atan2(aim.y,Math.hypot(aim.x,aim.z));
    const yawError = wrap(flight.rotation.y-yaw), pitchError = flight.rotation.x-pitch;
    const sensitivity = Math.max(.0001,flight.data.lookSensitivity*.004);
    const movementX = Math.max(-100,Math.min(100,yawError/sensitivity));
    const movementY = Math.max(-100,Math.min(100,pitchError/(sensitivity*(flight.data.invertY?-1:1))));
    if (flight.mouseLocked) flight.handleMouseMove({movementX,movementY});
    else {
      flight.handleMouseDown({target:scene.canvas,button:2,clientX:400,clientY:300,preventDefault(){}});
      flight.handleMouseMove({target:scene.canvas,buttons:2,clientX:400+movementX,clientY:300+movementY});
      flight.handleMouseUp({buttons:0});
    }
    return Math.abs(yawError) < .025 && Math.abs(pitchError) < .025;
  };
  try {
    report('PROGRAMMATIC FORWARD / YAW REPLAY · W + arrow steering, E/Q altitude, rendered collision; no human score credit.');
    for (const route of ['high','low'] as BridgeheadRoute[]) {
      manager.resetMission(); launch(); await frame();
      if (!manager.gameStarted || (!flight.mouseLocked && !flight.data.dragToLook)) throw new Error('Launch did not enable flight input.');
      const gate=BRIDGEHEAD_GATES.find(g=>g.id===route)!.position,exit=BRIDGEHEAD_EXITS.find(g=>g.id===route)!.position;
      const path=BRIDGEHEAD_ROUTE_PATHS[route];
      for(let index=1;index<path.length;index++) {
        const authored=path[index],isGate=authored===path.find(p=>p.x===gate.x&&p.y===gate.y&&p.z===gate.z);
        const isExit=authored.x===exit.x&&authored.y===exit.y&&authored.z===exit.z;
        const point=isGate||isExit?{...authored,x:authored.x+1}:authored;
        await navigate(point,`${route}: course ${index}/${path.length-1}`,route==='high'&&(isGate||isExit));
        if(isGate && mission.route!==route) throw new Error(`${route}: ordered boosted entry did not select this route.`);
        if(isExit && mission.stage!=='approach') throw new Error(`${route}: bridge exit did not enter the approach stage.`);
      }
      if (mission.stage !== 'warden') throw new Error(`${route}: court did not activate the Warden.`);
      if (route === 'low') await navigate(BRIDGEHEAD_LOW_PEEK,'Low: north-side peek out of reciprocal cover');
      const combatStart = performance.now();
      let evasionUntil=0,evade='',lastPhase='',lastAttack=-1;
      const opponent=mission.warden.components['enemy-component'];
      while (mission.stage === 'warden' && performance.now()-combatStart < 65000) {
        checkActive();
        const enemy = mission.warden?.components?.['enemy-component'];
        if (enemy && !enemy.isDead) {
          if(enemy.combatPhase!==lastPhase) {lastPhase=enemy.combatPhase;report(`${route}: ${lastPhase}, Warden ${enemy.health}, hull ${health.health}`);}
          // Wait for late lock, then perform a bounded lateral dodge. Alternate
          // directions to remain on the authored open side of the court.
          if(enemy.chargeRemaining>0 && enemy.trackingRemaining<=0 && lastAttack!==enemy.attackCycles) {
            lastAttack=enemy.attackCycles;
            const middle=route==='high'?BRIDGEHEAD_HIGH_DODGE.z+3:BRIDGEHEAD_LOW_PEEK.z-2.5;
            evade=player.object3D.position.z>middle?'KeyA':'KeyD';evasionUntil=manager.elapsed+600;
          }
          setKeys(manager.elapsed<evasionUntil?[evade]:[]);
          if (aimWithMouse(enemy) && enemy.recoveryRemaining>0) {
            weapon.onMouseDown({target:scene.canvas,button:0});
            weapon.onMouseUp({button:0});
          }
          if (!weapon.ammoInClip && !weapon.isReloading) weapon.reload();
        }
        await frame();
      }
      setKeys([]); weapon.onMouseUp({button:0});
      if (mission.stage !== 'extraction') throw new Error(`${route}: Warden combat did not reach extraction.`);
      if(opponent.attackCycles<2 || opponent.exposureWindows<2) throw new Error('Warden bypassed its authored counterattack windows.');
      report(`${route}: Warden defeated using ${weapon.shotsFired} ordinary shots in ${opponent.exposureWindows} counter windows; hull ${health.health}.`);
      await navigate({x:player.object3D.position.x,y:BRIDGEHEAD_EXTRACTION_PATH[0].y,z:player.object3D.position.z},`${route}: extraction climb`);
      for(const [index,point] of BRIDGEHEAD_EXTRACTION_PATH.entries()) await navigate(point,`${route}: extraction ${index+1}`);
      const holdStart = performance.now();
      while (!manager.gameOver && performance.now()-holdStart < 5000) {checkActive(); await frame();}
      if (!manager.gameOver || mission.stage !== 'complete') throw new Error(`${route}: beacon hold did not finish the sortie.`);
      const run = {route,elapsedMs:manager.elapsed,shots:weapon.shotsFired,hull:health.health,stage:mission.stage,attackCycles:opponent.attackCycles,exposureWindows:opponent.exposureWindows};
      results.push(run); report(`PASS ${JSON.stringify(run)}`);
    }
    return results;
  } finally {
    setKeys([]); flight.clearInput(); weapon.pause(); scene.pause();
  }
}
