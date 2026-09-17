import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import './App.css';
import './aframe-init';
import { ARENA_PROPS } from './arena-world';
import { readSettings, saveSettings } from './settings';
import { PlaytestPanel } from './PlaytestPanel';
import { RouteMap } from './RouteMap';
import { gameAudio } from './game-audio';
import { RIDGE_GATES, EXTRACTION } from './mission/ridge-run';
import { IPAD_STAGE_CAMERA, IPAD_STAGE_EXTRACTION, IPAD_STAGE_GATES, IPAD_STAGE_SPEED } from './mission/ipad-stage';
import { BRIDGEHEAD_APPROACHES, BRIDGEHEAD_EXITS, BRIDGEHEAD_EXTRACTION, BRIDGEHEAD_GATES, BRIDGEHEAD_SPEED, BRIDGEHEAD_CAMERA, BRIDGEHEAD_ENVIRONMENT_SCALE } from './mission/bridgehead-run';
import './components/level-runtime';
import './components/world-stream';

declare global {
  namespace JSX { interface IntrinsicElements { 'a-scene': any; 'a-entity': any; 'a-camera': any; 'a-light': any; } }
}

type Result = { score: number; level: number; won: boolean; best: number; mode?: string; route?: string; seconds?: number; shots?: number; chargesSpent?: number; hullLost?: number; shieldLeft?: number };
type ObjectiveTarget = { label: string; position: {x:number;y:number;z:number}; approach?: string };
type TargetReadout = ObjectiveTarget & { distance:number; altitude:number; left:number; top:number; offscreen:boolean };
const modeParams = new URLSearchParams(window.location.search);
const modePath = window.location.pathname.toLowerCase();
const surveyMode = modeParams.has('full-level') || modeParams.has('survey');
const ipadMode = !surveyMode && (modeParams.has('ipad-stage') || modePath.endsWith('/ipad-stage'));
const fullMode = !surveyMode && !ipadMode && (modeParams.has('bridgehead') || (!modeParams.has('ridge-run') && !modeParams.has('arena') && !modeParams.has('playtest')));
const streamMode = fullMode || surveyMode;
const failedArtFixture = fullMode && modeParams.has('playtest') && modeParams.has('asset-failure');
const ridgeMode = !streamMode && !ipadMode && modeParams.has('ridge-run');
const missionSpeed = fullMode ? BRIDGEHEAD_SPEED : ipadMode ? IPAD_STAGE_SPEED : 25;
const missionCamera = fullMode ? BRIDGEHEAD_CAMERA : ipadMode ? IPAD_STAGE_CAMERA : { height: 2, distance: 8, shoulder: 0 };

const RUNWAY_LINES = [-6, 6];
const BEACONS = [
  { id: 'beacon-left', x: -22, z: -8, color: '#78ffe1' },
  { id: 'beacon-right', x: 22, z: -8, color: '#fff0a0' },
  { id: 'beacon-far-left', x: -22, z: -36, color: '#ff8b62' },
  { id: 'beacon-far-right', x: 22, z: -36, color: '#78ffe1' },
  { id: 'beacon-deep-left', x: -34, z: -62, color: '#9dfcff' },
  { id: 'beacon-deep-right', x: 34, z: -62, color: '#ffca8c' }
];

const HUD_SPEED_LINES = Array.from({ length: 12 }, (_, index) => index);
const TOUCH_LOOK_PIXELS_PER_AXIS = 16;

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function clampTouchLook(value: number): number {
  return Math.max(-0.55, Math.min(0.55, value));
}

function resetTouchFlight(): void {
  (window as any).__RED_HORIZON_TOUCH_FLIGHT__ = {
    active: false,
    move: { x: 0, y: 0, z: 0 },
    look: { x: 0, y: 0 },
    lookMode: 'delta',
    boost: false,
  };
}

