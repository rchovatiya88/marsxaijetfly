import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import './aframe-init';
import { gameAudio } from './game-audio';

declare global {
  namespace JSX { interface IntrinsicElements { 'a-scene': any; 'a-entity': any; 'a-camera': any; 'a-light': any; } }
}

type Result = { score: number; level: number; won: boolean; best: number };

const ARENA_PROPS = [
  { id: 'gate-left', position: '-9 2 -16', geometry: 'primitive: box; width: 1.2; height: 4; depth: 1.2', material: 'color: #855241; roughness: 1' },
  { id: 'gate-right', position: '9 2 -16', geometry: 'primitive: box; width: 1.2; height: 4; depth: 1.2', material: 'color: #855241; roughness: 1' },
  { id: 'center-ring-top', position: '0 4 -16', geometry: 'primitive: box; width: 18; height: 0.8; depth: 1.2', material: 'color: #ad6043; roughness: 1' },
  { id: 'cover-left', position: '-12 1 -2', geometry: 'primitive: box; width: 5; height: 2; depth: 2', material: 'color: #4c3430; roughness: 1' },
  { id: 'cover-right', position: '12 1 -3', geometry: 'primitive: box; width: 5; height: 2; depth: 2', material: 'color: #4c3430; roughness: 1' },
  { id: 'tower-a', position: '-18 5 -22', geometry: 'primitive: cylinder; radius: 1.4; height: 10; segmentsRadial: 8', material: 'color: #6a4139; roughness: 1' },
  { id: 'tower-b', position: '18 4 -24', geometry: 'primitive: cylinder; radius: 1.2; height: 8; segmentsRadial: 8', material: 'color: #6a4139; roughness: 1' }
];

const RUNWAY_LINES = [-21, -15, -9, -3, 3, 9, 15, 21];
const SPEED_STRIPS = [-24, -18, -12, -6, 6, 12, 18, 24];
const CRATER_RINGS = [
  { id: 'crater-a', position: '-24 0.03 8', radius: 7.5, color: '#2b1518' },
  { id: 'crater-b', position: '23 0.035 -32', radius: 10.5, color: '#30191b' },
  { id: 'crater-c', position: '5 0.04 -52', radius: 13, color: '#241316' }
];
const RIDGE_SPIKES = [
  [-34, -18, 5.5], [-31, -33, 8], [-39, 4, 4.5], [33, -20, 6.5], [37, -38, 7.5],
  [-22, -58, 9], [24, -58, 8.5], [-48, -46, 6], [48, -48, 6.5]
];
const BEACONS = [
  { id: 'beacon-left', x: -22, z: -8, color: '#78ffe1' },
  { id: 'beacon-right', x: 22, z: -8, color: '#fff0a0' },
  { id: 'beacon-far-left', x: -22, z: -36, color: '#ff8b62' },
  { id: 'beacon-far-right', x: 22, z: -36, color: '#78ffe1' },
  { id: 'beacon-deep-left', x: -34, z: -62, color: '#9dfcff' },
  { id: 'beacon-deep-right', x: 34, z: -62, color: '#ffca8c' }
];

const CANYON_WALLS = [
  [-62, -28, 18, 18, 70], [-49, -60, 24, 15, 52], [58, -24, 20, 17, 66], [46, -66, 28, 14, 58],
  [-72, 20, 16, 12, 54], [70, 16, 18, 13, 56]
];
const SKY_BANDS = [
  { id: 'sky-band-a', y: 16, z: -84, h: 12, color: '#ff8d5a', opacity: 0.09 },
  { id: 'sky-band-b', y: 25, z: -96, h: 10, color: '#78ffe1', opacity: 0.045 },
  { id: 'sky-band-c', y: 36, z: -116, h: 16, color: '#fff0a0', opacity: 0.04 }
];
const HUD_SPEED_LINES = Array.from({ length: 12 }, (_, index) => index);

