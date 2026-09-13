import React, { useEffect, useRef, useState, useMemo } from 'react';
import './App.css';
import './aframe-init';
import { ARENA_PROPS } from './arena-world';
import { readSettings, saveSettings } from './settings';
import { PlaytestPanel } from './PlaytestPanel';
import { gameAudio } from './game-audio';

declare global {
  namespace JSX { interface IntrinsicElements { 'a-scene': any; 'a-entity': any; 'a-camera': any; 'a-light': any; } }
}

type Result = { score: number; level: number; won: boolean; best: number };

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

export default function App(): JSX.Element {
  const sceneRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
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
  const [telemetry, setTelemetry] = useState('');
  useEffect(() => {
    saveSettings({sensitivity,reducedMotion,invertY,volume});
    gameAudio.setVolume(volume);
    document.getElementById('player')?.setAttribute('fly-controls', `lookSensitivity: ${sensitivity}; invertY: ${invertY}`);
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
      if (altitudeEl) altitudeEl.textContent = Math.max(0, Math.round(player?.object3D?.position.y || 0)).toString();
      const manager = sceneRef.current?.components['game-manager'];
      const angle = flight?.rotation?.y || 0;
      const pos = player?.object3D?.position;
      if (pos) setRadar((manager?.activeEnemies || []).map((enemy: any) => {
        const dx=enemy.el.object3D.position.x-pos.x, dz=enemy.el.object3D.position.z-pos.z;
        const x=dx*Math.cos(angle)-dz*Math.sin(angle), y=dx*Math.sin(angle)+dz*Math.cos(angle);
        const scale=Math.min(1,42/Math.max(1,Math.hypot(x,y)));
        return {x:50+x*scale,y:50+y*scale};
      }));
      const info = sceneRef.current?.renderer?.info;
      if (info) setTelemetry(`${info.render.calls} draws · ${info.render.triangles} triangles · ${info.memory.geometries} geometries`);
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
    player?.setAttribute('fly-controls', `enabled: true; dragToLook: false; lookSensitivity: ${sensitivity}; invertY: ${invertY}`);
    try {
      const request = document.body.requestPointerLock();
      (request as any)?.catch(() => setError('Mouse capture was blocked. Click again to retry.'));
    } catch { setError('This browser could not capture the mouse. Try desktop Chrome or Firefox.'); }
  };

  const cursorFlight = () => {
    const scene = sceneRef.current;
    gameAudio.resume();
    gameAudio.startAmbient();
    document.getElementById('player')?.setAttribute('fly-controls', `enabled: true; dragToLook: true; lookSensitivity: ${sensitivity}; invertY: ${invertY}`);
    if (!scene.components['game-manager'].gameStarted) scene.components['game-manager'].startGame();
    scene.play();
    setStarted(true); setPaused(false); setError('');
  };

  const arena = useMemo(() => (
    <a-scene data-playtest={new URLSearchParams(window.location.search).has('playtest') ? 'true' : undefined} ref={sceneRef} game-manager="enemyCount: 2; level: 1; spawnRadius: 16; maxActiveEnemies: 4; enemySpawnInterval: 1200" gltf-model="dracoDecoderPath: /vendor/draco/" vr-mode-ui="enabled: false" renderer="maxCanvasWidth: 1280; maxCanvasHeight: 720; antialias: false; colorManagement: true; toneMapping: ACESFilmic; exposure: 1.15; precision: medium" background="color: #130b14" fog="type: exponential; color: #a06951; density: 0.009">
      <a-entity id="level" visible="false" />
      <a-entity star-field="starCount: 180; starSize: 0.15; width: 260; height: 80; depth: 220; color: #ffe2c2; speed: 0.01" position="0 95 -70" />
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
      <a-entity geometry="primitive: torus; radius: 7.5; radiusTubular: 0.12; segmentsRadial: 8; segmentsTubular: 48" position="0 7.6 -26" material="shader: flat; color: #7dffe9" />
      <a-entity geometry="primitive: torus; radius: 4.5; radiusTubular: 0.1; segmentsRadial: 8; segmentsTubular: 40" position="-15 4.6 -30" material="shader: flat; color: #ffb174" />
      <a-entity geometry="primitive: torus; radius: 4.5; radiusTubular: 0.1; segmentsRadial: 8; segmentsTubular: 40" position="15 4.6 -30" material="shader: flat; color: #ffb174" />
      <a-entity geometry="primitive: sphere; radius: 12; segmentsWidth: 16; segmentsHeight: 8" position="-95 45 -170" material="shader: flat; color: #ffcf94; fog: false" />
      <a-entity geometry="primitive: ring; radiusInner: 14; radiusOuter: 18; segmentsTheta: 48" position="-95 45 -169" material="shader: flat; color: #ffb56b; opacity: 0.16; transparent: true; side: double" />
      <a-entity id="player" position="0 3 12" player-component="" fly-controls="enabled: false; lookSensitivity: 0.5">
        <a-entity id="camera-rig" position="0 2 8"><a-camera id="camera" position="0 0 0" look-controls="enabled: false" wasd-controls="enabled: false" /></a-entity>
        <a-entity id="jetbike" weapon-component="cooldown: 0.16; accuracy: 1; thrusterParticles: false" />
        <a-entity id="player-hitbox" geometry="primitive: box; width: 1.2; height: 1.8; depth: 1.2" material="visible: false" />
      </a-entity>
      <a-light type="hemisphere" color="#bfd1f0" ground-color="#5b3030" intensity="1.3" />
      <a-light type="directional" color="#ffd6a0" intensity="1.4" position="-30 28 25" />
      <a-light type="point" color="#83c4dc" intensity="0.3" distance="54" position="0 8 -20" />
    </a-scene>
  ), []);

  return <div className={`App ${paused ? 'is-paused' : ''} ${reducedMotion ? 'reduced-motion' : ''}`}>
    <div className="hud" style={{ visibility: started && !result ? 'visible' : 'hidden' }}>
      <div className="cockpit-glass" />
      <div className="speed-lines" aria-hidden="true">{HUD_SPEED_LINES.map(index => <i key={index} style={{ '--i': index, '--side': index % 2 ? 1 : -1, '--lane': index % 4 } as React.CSSProperties} />)}</div>
      <div id="threat-warning">INCOMING · STRAFE</div>
      <div id="crosshair"><span>+</span></div>
      <div id="score-ui"><small>OPERATION / RED HORIZON</small><div>WAVE <span id="level-value">1</span> / 3</div><div>SCORE <span id="score-value">0</span></div><div>HOSTILES <span id="enemies-value">3</span></div><div id="combo-value">CHAIN ×1</div></div>
      <div className="flight-readout"><span id="speed-value">0</span> M/S <b> / </b><span id="altitude-value">0</span> M ALT</div>
      <div className="hull-label">HULL INTEGRITY</div><div id="health-display"><div id="health-bar" /></div>
      <div id="ammo-display">30 / ∞</div>
      <div className="radar" aria-label={`${radar.length} radar contacts`}><small>HOSTILES</small><i className="radar-player" />{radar.map((contact,i) => <span key={i} style={{left:`${contact.x}%`,top:`${contact.y}%`}} />)}</div>
      <div className="boost-meter" aria-label="Speed indicator"><i /></div>
      <div className="controls-hint">WASD fly · E / Q altitude · Shift boost · Arrows turn · R reload · Esc pause</div>
      {!paused && <div className="mission-toast" role="status">{message}</div>}
    </div>
    <div id="damage-overlay" />
    {(!started || paused || result) && <div className="menu-shade"><main className="mission-menu">
      <div className="eyebrow">MARS / FLIGHT DIVISION <span>PLAYABLE PROTOTYPE 01</span></div>
      <p className="coordinates">25.4° N &nbsp; 137.8° E &nbsp; / &nbsp; SIGNAL ACTIVE</p>
      <h1>{result ? (result.won ? 'SECTOR\nSECURED.' : 'SIGNAL\nLOST.') : paused && started ? 'HOLD\nPOSITION.' : 'RED\nHORIZON.'}</h1>
      <p className="menu-description">{result ? `Score ${result.score} · Best ${result.best} · Wave ${result.level}/3` : 'Pilot a combat jetbike over the red frontier. Clear three waves. Chain eliminations within six seconds to multiply your score.'}</p>
      <div className="mission-details"><div><small>MISSION</small><strong>Three-wave sortie</strong></div><div><small>LOADOUT</small><strong>Twin pulse cannon</strong></div><div><small>FLIGHT</small><strong>Mouse + keyboard</strong></div></div>
      <div className="settings"><label>Mouse sensitivity <input aria-label="Mouse sensitivity" type="range" min="0.1" max="1.5" step="0.1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))} /></label><label><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} /> Reduce screen effects</label><label><input type="checkbox" checked={invertY} onChange={e => setInvertY(e.target.checked)} /> Invert vertical aim</label><label>Audio volume <input aria-label="Audio volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))} /></label></div>
      {error && <p role="alert" className="error">{error}</p>}
      <button id="start-button" disabled={!ready} onClick={result ? () => window.location.reload() : capture}>{result ? 'FLY AGAIN ↗' : !ready ? 'PREPARING FLIGHT…' : started ? 'RESUME FLIGHT ↗' : 'LAUNCH SORTIE ↗'}</button>
      {!result && ready && <button className="cursor-button" onClick={cursorFlight}>Play with cursor aim (no mouse capture)</button>}
      <p className="menu-controls">WASD move &nbsp; / &nbsp; E rise · Q descend &nbsp; / &nbsp; Shift boost<br />Mouse aim · Hold click fire &nbsp; / &nbsp; R reload &nbsp; / &nbsp; Esc pause</p>
    </main></div>}
    <PlaytestPanel sceneRef={sceneRef} telemetry={telemetry} launch={cursorFlight} />
    {arena}
  </div>;
}