function TouchFlightControls({ visible }: { visible: boolean }): JSX.Element | null {
  const state = useRef({ move: { x: 0, y: 0, z: 0 }, look: { x: 0, y: 0 }, boost: false });
  const lookPointer = useRef({ id: null as number | null, x: 0, y: 0 });
  const publish = () => {
    const current = state.current;
    (window as any).__RED_HORIZON_TOUCH_FLIGHT__ = {
      active: visible && (current.boost || Math.hypot(current.move.x, current.move.y, current.move.z, current.look.x, current.look.y) > 0),
      move: { ...current.move },
      look: { ...current.look },
      lookMode: 'delta',
      boost: current.boost,
    };
  };
  const updatePad = (event: React.PointerEvent<HTMLElement>, kind: 'move' | 'look') => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.42);
    const x = clampAxis((event.clientX - rect.left - rect.width / 2) / radius);
    const y = clampAxis((event.clientY - rect.top - rect.height / 2) / radius);
    if (kind === 'move') {
      state.current.move.x = x;
      state.current.move.z = y;
      publish();
    } else {
      const pointer = lookPointer.current;
      if (pointer.id !== event.pointerId) {
        pointer.id = event.pointerId;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        state.current.look.x = 0;
        state.current.look.y = 0;
        publish();
        return;
      }
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      state.current.look.x = clampTouchLook(dx / TOUCH_LOOK_PIXELS_PER_AXIS);
      state.current.look.y = clampTouchLook(dy / TOUCH_LOOK_PIXELS_PER_AXIS);
      publish();
      state.current.look.x = 0;
      state.current.look.y = 0;
    }
  };
  const clearPad = (kind: 'move' | 'look') => {
    if (kind === 'move') {
      state.current.move.x = 0;
      state.current.move.z = 0;
    } else {
      lookPointer.current.id = null;
      state.current.look.x = 0;
      state.current.look.y = 0;
    }
    publish();
  };
  const setAltitude = (value: number) => {
    state.current.move.y = value;
    publish();
  };
  const setBoost = (value: boolean) => {
    state.current.boost = value;
    publish();
  };
  const startFire = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const weapon = (document.getElementById('jetbike') as any)?.components?.['weapon-component'];
    if (!weapon) return;
    weapon.mouseDown = true;
    weapon.startFiring?.();
  };
  const stopFire = () => {
    const weapon = (document.getElementById('jetbike') as any)?.components?.['weapon-component'];
    if (!weapon) return;
    weapon.stopFiring?.();
  };
  const reload = () => (document.getElementById('jetbike') as any)?.components?.['weapon-component']?.reload?.();
  useEffect(() => {
    if (visible) publish();
    else resetTouchFlight();
    return resetTouchFlight;
  }, [visible]);
  if (!visible) return null;
  return <div className="touch-flight" aria-label="Touch flight controls">
    <div className="touch-pad touch-pad-move" onPointerDown={event => updatePad(event, 'move')} onPointerMove={event => updatePad(event, 'move')} onPointerUp={() => clearPad('move')} onPointerCancel={() => clearPad('move')}><span>MOVE</span></div>
    <div className="touch-pad touch-pad-look" onPointerDown={event => updatePad(event, 'look')} onPointerMove={event => updatePad(event, 'look')} onPointerUp={() => clearPad('look')} onPointerCancel={() => clearPad('look')}><span>AIM</span></div>
    <div className="touch-buttons touch-buttons-left">
      <button onPointerDown={event => { event.preventDefault(); setAltitude(1); }} onPointerUp={() => setAltitude(0)} onPointerCancel={() => setAltitude(0)}>UP</button>
      <button onPointerDown={event => { event.preventDefault(); setAltitude(-1); }} onPointerUp={() => setAltitude(0)} onPointerCancel={() => setAltitude(0)}>DOWN</button>
    </div>
    <div className="touch-buttons touch-buttons-right">
      <button onPointerDown={event => { event.preventDefault(); setBoost(true); }} onPointerUp={() => setBoost(false)} onPointerCancel={() => setBoost(false)}>BOOST</button>
      <button className="touch-fire" onPointerDown={startFire} onPointerUp={stopFire} onPointerCancel={stopFire}>FIRE</button>
      <button onClick={reload}>RELOAD</button>
    </div>
  </div>;
}

