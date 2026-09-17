import AFRAME from './aframe-export';
import { RIDGE_GATES, EXTRACTION, crossesGate } from '../mission/ridge-run';
import { computeFallbackPacing } from '../ai/jetbike-copilot';
import { gameAudio } from '../game-audio';

// Ridge Run Sortie: Gate Choice -> Warden Boss -> Phase 2 Pursuit Skirmish -> Extraction
if (!AFRAME.components['ridge-run']) AFRAME.registerComponent('ridge-run', {
  schema: {},
  init: function(this: any) { this.resetMission(); },
  resetMission: function(this: any) {
    this.stage = 'choice'; this.route = ''; this.previous = null;
    this.warden = null; this.extractionTime = 0; this.reminder = 0;
    this.wardenStartTime = 0; this.wardenDefeatSeconds = 0;
    this.pursuitSpawned = false; this.lastPacingCheck = 0;
    this.airspaceSecured = false;
    if (Array.isArray(this.pursuitDrones)) {
      for (const drone of this.pursuitDrones) {
        if (drone?.parentNode?.removeChild) drone.parentNode.removeChild(drone);
      }
    }
    this.pursuitDrones = [];
    this.el.querySelectorAll?.('[data-ridge-gate]')?.forEach((el: any) => el.setAttribute('visible', true));
    this.el.querySelector?.('#ridge-extraction')?.setAttribute('visible', false);
    this.objective('Choose a gate · high cyan: E + Shift for 3 charged shots · low emerald: 30 shield', [
      { label: 'HIGH GATE', position: RIDGE_GATES[0].position, approach: 'boost' },
      { label: 'LOW GATE', position: RIDGE_GATES[1].position, approach: 'shield' }
    ]);
  },
  objective: function(this: any, text: string, targets?: any[]) {
    const computedTargets = targets ?? (
      this.stage === 'choice'
        ? [
            { label: 'HIGH GATE', position: RIDGE_GATES[0].position, approach: 'boost' },
            { label: 'LOW GATE', position: RIDGE_GATES[1].position, approach: 'shield' }
          ]
        : this.stage === 'warden'
          ? [{ label: 'WARDEN', position: { x: 0, y: 0, z: -30 }, approach: 'strike' }]
          : this.stage === 'extraction'
            ? [{ label: 'EXTRACTION', position: EXTRACTION, approach: 'land' }]
            : []
    );
    this.el.emit('mission-objective', { text, targets: computedTargets });
  },
  start: function(this: any) {
    this.previous = {...this.el.querySelector('#player').object3D.position};
    this.objective('Choose a gate · high cyan: E + Shift for 3 charged shots · low emerald: 30 shield');
  },
  chooseRoute: function(this: any, id: string) {
    if (this.stage !== 'choice' || (id !== 'high' && id !== 'low')) return;
    this.route = id; this.stage = 'warden';
    this.wardenStartTime = Date.now();
    const player = this.el.querySelector('#player').components['player-component'];
    const weapon = this.el.querySelector('#jetbike').components['weapon-component'];
    if (id === 'high') weapon.chargedShots = 3; else player.shield = 30;
    this.el.querySelectorAll('[data-ridge-gate]').forEach((el: any) => el.setAttribute('visible', false));
    const warden = document.createElement('a-entity');
    warden.id = 'ridge-warden';
    warden.setAttribute('position', '0 0 -30');
    warden.setAttribute('enemy-component', 'health: 320; speed: 0.9; detectionRange: 60; weaponRange: 55; weaponDamage: 12; weaponCooldown: 2.2; enemyType: tank');
    warden.setAttribute('hero-model', 'src: url(models/enemy.glb); targetHeight: 2.15; animation: Baka_Idle');
    this.el.appendChild(warden); this.warden = warden;
    this.el.components['game-manager']?.showMessage?.(id === 'high' ? 'HIGH CYAN LINE · Next 3 shots deal double damage' : 'LOW EMERALD LINE · 30 shield absorbs incoming damage', 3500);
    this.el.emit('copilot-message', { text: id === 'high' ? 'COPILOT: Overcharge primed! Acquire Warden and fire!' : 'COPILOT: Shield matrix boosted! Engage Warden!' });
    this.objective('Break the Warden · descend to aim · strafe when its attack glows', [
      { label: 'WARDEN', position: { x: 0, y: 0, z: -30 }, approach: 'strike' }
    ]);
  },
  spawnPursuitDrones: function(this: any) {
    if (this.pursuitSpawned) return;
    this.pursuitSpawned = true;
    this.pursuitDrones = [];

    const drone1 = document.createElement('a-entity');
    drone1.id = 'ridge-skirmisher-1';
    drone1.setAttribute('position', '-10 5 8');
    drone1.setAttribute('enemy-component', 'health: 120; speed: 2.2; detectionRange: 80; weaponRange: 60; weaponDamage: 8; weaponCooldown: 1.6; enemyType: fast');
    drone1.setAttribute('hero-model', 'src: url(models/enemy.glb); targetHeight: 1.5; animation: Baka_Run');
    this.el.appendChild(drone1);
    this.pursuitDrones.push(drone1);

    const drone2 = document.createElement('a-entity');
    drone2.id = 'ridge-skirmisher-2';
    drone2.setAttribute('position', '10 6 12');
    drone2.setAttribute('enemy-component', 'health: 120; speed: 2.2; detectionRange: 80; weaponRange: 60; weaponDamage: 8; weaponCooldown: 1.6; enemyType: fast');
    drone2.setAttribute('hero-model', 'src: url(models/enemy.glb); targetHeight: 1.5; animation: Baka_Run');
    this.el.appendChild(drone2);
    this.pursuitDrones.push(drone2);

    this.el.components['game-manager']?.showMessage?.('WARNING: Pursuit interceptors detected on your six!', 3000);
    this.el.emit('copilot-message', {
      text: 'COPILOT: Hostile pursuit drones incoming! Evade fire and reach the extraction zone!'
    });
  },
  evaluatePacing: function(this: any) {
    const playerEl = this.el.querySelector('#player');
    const playerComp = playerEl?.components?.['player-component'];
    const flightComp = playerEl?.components?.['fly-controls'];
    const hull = typeof playerComp?.health === 'number' ? playerComp.health : 100;
    const shield = typeof playerComp?.shield === 'number' ? playerComp.shield : 0;
    const boost = typeof flightComp?.boost === 'number' ? flightComp.boost : 100;

    const activeDrones = (this.pursuitDrones || []).filter((d: any) => {
      const comp = d?.components?.['enemy-component'];
      return comp && !comp.isDead;
    }).length;

    const telemetry = {
      playerHull: hull,
      playerShield: shield,
      playerBoost: boost,
      wardenDefeatSeconds: this.wardenDefeatSeconds || 10,
      pursuitActive: this.pursuitSpawned,
      activeEnemiesCount: activeDrones,
      shotsAccuracy: 0.8
    };

    const decision = computeFallbackPacing(telemetry);
    for (const drone of (this.pursuitDrones || [])) {
      const comp = drone?.components?.['enemy-component'];
      if (comp && !comp.isDead && comp.data) {
        comp.data.speed = 2.2 * decision.droneSpeedMultiplier;
        comp.data.weaponCooldown = Math.max(0.8, 1.6 / decision.droneFireRateMultiplier);
      }
    }
    if (decision.emergencyChaffActive && playerComp && playerComp.shield < 15) {
      playerComp.shield = 15;
    }
  },
  tick: function(this: any, _time: number, delta: number) {
    const manager = this.el.components['game-manager'];
    if (!manager?.gameStarted || manager.gameOver || !this.el.isPlaying) return;
    const player = this.el.querySelector('#player');
    const pos = player.object3D.position;
    if (this.stage === 'choice') {
      const flight = player.components['fly-controls'];
      for (const gate of RIDGE_GATES) {
        if (this.previous && crossesGate(this.previous, pos, gate)) {
          if (gate.id === 'high' && (flight.speedMultiplier <= 1 || flight.velocity.length() < 14)) {
            this.objective('High gate needs boost · turn back, line up, then hold Shift through cyan');
          } else { this.chooseRoute(gate.id); break; }
        }
      }
      this.previous = {x:pos.x,y:pos.y,z:pos.z};
    } else if (this.stage === 'warden') {
      const enemy = this.warden?.components?.['enemy-component'];
      if (enemy?.isDead) {
        this.stage = 'extraction';
        this.wardenDefeatSeconds = Math.max(1, (Date.now() - (this.wardenStartTime || Date.now())) / 1000);
        this.spawnPursuitDrones();
        this.el.querySelector('#ridge-extraction')?.setAttribute('visible', true);
        gameAudio.pulse('beacon');
        this.objective('Evade Pursuit & Extract · Hostile interceptors on your six · Hold gold pillar or dogfight', [
          { label: 'EXTRACTION', position: EXTRACTION, approach: 'land' }
        ]);
        this.evaluatePacing();
      }
    } else if (this.stage === 'extraction') {
      const inside = Math.hypot(pos.x-EXTRACTION.x,pos.y-EXTRACTION.y,pos.z-EXTRACTION.z) < 4;
      this.extractionTime = inside ? this.extractionTime + Math.min(delta,100) : 0;
      this.el.emit('mission-progress', { value: Math.min(1, this.extractionTime / 1000) });

      // Check if player eliminated all pursuit drones
      const activeDrones = (this.pursuitDrones || []).filter((d: any) => {
        const comp = d?.components?.['enemy-component'];
        return comp && !comp.isDead;
      });

      if (this.pursuitSpawned && activeDrones.length === 0 && !this.airspaceSecured) {
        this.airspaceSecured = true;
        gameAudio.pulse('secure');
        this.el.components['game-manager']?.showMessage?.('AIRSPACE SECURED · All pursuers neutralized!', 3500);
        this.el.emit('copilot-message', {
          text: 'COPILOT: Airspace secured! All pursuers neutralized! Proceed to extraction beacon.'
        });
        this.objective('Airspace Secured! Descend into the gold extraction pillar to extract!', [
          { label: 'EXTRACTION', position: EXTRACTION, approach: 'land' }
        ]);
      }

      if (Date.now() - (this.lastPacingCheck || 0) > 1500) {
        this.lastPacingCheck = Date.now();
        this.evaluatePacing();
      }

      if (this.extractionTime >= 1000) {
        this.stage = 'complete';
        manager.score += 1000 + Math.max(0, 600 - Math.floor(manager.elapsed/100));
        manager.finishMission(true);
      }
    }
  }
});
