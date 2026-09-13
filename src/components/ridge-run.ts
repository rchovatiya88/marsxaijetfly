import AFRAME from './aframe-export';
import { RIDGE_GATES, EXTRACTION, crossesGate } from '../mission/ridge-run';

// Small optional design proof inside the existing collision-safe arena.
// Authored corridor streaming and the final 3–5 minute mission remain separate work.
if (!AFRAME.components['ridge-run']) AFRAME.registerComponent('ridge-run', {
  schema: {},
  init: function(this: any) { this.resetMission(); },
  resetMission: function(this: any) {
    this.stage = 'choice'; this.route = ''; this.previous = null;
    this.warden = null; this.extractionTime = 0; this.reminder = 0;
    this.el.querySelectorAll('[data-ridge-gate]').forEach((el: any) => el.setAttribute('visible', true));
    this.el.querySelector('#ridge-extraction')?.setAttribute('visible', false);
    this.objective('Choose a gate · high left: E + Shift for 3 charged shots · low right: 30 shield');
  },
  objective: function(this: any, text: string) { this.el.emit('mission-objective', {text}); },
  start: function(this: any) {
    this.previous = {...this.el.querySelector('#player').object3D.position};
    this.objective('Choose a gate · high left: E + Shift for 3 charged shots · low right: 30 shield');
  },
  chooseRoute: function(this: any, id: string) {
    if (this.stage !== 'choice' || (id !== 'high' && id !== 'low')) return;
    this.route = id; this.stage = 'warden';
    const player = this.el.querySelector('#player').components['player-component'];
    const weapon = this.el.querySelector('#jetbike').components['weapon-component'];
    if (id === 'high') weapon.chargedShots = 3; else player.shield = 30;
    this.el.querySelectorAll('[data-ridge-gate]').forEach((el: any) => el.setAttribute('visible', false));
    const warden = document.createElement('a-entity');
    warden.id = 'ridge-warden';
    warden.setAttribute('position', '0 0 -30');
    warden.setAttribute('enemy-component', 'health: 260; speed: 0.7; detectionRange: 60; weaponRange: 55; weaponDamage: 12; weaponCooldown: 2.4; enemyType: tank');
    warden.setAttribute('hero-model', 'src: url(models/enemy.glb); targetHeight: 2.15; animation: Baka_Idle');
    this.el.appendChild(warden); this.warden = warden;
    this.el.components['game-manager'].showMessage(id === 'high' ? 'HIGH LINE · Next 3 shots deal double damage' : 'LOW LINE · 30 shield absorbs incoming damage', 3500);
    this.objective('Break the Warden · descend to aim · strafe when its attack glows');
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
      if (enemy?.isDead || (this.warden && !this.warden.parentNode)) {
        this.stage = 'extraction';
        this.el.querySelector('#ridge-extraction')?.setAttribute('visible', true);
        this.objective('Extract · enter the gold ring at the far end, low altitude · hold 1 second');
      }
    } else if (this.stage === 'extraction') {
      const inside = Math.hypot(pos.x-EXTRACTION.x,pos.y-EXTRACTION.y,pos.z-EXTRACTION.z) < 4;
      this.extractionTime = inside ? this.extractionTime + Math.min(delta,100) : 0;
      if (this.extractionTime >= 1000) {
        this.stage = 'complete';
        manager.score += 1000 + Math.max(0, 600 - Math.floor(manager.elapsed/100));
        manager.finishMission(true);
      }
    }
  }
});