export default function App(): JSX.Element {
  const sceneRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [reducedMotion, setReducedMotion] = useState(false);

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
    const failed = () => setError('A level asset could not load. Reload to try again.');
    scene.addEventListener('loaded', loaded);
    scene.addEventListener('model-loaded', loaded);
    scene.addEventListener('mission-message', notify);
    scene.addEventListener('mission-ended', ended);
    scene.addEventListener('model-error', failed, true);
    if (scene.hasLoaded) loaded();
    return () => {
      clearTimeout(timer);
      scene.removeEventListener('loaded', loaded);
      scene.removeEventListener('model-loaded', loaded);
      scene.removeEventListener('mission-message', notify);
      scene.removeEventListener('mission-ended', ended);
      scene.removeEventListener('model-error', failed, true);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const changed = () => {
      const locked = document.pointerLockElement === document.body;
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
    const failed = () => { setError('Mouse capture was blocked. Click Launch or Resume to try again.'); clearFlightInput(); scene.pause(); };
    const hidden = () => {
      if (document.hidden) {
        clearFlightInput();
        scene.pause();
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
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerlockchange', changed);
    document.addEventListener('pointerlockerror', failed);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerlockchange', changed);
      document.removeEventListener('pointerlockerror', failed);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const player: any = document.getElementById('player');
      const flight = player?.components['fly-controls'];
      const speed = flight?.velocity?.length() || 0;
      const speedEl = document.getElementById('speed-value');
      const altitudeEl = document.getElementById('altitude-value');
      if (speedEl) speedEl.textContent = Math.round(speed).toString();
      if (altitudeEl) altitudeEl.textContent = Math.max(0, Math.round(player?.object3D?.position.y || 0)).toString();
      document.documentElement.style.setProperty('--speed-intensity', Math.min(1, speed / 18).toFixed(2));
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  const capture = () => {
    if (!ready) return;
    gameAudio.resume();
    gameAudio.startAmbient();
    const player = document.getElementById('player');
    player?.setAttribute('fly-controls', `enabled: true; lookSensitivity: ${sensitivity}`);
    try {
      const request = document.body.requestPointerLock();
      (request as any)?.catch(() => setError('Mouse capture was blocked. Click again to retry.'));
    } catch { setError('This browser could not capture the mouse. Try desktop Chrome or Firefox.'); }
  };

  const cursorFlight = () => {
    const scene = sceneRef.current;
    gameAudio.resume();
    gameAudio.startAmbient();
    document.getElementById('player')?.setAttribute('fly-controls', `enabled: true; dragToLook: true; lookSensitivity: ${sensitivity}`);
    if (!scene.components['game-manager'].gameStarted) scene.components['game-manager'].startGame();
    scene.play();
    setStarted(true); setPaused(false); setError('');
  };

  return <div className={`App ${reducedMotion ? 'reduced-motion' : ''}`}>
    <div className="hud" style={{ visibility: started && !result ? 'visible' : 'hidden' }}>
      <div className="cockpit-glass" />
      <div className="speed-lines" aria-hidden="true">{HUD_SPEED_LINES.map(index => <i key={index} style={{ '--i': index } as React.CSSProperties} />)}</div>
      <div id="threat-warning">LOCK</div>
      <div id="crosshair"><span>+</span></div>
      <div id="score-ui"><small>OPERATION / RED HORIZON</small><div>WAVE <span id="level-value">1</span> / 3</div><div>SCORE <span id="score-value">0</span></div><div>HOSTILES <span id="enemies-value">3</span></div><div id="combo-value">CHAIN ×1</div></div>
      <div className="flight-readout"><span id="speed-value">0</span> M/S <b> / </b><span id="altitude-value">0</span> M ALT</div>
      <div className="hull-label">HULL INTEGRITY</div><div id="health-display"><div id="health-bar" /></div>
      <div id="ammo-display">30 / ∞</div>
      <div className="radar"><span /> <b /> <em /></div>
      <div className="boost-meter"><i /></div>
      <div className="controls-hint">WASD fly · E / Q altitude · Shift boost · R reload · Esc pause</div>
      {!paused && <div className="mission-toast" role="status">{message}</div>}
    </div>
    <div id="damage-overlay" />
    {(!started || paused || result) && <div className="menu-shade"><main className="mission-menu">
      <div className="eyebrow">MARS / FLIGHT DIVISION <span>PLAYABLE PROTOTYPE 01</span></div>
      <p className="coordinates">25.4° N &nbsp; 137.8° E &nbsp; / &nbsp; SIGNAL ACTIVE</p>
      <h1>{result ? (result.won ? 'SECTOR\nSECURED.' : 'SIGNAL\nLOST.') : paused && started ? 'HOLD\nPOSITION.' : 'RED\nHORIZON.'}</h1>
      <p className="menu-description">{result ? `Score ${result.score} · Best ${result.best} · Wave ${result.level}/3` : 'Pilot a combat jetbike over the red frontier. Clear three waves. Chain eliminations within six seconds to multiply your score.'}</p>
      <div className="mission-details"><div><small>MISSION</small><strong>Three-wave sortie</strong></div><div><small>LOADOUT</small><strong>Twin pulse cannon</strong></div><div><small>FLIGHT</small><strong>Mouse + keyboard</strong></div></div>
      <div className="settings"><label>Mouse sensitivity <input aria-label="Mouse sensitivity" type="range" min="0.1" max="1.5" step="0.1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))} /></label><label><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} /> Reduce screen effects</label></div>
      {error && <p role="alert" className="error">{error}</p>}
      <button id="start-button" disabled={!ready} onClick={result ? () => window.location.reload() : capture}>{result ? 'FLY AGAIN ↗' : !ready ? 'PREPARING FLIGHT…' : started ? 'RESUME FLIGHT ↗' : 'LAUNCH SORTIE ↗'}</button>
      {!result && ready && <button className="cursor-button" onClick={cursorFlight}>Play with cursor aim (no mouse capture)</button>}
      <p className="menu-controls">WASD move &nbsp; / &nbsp; E rise · Q descend &nbsp; / &nbsp; Shift boost<br />Mouse aim · Hold click fire &nbsp; / &nbsp; R reload &nbsp; / &nbsp; Esc pause</p>
    </main></div>}
    <a-scene ref={sceneRef} game-manager="enemyCount: 2; level: 1; spawnRadius: 16; maxActiveEnemies: 4; enemySpawnInterval: 1200" vr-mode-ui="enabled: false" renderer="antialias: false; colorManagement: true; precision: mediump" background="color: #130b14" fog="type: exponential; color: #452320; density: 0.0065">
      <a-entity id="level" visible="false" />
      <a-entity star-field="starCount: 180; starSize: 0.15; width: 260; height: 80; depth: 220; color: #ffe2c2; speed: 0.01" position="0 34 -70" />
      <a-entity id="arena-ground" geometry="primitive: plane; width: 190; height: 190" rotation="-90 0 0" material="color: #743a2c; roughness: 1; metalness: 0" position="0 -0.1 0" />
      <a-entity geometry="primitive: plane; width: 82; height: 128" rotation="-90 0 0" position="0 -0.08 -18" material="shader: flat; color: #2a151b; opacity: 0.32; transparent: true" />
      {SKY_BANDS.map(band => <a-entity key={band.id} geometry={`primitive: plane; width: 220; height: ${band.h}`} position={`0 ${band.y} ${band.z}`} material={`shader: flat; color: ${band.color}; opacity: ${band.opacity}; transparent: true; side: double`} />)}
      {CANYON_WALLS.map(([x, z, h, w, d], index) => <a-entity key={`canyon-${index}`} geometry={`primitive: box; width: ${w}; height: ${h}; depth: ${d}`} position={`${x} ${h / 2 - 0.3} ${z}`} material="color: #3f2021; roughness: 1" />)}
      {CRATER_RINGS.map(crater => <React.Fragment key={crater.id}>
        <a-entity geometry={`primitive: ring; radiusInner: ${crater.radius * 0.76}; radiusOuter: ${crater.radius}; segmentsTheta: 40`} rotation="-90 0 0" position={crater.position} material={`shader: flat; color: ${crater.color}; opacity: 0.55; transparent: true`} />
        <a-entity geometry={`primitive: ring; radiusInner: ${crater.radius}; radiusOuter: ${crater.radius + 0.35}; segmentsTheta: 40`} rotation="-90 0 0" position={crater.position} material="shader: flat; color: #ff9f69; opacity: 0.16; transparent: true" />
      </React.Fragment>)}
      {RIDGE_SPIKES.map(([x, z, h], index) => <a-entity key={`ridge-${index}`} geometry={`primitive: cone; radiusBottom: ${h * 0.55}; radiusTop: 0.4; height: ${h}; segmentsRadial: 6`} position={`${x} ${h / 2 - 0.1} ${z}`} material="color: #4b2726; roughness: 1" />)}
      <a-entity geometry="primitive: ring; radiusInner: 18; radiusOuter: 19; segmentsTheta: 48" rotation="-90 0 0" position="0 0.02 -10" material="shader: flat; color: #ff8b62; opacity: 0.45; transparent: true" />
      <a-entity geometry="primitive: ring; radiusInner: 32; radiusOuter: 32.6; segmentsTheta: 64" rotation="-90 0 0" position="0 0.04 -10" material="shader: flat; color: #70ffe4; opacity: 0.25; transparent: true" />
      {RUNWAY_LINES.map(x => <a-entity key={`runway-${x}`} geometry="primitive: box; width: 0.14; height: 0.08; depth: 96" position={`${x} 0.05 -19`} material="shader: flat; color: #2fffd5; opacity: 0.34; transparent: true" />)}
      {SPEED_STRIPS.map((x, index) => <a-entity key={`speed-strip-${index}`} geometry="primitive: box; width: 2.8; height: 0.09; depth: 0.65" position={`${x} 0.08 ${18 - index * 9}`} material="shader: flat; color: #fff0a0; opacity: 0.28; transparent: true" />)}
      {[-26, 26].map(x => <a-entity key={`wall-${x}`} geometry="primitive: box; width: 0.35; height: 2.2; depth: 70" position={`${x} 1 -10`} material="shader: flat; color: #102a2e; opacity: 0.72; transparent: true" />)}
      {BEACONS.map(beacon => <a-entity key={beacon.id} position={`${beacon.x} 0 ${beacon.z}`}>
        <a-entity geometry="primitive: cylinder; radius: 0.32; height: 5.5; segmentsRadial: 8" position="0 2.75 0" material="color: #151d22; roughness: 0.7" />
        <a-entity geometry="primitive: sphere; radius: 0.62; segmentsWidth: 12; segmentsHeight: 8" position="0 5.7 0" material={`shader: flat; color: ${beacon.color}`} light={`type: point; color: ${beacon.color}; intensity: 0.9; distance: 18`} />
      </a-entity>)}
      {ARENA_PROPS.map(prop => <a-entity key={prop.id} id={prop.id} class="obstacle" position={prop.position} geometry={prop.geometry} material={prop.material} />)}
      <a-entity geometry="primitive: box; width: 52; height: 0.12; depth: 0.4" position="0 0.28 25" material="shader: flat; color: #ff8b62; opacity: 0.45; transparent: true" />
      <a-entity geometry="primitive: box; width: 52; height: 0.12; depth: 0.4" position="0 0.28 -49" material="shader: flat; color: #ff8b62; opacity: 0.45; transparent: true" />
      <a-entity geometry="primitive: torus; radius: 7.5; radiusTubular: 0.12; segmentsRadial: 8; segmentsTubular: 48" rotation="0 90 0" position="0 4 -26" material="shader: flat; color: #7dffe9" />
      <a-entity geometry="primitive: torus; radius: 4.5; radiusTubular: 0.1; segmentsRadial: 8; segmentsTubular: 40" rotation="0 90 0" position="-15 3 -30" material="shader: flat; color: #ffb174" />
      <a-entity geometry="primitive: torus; radius: 4.5; radiusTubular: 0.1; segmentsRadial: 8; segmentsTubular: 40" rotation="0 90 0" position="15 3 -30" material="shader: flat; color: #ffb174" />
      <a-entity geometry="primitive: sphere; radius: 12; segmentsWidth: 16; segmentsHeight: 8" position="-70 70 -150" material="shader: flat; color: #ffb56b" light="type: point; color: #ffb56b; intensity: 0.8; distance: 220" />
      <a-entity geometry="primitive: ring; radiusInner: 14; radiusOuter: 18; segmentsTheta: 48" position="-70 70 -149" material="shader: flat; color: #ffb56b; opacity: 0.16; transparent: true; side: double" />
      <a-entity id="player" position="0 3 12" player-component="" fly-controls="enabled: false; lookSensitivity: 0.5">
        <a-entity id="camera-rig" position="0 2 8"><a-camera id="camera" position="0 0 0" look-controls="enabled: false" wasd-controls="enabled: false" /></a-entity>
        <a-entity id="jetbike" weapon-component="cooldown: 0.16; accuracy: 1; thrusterParticles: false" />
        <a-entity id="player-hitbox" geometry="primitive: box; width: 1.2; height: 1.8; depth: 1.2" material="visible: false" />
      </a-entity>
      <a-light type="hemisphere" color="#ffd6ac" ground-color="#452339" intensity="1.6" />
      <a-light type="directional" color="#ffb785" intensity="1.8" position="-1 2 1" />
      <a-light type="point" color="#78ffe1" intensity="0.8" distance="54" position="0 8 -20" />
    </a-scene>
  </div>;
}