export default function App(): JSX.Element {
  const sceneRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [worldReady, setWorldReady] = useState(!ridgeMode && !streamMode);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [settings] = useState(readSettings);
  const [sensitivity, setSensitivity] = useState(settings.sensitivity);
  const [reducedMotion, setReducedMotion] = useState(settings.reducedMotion);
  const [invertY, setInvertY] = useState(settings.invertY);
  const [volume, setVolume] = useState(settings.volume);
  const [radar, setRadar] = useState<{x:number;y:number}[]>([]);
  const [mapPilot,setMapPilot]=useState({x:-19,z:10.7,yaw:-Math.PI/2,route:''});
  const [telemetry, setTelemetry] = useState('');
  const [streamInfo, setStreamInfo] = useState('Loading whole-level overview…');
  const [objective, setObjective] = useState('Choose a gate · high left: E + Shift · low right: shield');
  const objectiveTargets = useRef<ObjectiveTarget[]>([]);
  const [targetReadouts, setTargetReadouts] = useState<TargetReadout[]>([]);
  const [objectiveProgress, setObjectiveProgress] = useState(0);
  const [routeBonus, setRouteBonus] = useState('');
  useEffect(() => {
    saveSettings({sensitivity,reducedMotion,invertY,volume});
    gameAudio.setVolume(volume);
    document.getElementById('player')?.setAttribute('fly-controls', `lookSensitivity: ${sensitivity}; invertY: ${invertY}; movementSpeed: ${missionSpeed}; cameraHeight: ${missionCamera.height}; cameraDistance: ${missionCamera.distance}; cameraShoulder: ${missionCamera.shoulder}`);
  }, [sensitivity,reducedMotion,invertY,volume]);
  useEffect(() => {
    if (paused || result || !started) gameAudio.pause();
  }, [paused,result,started]);

  const clearFlightInput = () => {
    (document.getElementById('player') as any)?.components?.['fly-controls']?.clearInput?.();
  };

  useEffect(() => {
    const scene = sceneRef.current;
    let timer: ReturnType<typeof setTimeout>;
    const loaded = (event?: Event) => {
      if (event?.type === 'model-loaded') return;
      scene.pause();
      if (scene.hasLoaded) setReady(true);
    };
    const notify = (event: any) => {
      clearTimeout(timer);
      setMessage(event.detail.text);
      if (event.detail.duration) timer = setTimeout(() => setMessage(''), event.detail.duration);
    };
    const ended = (event: any) => {
      setResult(event.detail);
      scene.pause();
      if (document.pointerLockElement) document.exitPointerLock();
    };
    const reset = () => { clearTimeout(timer); setResult(null); setMessage(''); setError(''); setStarted(false); setPaused(false); setRadar([]); };
    const objectiveChanged = (event: any) => {
      setObjective(event.detail.text);
      objectiveTargets.current = Array.isArray(event.detail.targets) ? event.detail.targets : [];
      if (!objectiveTargets.current.length) setTargetReadouts([]);
      if (!objectiveTargets.current.some(item => item.label === 'EXTRACTION')) setObjectiveProgress(0);
    };
    const progressChanged = (event: any) => setObjectiveProgress(Math.max(0,Math.min(1,Number(event.detail.value)||0)));
    const levelReady = (event: any) => {
      if (event.detail.status === 'staged') return;
      setWorldReady(true);
      scene.querySelector('#arena-fallback')?.setAttribute('visible', !event.detail.authored && !fullMode);
    };
    const failed = (event: any) => {
      // Hero GLBs are an optional art layer; their fallback must not present as
      // a level failure or interrupt an otherwise playable mission.
      const target = event?.target as Element | undefined;
      if (target?.classList?.contains('hero-model-asset') || target?.closest?.('.hero-model-asset')) return;
      setError('A level asset could not load. Reload to try again.');
    };
    scene.addEventListener('loaded', loaded);
    scene.addEventListener('model-loaded', loaded);
    scene.addEventListener('mission-message', notify);
    scene.addEventListener('mission-ended', ended);
    scene.addEventListener('mission-reset', reset);
    scene.addEventListener('mission-objective', objectiveChanged);
    scene.addEventListener('mission-progress', progressChanged);
    scene.addEventListener('level-ready', levelReady);
    const level = scene.components[streamMode ? 'world-stream' : 'level-runtime'];
    if (level && (level.status === 'ready' || level.status === 'fallback')) levelReady({detail:{status:level.status, authored:level.status === 'ready'}});
    scene.addEventListener('model-error', failed, true);
    if (scene.hasLoaded) loaded();
    return () => {
      clearTimeout(timer);
      scene.removeEventListener('loaded', loaded);
      scene.removeEventListener('model-loaded', loaded);
      scene.removeEventListener('mission-message', notify);
      scene.removeEventListener('mission-ended', ended);
      scene.removeEventListener('mission-reset', reset);
      scene.removeEventListener('mission-objective', objectiveChanged);
      scene.removeEventListener('mission-progress', progressChanged);
      scene.removeEventListener('level-ready', levelReady);
      scene.removeEventListener('model-error', failed, true);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const changed = () => {
      const locked = document.pointerLockElement === document.body || document.pointerLockElement === scene.canvas;
      const manager = scene.components['game-manager'];
      if (locked && !manager.gameOver) {
        if (!manager.gameStarted) manager.startGame();
        scene.play();
        setStarted(true);
        setPaused(false);
        setError('');
      } else {
        clearFlightInput();
        scene.pause();
        setPaused(true);
      }
    };
    const failed = () => { setError('Mouse capture was blocked. Use cursor aim below.'); clearFlightInput(); scene.pause(); setPaused(true); gameAudio.pause(); };
    const hidden = () => {
      // A-Frame pause stops simulation, but its renderer otherwise keeps drawing.
      if (scene.renderStarted) {
        if (!document.hidden) scene.clock.getDelta();
        scene.renderer.setAnimationLoop(document.hidden ? null : scene.render);
      }
      if (document.hidden) {
        clearFlightInput();
        scene.pause();
        setPaused(true);
        if (document.pointerLockElement) document.exitPointerLock();
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        clearFlightInput();
        scene.pause();
        setPaused(true);
        if (document.pointerLockElement) document.exitPointerLock();
      }
    };
    const blur = () => { if (scene.components['game-manager']?.gameStarted) { clearFlightInput(); scene.pause(); setPaused(true); gameAudio.pause(); } };
    window.addEventListener('blur', blur);
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerlockchange', changed);
    document.addEventListener('pointerlockerror', failed);
    document.addEventListener('visibilitychange', hidden);
    scene.addEventListener('renderstart', hidden);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerlockchange', changed);
      document.removeEventListener('pointerlockerror', failed);
      document.removeEventListener('visibilitychange', hidden);
      scene.removeEventListener('renderstart', hidden);
    };
  }, []);

  useEffect(() => {
    let frame = 0, lastHud = 0;
    const update = (now: number) => {
      if (now-lastHud < 100) { frame = requestAnimationFrame(update); return; }
      lastHud = now;
      const player: any = document.getElementById('player');
      const flight = player?.components['fly-controls'];
      const speed = flight?.velocity?.length() || 0;
      const speedEl = document.getElementById('speed-value');
      const altitudeEl = document.getElementById('altitude-value');
      if (speedEl) speedEl.textContent = Math.round(speed).toString();
      if (altitudeEl) altitudeEl.textContent = Math.round(player?.object3D?.position.y || 0).toString();
      const manager = sceneRef.current?.components['game-manager'];
      if (ridgeMode || fullMode || ipadMode) {
        const charges = (document.getElementById('jetbike') as any)?.components?.['weapon-component']?.chargedShots || 0;
        const shield = player?.components?.['player-component']?.shield || 0;
        setRouteBonus(charges ? `CHARGED SHOTS ${charges} · DOUBLE DAMAGE` : shield ? `SHIELD ${Math.ceil(shield)}` : 'TWIN PULSE CANNON');
      }
      const angle = flight?.rotation?.y || 0;
      const pos = player?.object3D?.position;
      if(fullMode && pos)setMapPilot({x:pos.x,z:pos.z,yaw:angle,route:sceneRef.current?.components?.['bridgehead-run']?.route || ''});
      if (pos) setRadar((manager?.activeEnemies || []).map((enemy: any) => {
        const dx=enemy.el.object3D.position.x-pos.x, dz=enemy.el.object3D.position.z-pos.z;
        const x=dx*Math.cos(angle)-dz*Math.sin(angle), y=dx*Math.sin(angle)+dz*Math.cos(angle);
        const scale=Math.min(1,42/Math.max(1,Math.hypot(x,y)));
        return {x:50+x*scale,y:50+y*scale};
      }));
      const camera:any = document.getElementById('camera');
      const projectionCamera=camera?.getObject3D?.('camera') || camera?.components?.camera?.camera;
      if ((fullMode || ipadMode) && pos && projectionCamera && objectiveTargets.current.length) {
        sceneRef.current?.object3D?.updateMatrixWorld(true);
        const cameraPosition=projectionCamera.getWorldPosition(new THREE.Vector3());
        const forward=projectionCamera.getWorldDirection(new THREE.Vector3());
        setTargetReadouts(objectiveTargets.current.map(item => {
          const world=new THREE.Vector3(item.position.x,item.position.y,item.position.z);
          const delta=world.clone().sub(cameraPosition),behind=forward.dot(delta)<0;
          const projected=world.clone().project(projectionCamera);
          let left=(projected.x*.5+.5)*100,top=(-projected.y*.5+.5)*100;
          if (behind) { left=100-left; top=100-top; }
          const offscreen=behind || projected.z>1 || left<8 || left>92 || top<12 || top>86;
          const minTop=ipadMode ? 30 : 12, maxTop=ipadMode ? 64 : 86;
          const minLeft=ipadMode ? 16 : 8, maxLeft=ipadMode ? 84 : 92;
          left=Math.max(minLeft,Math.min(maxLeft,left));top=Math.max(minTop,Math.min(maxTop,top));
          return {...item,distance:delta.length(),altitude:item.position.y-pos.y,left,top,offscreen};
        }));
      }
      const info = sceneRef.current?.renderer?.info;
      if (info) setTelemetry(`${info.render.calls} draws · ${info.render.triangles} triangles · ${info.memory.geometries} geometries`);
      if (streamMode) setStreamInfo(sceneRef.current?.components?.['world-stream']?.telemetry || 'Loading whole-level overview…');
      document.documentElement.style.setProperty('--speed-intensity', Math.min(1, speed / 18).toFixed(2));
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  const capture = () => {
    if (!ready || !worldReady) return;
    if (sceneRef.current.components['game-manager'].gameOver) sceneRef.current.components['game-manager'].resetMission();
    gameAudio.resume();
    gameAudio.startAmbient();
    const player = document.getElementById('player');
    player?.setAttribute('fly-controls', `enabled: true; dragToLook: false; lookSensitivity: ${sensitivity}; invertY: ${invertY}; movementSpeed: ${missionSpeed}; cameraHeight: ${missionCamera.height}; cameraDistance: ${missionCamera.distance}; cameraShoulder: ${missionCamera.shoulder}`);
    try {
      const request = (sceneRef.current.canvas || document.body).requestPointerLock();
      (request as any)?.catch(() => setError('Mouse capture was blocked. Click again to retry.'));
    } catch { setError('This browser could not capture the mouse. Try desktop Chrome or Firefox.'); }
  };

  const cursorFlight = () => {
    if (!ready || !worldReady) return;
    const scene = sceneRef.current;
    if (scene.components['game-manager'].gameOver) scene.components['game-manager'].resetMission();
    gameAudio.resume();
    gameAudio.startAmbient();
    document.getElementById('player')?.setAttribute('fly-controls', `enabled: true; dragToLook: true; lookSensitivity: ${sensitivity}; invertY: ${invertY}; movementSpeed: ${missionSpeed}; cameraHeight: ${missionCamera.height}; cameraDistance: ${missionCamera.distance}; cameraShoulder: ${missionCamera.shoulder}`);
    if (!scene.components['game-manager'].gameStarted) scene.components['game-manager'].startGame();
    scene.play();
    setStarted(true); setPaused(false); setError('');
  };

  const touchFlight = () => {
    if (!ready || !worldReady) return;
    const scene = sceneRef.current;
    if (scene.components['game-manager'].gameOver) scene.components['game-manager'].resetMission();
    resetTouchFlight();
    gameAudio.resume();
    gameAudio.startAmbient();
    document.getElementById('player')?.setAttribute('fly-controls', `enabled: true; dragToLook: false; lookSensitivity: ${sensitivity}; invertY: ${invertY}; movementSpeed: ${missionSpeed}; cameraHeight: ${missionCamera.height}; cameraDistance: ${missionCamera.distance}; cameraShoulder: ${missionCamera.shoulder}`);
    if (!scene.components['game-manager'].gameStarted) scene.components['game-manager'].startGame();
    scene.play();
    setStarted(true); setPaused(false); setError('');
  };

  const arena = useMemo(() => (
    <a-scene world-stream={streamMode ? (fullMode ? (failedArtFixture ? `playable: true; scale: ${BRIDGEHEAD_ENVIRONMENT_SCALE}; manifest: models/level1-stream/missing.json` : `playable: true; scale: ${BRIDGEHEAD_ENVIRONMENT_SCALE}`) : '') : undefined} level-runtime={ridgeMode ? '' : undefined} ipad-stage-run={ipadMode ? '' : undefined} ridge-run={ridgeMode ? '' : undefined} bridgehead-run={fullMode ? '' : undefined} data-playtest={new URLSearchParams(window.location.search).has('playtest') ? 'true' : undefined} ref={sceneRef} game-manager="enemyCount: 2; level: 1; spawnRadius: 16; maxActiveEnemies: 4; enemySpawnInterval: 1200" gltf-model="dracoDecoderPath: vendor/draco/" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false" renderer="maxCanvasWidth: 1280; maxCanvasHeight: 720; antialias: false; colorManagement: true; toneMapping: ACESFilmic; exposure: 1.15; precision: high" background="color: #130b14" fog={streamMode ? 'type: exponential; color: #36303c; density: 0.002' : 'type: exponential; color: #a06951; density: 0.009'}>
      <a-entity id="level" visible="false" />
      <a-entity star-field="starCount: 180; starSize: 0.15; width: 260; height: 80; depth: 220; color: #ffe2c2; speed: 0.01" position="0 95 -70" />
      <a-entity id="arena-fallback" visible={!fullMode}>
      <a-entity mars-environment="" />
      {RUNWAY_LINES.map(x => <a-entity key={`runway-${x}`} geometry="primitive: box; width: 0.14; height: 0.08; depth: 96" position={`${x} 0.05 -19`} material="shader: flat; color: #dbb895; opacity: 0.18; transparent: true" />)}
      {[-26, 26].map(x => <a-entity key={`wall-${x}`} geometry="primitive: box; width: 0.35; height: 2.2; depth: 70" position={`${x} 1 -10`} material="shader: flat; color: #102a2e; opacity: 0.72; transparent: true" />)}
      {BEACONS.map(beacon => <a-entity key={beacon.id} position={`${beacon.x} 0 ${beacon.z}`}>
        <a-entity geometry="primitive: cylinder; radius: 0.32; height: 5.5; segmentsRadial: 8" position="0 2.75 0" material="color: #151d22; roughness: 0.7" />
        <a-entity geometry="primitive: sphere; radius: 0.62; segmentsWidth: 12; segmentsHeight: 8" position="0 5.7 0" material={`shader: flat; color: ${beacon.color}`} />
      </a-entity>)}
      {ARENA_PROPS.map(prop => <a-entity key={prop.id} id={prop.id} class="obstacle" position={prop.position} geometry={prop.geometry} material={prop.material} />)}
      <a-entity geometry="primitive: box; width: 52; height: 0.12; depth: 0.4" position="0 0.28 25" material="shader: flat; color: #ff8b62; opacity: 0.45; transparent: true" />
      <a-entity geometry="primitive: box; width: 52; height: 0.12; depth: 0.4" position="0 0.28 -49" material="shader: flat; color: #ff8b62; opacity: 0.45; transparent: true" />
      </a-entity>
      {ipadMode ? <>
        {IPAD_STAGE_GATES.map(gate => <a-entity key={gate.id} data-ipad-stage-gate={gate.id} position={`${gate.position.x} ${gate.position.y} ${gate.position.z}`} geometry={`primitive: torus; radius: ${gate.radius}; radiusTubular: 0.18; segmentsRadial: 8; segmentsTubular: 40`} material={`shader: flat; color: ${gate.color}`} />)}
        <a-entity id="ipad-stage-extraction" visible="false" position={`${IPAD_STAGE_EXTRACTION.x} ${IPAD_STAGE_EXTRACTION.y} ${IPAD_STAGE_EXTRACTION.z}`} geometry="primitive: torus; radius: 5.5; radiusTubular: 0.28; segmentsRadial: 8; segmentsTubular: 40" material="shader: flat; color: #ffe29a" />
      </> : ridgeMode ? <>
        {RIDGE_GATES.map(gate => <a-entity key={gate.id} data-ridge-gate={gate.id} position={`${gate.position.x} ${gate.position.y} ${gate.position.z}`} geometry={`primitive: torus; radius: ${gate.radius}; radiusTubular: 0.16; segmentsRadial: 8; segmentsTubular: 40`} material={`shader: flat; color: ${gate.color}`} />)}
        <a-entity id="ridge-extraction" visible="false" position={`${EXTRACTION.x} ${EXTRACTION.y} ${EXTRACTION.z}`} geometry="primitive: torus; radius: 3; radiusTubular: 0.2; segmentsRadial: 8; segmentsTubular: 40" material="shader: flat; color: #ffe29a" />
      </> : fullMode ? <>
        <a-entity id="bridgehead-route-art" bridgehead-art={failedArtFixture ? 'src: models/missing-route.glb' : ''} />
        {BRIDGEHEAD_GATES.map(gate => <a-entity key={gate.id} data-bridgehead-gate={gate.id} position={`${gate.position.x} ${gate.position.y} ${gate.position.z}`} rotation="0 90 0" geometry={`primitive: torus; radius: ${gate.radius}; radiusTubular: 0.18; segmentsRadial: 8; segmentsTubular: 40`} material={`shader: flat; color: ${gate.color}`} />)}
        {BRIDGEHEAD_EXITS.map(exit => <a-entity key={`exit-${exit.id}`} data-bridgehead-exit={exit.id} visible="false" position={`${exit.position.x} ${exit.position.y} ${exit.position.z}`} rotation="0 90 0" geometry={`primitive: torus; radius: ${exit.radius}; radiusTubular: 0.12; segmentsRadial: 8; segmentsTubular: 40`} material={`shader: flat; color: ${exit.color}; opacity: 0.75; transparent: true`} />)}
        {BRIDGEHEAD_APPROACHES.map(marker=><a-entity key={`approach-${marker.id}`} data-bridgehead-approach={marker.id} visible="false" position={`${marker.position.x} ${marker.position.y} ${marker.position.z}`} geometry="primitive: octahedron; radius: 0.4" material={`shader: flat; color: ${marker.color}`} />)}
        <a-entity id="bridgehead-extraction" visible="false" position={`${BRIDGEHEAD_EXTRACTION.x} ${BRIDGEHEAD_EXTRACTION.y} ${BRIDGEHEAD_EXTRACTION.z}`} rotation="90 0 0" geometry="primitive: torus; radius: 3.5; radiusTubular: 0.25; segmentsRadial: 8; segmentsTubular: 40" material="shader: flat; color: #ffe29a" />
      </> : surveyMode ? null : <>
        <a-entity geometry="primitive: torus; radius: 7.5; radiusTubular: 0.12; segmentsRadial: 8; segmentsTubular: 48" position="0 7.6 -26" material="shader: flat; color: #7dffe9" />
        <a-entity geometry="primitive: torus; radius: 4.5; radiusTubular: 0.1; segmentsRadial: 8; segmentsTubular: 40" position="-15 4.6 -30" material="shader: flat; color: #ffb174" />
        <a-entity geometry="primitive: torus; radius: 4.5; radiusTubular: 0.1; segmentsRadial: 8; segmentsTubular: 40" position="15 4.6 -30" material="shader: flat; color: #ffb174" />
      </>}
      <a-entity geometry="primitive: sphere; radius: 12; segmentsWidth: 16; segmentsHeight: 8" position="-95 45 -170" material="shader: flat; color: #ffcf94; fog: false" />
      <a-entity geometry="primitive: ring; radiusInner: 14; radiusOuter: 18; segmentsTheta: 48" position="-95 45 -169" material="shader: flat; color: #ffb56b; opacity: 0.16; transparent: true; side: double" />
      <a-entity id="player" position="0 3 12" player-component="" fly-controls={`enabled: false; lookSensitivity: 0.5; movementSpeed: ${missionSpeed}; cameraHeight: ${missionCamera.height}; cameraDistance: ${missionCamera.distance}; cameraShoulder: ${missionCamera.shoulder}`}>
        <a-entity id="camera-rig" position={`${missionCamera.shoulder} ${missionCamera.height} ${missionCamera.distance}`}><a-camera id="camera" near={fullMode ? 0.1 : 0.005} far={fullMode ? 500 : 10000} position="0 0 0" look-controls="enabled: false" wasd-controls="enabled: false" /></a-entity>
        <a-entity id="jetbike" hero-model="src: models/avi-jetbike.glb; targetHeight: 1.8; targetLength: 0; heading: 180; animation: none" weapon-component="cooldown: 0.16; accuracy: 1; thrusterParticles: false" />
        <a-entity id="player-hitbox" geometry="primitive: box; width: 1.2; height: 1.8; depth: 1.2" material="visible: false" />
      </a-entity>
      <a-light type="hemisphere" color="#bfd1f0" ground-color="#5b3030" intensity="1.3" />
      <a-light type="directional" color="#ffd6a0" intensity="1.4" position="-30 28 25" />
      <a-light type="point" color="#83c4dc" intensity="0.3" distance="54" position="0 8 -20" />
    </a-scene>
  ), []);

  return <div className={`App ${paused ? 'is-paused' : ''} ${reducedMotion ? 'reduced-motion' : ''} ${ipadMode ? 'is-touch-stage' : ''}`}>
    <div className="hud" style={{ visibility: started && !result ? 'visible' : 'hidden' }}>
      <div className="cockpit-glass" />
      <div className="speed-lines" aria-hidden="true">{HUD_SPEED_LINES.map(index => <i key={index} style={{ '--i': index, '--side': index % 2 ? 1 : -1, '--lane': index % 4 } as React.CSSProperties} />)}</div>
      <div id="threat-warning">INCOMING · STRAFE</div>
      <div id="crosshair"><span>+</span></div>
      <div id="score-ui"><small>OPERATION / RED HORIZON</small><div>{fullMode ? 'BRIDGEHEAD RUN' : ipadMode ? 'IPAD TOUCH STAGE' : surveyMode ? 'FULL LEVEL · SURVEY' : ridgeMode ? 'RIDGE RUN' : <>WAVE <span id="level-value">1</span> / 3</>}</div><div>SCORE <span id="score-value">0</span></div><div>HOSTILES <span id="enemies-value">0</span></div><div id="combo-value">CHAIN ×1</div></div>
      {surveyMode && <div className="ridge-objective"><strong>Whole-level survey · no terrain collision or combat</strong><small>{streamInfo} · {telemetry}</small></div>}
      {(ridgeMode || fullMode || ipadMode) && <div className="ridge-objective"><strong>{objective}</strong><small>{routeBonus}</small></div>}
      {(fullMode || ipadMode) && <div className="objective-targets">{targetReadouts.map(item => <div key={item.label} className={`objective-target ${item.offscreen ? 'offscreen' : ''}`} style={{left:`${item.left}%`,top:`${item.top}%`}}><b>{item.offscreen ? '◆ ' : ''}{item.label}</b><span>{Math.round(item.distance)}m · {item.altitude>=0?'+':''}{Math.round(item.altitude)}m ALT{item.approach ? ` · ${item.approach}` : ''}</span>{item.label==='EXTRACTION' && <i><em style={{width:`${Math.round(objectiveProgress*100)}%`}} /></i>}</div>)}</div>}
      <div className="flight-readout"><span id="speed-value">0</span> M/S <b> / </b><span id="altitude-value">0</span> M ALT</div>
      <div className="hull-label">HULL INTEGRITY</div><div id="health-display"><div id="health-bar" /></div>
      <div id="ammo-display">30 / ∞</div>
      {fullMode ? <RouteMap {...mapPilot} /> : <div className="radar" aria-label={`${radar.length} radar contacts`}><small>HOSTILES</small><i className="radar-player" />{radar.map((contact,i) => <span key={i} style={{left:`${contact.x}%`,top:`${contact.y}%`}} />)}</div>}
      <div className="boost-meter" aria-label="Speed indicator"><i /></div>
      <div className="controls-hint">{ipadMode ? 'Touch pads: move + aim · buttons: altitude, boost, fire, reload' : 'WASD fly · E / Q altitude · Shift boost · Captured: move mouse · Drag: right-look / left-aim+fire · Esc pause'}</div>
      {!paused && <div className="mission-toast" role="status">{message}</div>}
    </div>
    <div id="damage-overlay" />
    <TouchFlightControls visible={ipadMode && started && !paused && !result} />
    {(!started || paused || result) && <div className="menu-shade"><main className="mission-menu">
      <div className="eyebrow">MARS / FLIGHT DIVISION <span>PLAYABLE PROTOTYPE 01</span></div>
      <p className="coordinates">25.4° N &nbsp; 137.8° E &nbsp; / &nbsp; SIGNAL ACTIVE</p>
      <h1>{result ? (result.won ? 'SECTOR\nSECURED.' : 'SIGNAL\nLOST.') : paused && started ? 'HOLD\nPOSITION.' : 'RED\nHORIZON.'}</h1>
      <p className="menu-description">{result ? `Score ${result.score} · Best ${result.best} · ${(ridgeMode || fullMode || ipadMode) ? `${result.route || 'No'} route · ${result.seconds}s · ${result.shots || 0} shots · ${result.hullLost || 0} hull lost · ${result.chargesSpent || 0} charges spent` : `Wave ${result.level}/3`}` : fullMode ? 'Choose charged fire or a shield. Cross the chasm, bait the enemy aim lock, then strike while its armor is open. Reach the extraction platform.' : ipadMode ? 'A fast-loading touch-control proving ground for iPad. Fly through a charge or shield gate, defeat one Warden, then extract.' : surveyMode ? 'Explore the complete original level layout. Coarse terrain stays visible while nearby high-detail regions stream on demand. This editor survey has no collision or combat.' : ridgeMode ? 'A short route experiment. Boost through the high cyan gate for three double-damage shots, or take the low amber gate for 30 shield. Defeat the Warden, then hold inside the gold extraction ring.' : 'Pilot a combat jetbike over the red frontier. Clear three waves. Chain eliminations within six seconds to multiply your score.'}</p>
      <div className="mission-details"><div><small>MISSION</small><strong>{fullMode ? 'Bridgehead Run' : ipadMode ? 'iPad Touch Stage' : surveyMode ? 'Full-level survey' : ridgeMode ? 'Ridge Run' : 'Three-wave sortie'}</strong></div><div><small>LOADOUT</small><strong>Twin pulse cannon</strong></div><div><small>FLIGHT</small><strong>{ipadMode ? 'Touch controls' : 'Mouse + keyboard'}</strong></div></div>
      {!started && <a className="mode-link" href={ridgeMode ? './?arena' : './?ridge-run'}>{ridgeMode ? 'Switch to three-wave combat' : 'Fly Ridge Run'}</a>}
      {!started && !ipadMode && <a className="mode-link" href="./?ipad-stage">Open iPad touch stage</a>}
      {!started && !fullMode && <a className="mode-link" href="./?bridgehead">Play Bridgehead Run in the full level</a>}
      {!started && !surveyMode && <a className="mode-link" href="./?full-level">Open full-level art survey</a>}
      <div className="settings"><label>Mouse sensitivity <input aria-label="Mouse sensitivity" type="range" min="0.1" max="1.5" step="0.1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))} /></label><label><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} /> Reduce screen effects</label><label><input type="checkbox" checked={invertY} onChange={e => setInvertY(e.target.checked)} /> Invert vertical aim</label><label>Audio volume <input aria-label="Audio volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))} /></label></div>
      {error && <p role="alert" className="error">{error}</p>}
      {ipadMode ? <button id="start-button" disabled={!ready || !worldReady} onClick={touchFlight}>{result ? 'FLY AGAIN · TOUCH' : !ready || !worldReady ? 'PREPARING FLIGHT…' : started ? 'RESUME TOUCH FLIGHT' : 'LAUNCH TOUCH STAGE'}</button> : <button id="start-button" disabled={!ready || !worldReady} onClick={capture}>{result ? 'FLY AGAIN ↗' : !ready || !worldReady ? 'PREPARING FLIGHT…' : started ? 'RESUME FLIGHT ↗' : 'LAUNCH SORTIE ↗'}</button>}
      {ready && worldReady && !ipadMode && <button className="cursor-button" onClick={cursorFlight}>{result ? 'Fly again with drag aim' : 'Play with drag aim (no mouse capture)'}</button>}
      <p className="menu-controls">{ipadMode ? 'Left pad moves · right pad aims · UP/DOWN altitude · BOOST / FIRE / RELOAD buttons' : 'WASD move · ← → steer / E rise · Q descend / Shift boost\nCaptured mouse: move to aim · Drag mode: hold right to aim or left to aim + fire\nR reload / Esc pause'}</p>
    </main></div>}
    <PlaytestPanel sceneRef={sceneRef} telemetry={telemetry} launch={cursorFlight} />
    {arena}
  </div>;
}
