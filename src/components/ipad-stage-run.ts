import AFRAME from './aframe-export';
import * as THREE from 'three';
import { IPAD_STAGE_EXTRACTION, IPAD_STAGE_GATES, IPAD_STAGE_WARDEN, crossesIpadStageGate } from '../mission/ipad-stage';

type IpadStageRoute = 'charge' | 'shield' | '';

if (!AFRAME.components['ipad-stage-run']) AFRAME.registerComponent('ipad-stage-run', {
  schema: {},
  init: function(this: any) { this.resetMission(); },
  resetMission: function(this: any) {
    this.stage = 'choice';
    this.route = '' as IpadStageRoute;
    this.previous = null;
    this.warden = null;
    this.extractionPosition = { ...IPAD_STAGE_EXTRACTION };
    this.extractionTime = 0;
    this.el.querySelectorAll('[data-ipad-stage-gate]').forEach((el: any) => el.setAttribute('visible', true));
    this.el.querySelector('#ipad-stage-extraction')?.setAttribute('visible', false);
    this.objective('Touch stage · fly through a gate: cyan charge or amber shield');
  },
  objective: function(this: any, text: string) {
    this.el.emit('mission-objective', {
      text,
      targets: this.stage === 'choice'
        ? IPAD_STAGE_GATES.map(gate => ({
          label: gate.id === 'charge' ? 'CHARGE' : 'SHIELD',
          position: gate.position,
          approach: gate.id === 'charge' ? 'bonus shots' : 'safer run',
        }))
        : this.stage === 'extraction'
          ? [{ label: 'EXTRACTION', position: this.extractionPosition || IPAD_STAGE_EXTRACTION, approach: 'hold' }]
          : [{ label: 'WARDEN', position: IPAD_STAGE_WARDEN, approach: 'shoot' }],
    });
  },
  start: function(this: any) {
    this.previous = { ...this.el.querySelector('#player').object3D.position };
    this.objective('Touch left stick to fly · right pad to aim · fire button to shoot');
  },
  chooseRoute: function(this: any, id: IpadStageRoute) {
    if (this.stage !== 'choice' || (id !== 'charge' && id !== 'shield')) return;
    this.route = id;
    this.stage = 'warden';
    const player = this.el.querySelector('#player').components['player-component'];
    const weapon = this.el.querySelector('#jetbike').components['weapon-component'];
    if (id === 'charge') weapon.chargedShots = 4;
    else player.shield = 45;
    this.el.querySelectorAll('[data-ipad-stage-gate]').forEach((el: any) => el.setAttribute('visible', false));
    const warden = document.createElement('a-entity');
    warden.id = 'ipad-stage-warden';
    warden.setAttribute('position', `${IPAD_STAGE_WARDEN.x} ${IPAD_STAGE_WARDEN.y} ${IPAD_STAGE_WARDEN.z}`);
    warden.setAttribute('enemy-component', 'health: 55; speed: 0.18; detectionRange: 48; weaponRange: 38; weaponDamage: 2; weaponCooldown: 5.2; windupTime: 1.6; enemyType: tank; guardDamageMultiplier: 1; enemyColor: purple');
    warden.setAttribute('hero-model', 'src: url(models/enemy.glb); targetHeight: 2.05; animation: Baka_Idle');
    this.el.appendChild(warden);
    this.warden = warden;
    this.el.components['game-manager'].showMessage(id === 'charge'
      ? 'CHARGE ROUTE · 4 powered shots armed'
      : 'SHIELD ROUTE · extra hull buffer online', 3000);
    this.objective('Defeat the Warden · watch for the amber aim line');
  },
  tick: function(this: any, _time: number, delta: number) {
    const manager = this.el.components['game-manager'];
    if (!manager?.gameStarted || manager.gameOver || !this.el.isPlaying) return;
    const player = this.el.querySelector('#player');
    const pos = player.object3D.position;
    if (this.stage === 'choice') {
      for (const gate of IPAD_STAGE_GATES) {
        if (this.previous && crossesIpadStageGate(this.previous, pos, gate)) {
          this.chooseRoute(gate.id as IpadStageRoute);
          break;
        }
      }
      this.previous = { x: pos.x, y: pos.y, z: pos.z };
    } else if (this.stage === 'warden') {
      const enemy = this.warden?.components?.['enemy-component'];
      if (enemy?.isDead) {
        this.stage = 'extraction';
        const forward = new THREE.Vector3(0, 0, -1);
        if (typeof player.object3D.getWorldQuaternion === 'function') {
          forward.applyQuaternion(player.object3D.getWorldQuaternion(new THREE.Quaternion()));
        }
        forward.y = 0;
        if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
        forward.normalize();
        this.extractionPosition = {
          x: pos.x + forward.x * 9,
          y: Math.max(2.8, pos.y),
          z: pos.z + forward.z * 9,
        };
        const extraction = this.el.querySelector('#ipad-stage-extraction');
        extraction?.setAttribute('position', `${this.extractionPosition.x} ${this.extractionPosition.y} ${this.extractionPosition.z}`);
        extraction?.setAttribute('visible', true);
        this.objective('Extract · fly into the gold ring and hold');
      }
    } else if (this.stage === 'extraction') {
      const extraction = this.extractionPosition || IPAD_STAGE_EXTRACTION;
      const inside = Math.hypot(pos.x - extraction.x, pos.y - extraction.y, pos.z - extraction.z) < 7.5;
      this.extractionTime = inside ? this.extractionTime + Math.min(delta, 100) : 0;
      this.el.emit('mission-progress', { value: this.extractionTime / 650 });
      if (this.extractionTime >= 650) {
        this.stage = 'complete';
        manager.score += 1200 + Math.max(0, 500 - Math.floor(manager.elapsed / 100));
        manager.finishMission(true);
      }
    }
  },
});
