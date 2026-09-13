import AFRAME from './aframe-export';
import { setWorld, traceWorld } from '../arena-world';
import {
  BRIDGEHEAD_APPROACHES,
  BRIDGEHEAD_EXTRACTION,
  BRIDGEHEAD_EXTRACTION_RADIUS,
  BRIDGEHEAD_EXTRACTION_PATH,
  BRIDGEHEAD_ROUTE_PATHS,
  BRIDGEHEAD_COMBAT,
  BRIDGEHEAD_EXITS,
  BRIDGEHEAD_GATES,
  BRIDGEHEAD_HIGH_APPROACH,
  BRIDGEHEAD_LOW_CLIMB,
  BRIDGEHEAD_LOW_PEEK,
  BRIDGEHEAD_START,
  BRIDGEHEAD_WARDEN,
  BRIDGEHEAD_WORLD,
  BridgeheadRoute,
  bridgeheadCompletionScore,
  crossesXGate,
  reachesMarker
} from '../mission/bridgehead-run';

const target = (label: string, position: {x:number;y:number;z:number}, approach = '') => ({label, position, approach});
const samePoint = (a:any,b:any) => a.x===b.x && a.y===b.y && a.z===b.z;
const gateIndex = (route:BridgeheadRoute) => BRIDGEHEAD_ROUTE_PATHS[route].findIndex(point=>samePoint(point,BRIDGEHEAD_GATES.find(g=>g.id===route)!.position));
const exitIndex = (route:BridgeheadRoute) => BRIDGEHEAD_ROUTE_PATHS[route].findIndex(point=>samePoint(point,BRIDGEHEAD_EXITS.find(g=>g.id===route)!.position));
const courseRadius = (route:BridgeheadRoute,index:number) => route==='high' && index===gateIndex(route)-1 ? 1.8 : 3;
const routeActions: Record<BridgeheadRoute, string[]> = {
  high: ['LAUNCH', 'TURN NORTH', 'CLIMB PAST CANNON', 'CLEAR RIDGE', 'TURN EAST', 'STAY HIGH', 'DESCEND', 'BOOST THROUGH', 'BRIDGE EXIT', 'RISE OVER BANK', 'OPEN COURT'],
  low: ['LAUNCH', 'DESCEND TO BRIDGE', 'ENTER SHIELD LANE', 'BRIDGE EXIT', 'RISE + TURN NORTH', 'FOLLOW BANK', 'CLIMB TO COURT', 'COVER APPROACH']
};

function blockedLineOfSight(from: {x:number;y:number;z:number}, to: {x:number;y:number;z:number}): boolean {
  const delta = {x: to.x - from.x, y: to.y - from.y, z: to.z - from.z};
  return !!traceWorld(from, delta, 0.05);
}

function spawnEnemy(scene: any, id: string, position: {x:number;y:number;z:number}, health = BRIDGEHEAD_COMBAT.health): any {
  const enemy = document.createElement('a-entity');
  enemy.id = id;
  enemy.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
  enemy.setAttribute('enemy-component', `health: ${health}; speed: 0; detectionRange: 70; weaponRange: 60; weaponDamage: 13; weaponCooldown: 2.5; recoveryTime: ${BRIDGEHEAD_COMBAT.recoverySeconds}; windupTime: ${BRIDGEHEAD_COMBAT.windupSeconds}; aimTrackingTime: ${BRIDGEHEAD_COMBAT.trackingSeconds}; guardDamageMultiplier: ${BRIDGEHEAD_COMBAT.guardMultiplier}; attackAnimation: Baka_Punch; enemyType: tank`);
  enemy.setAttribute('hero-model', 'src: url(models/enemy.glb); targetHeight: 2.15; animation: Baka_Idle');
  scene.appendChild(enemy);
  return enemy;
}

if (!AFRAME.components['bridgehead-run']) AFRAME.registerComponent('bridgehead-run', {
  schema: {},
  init: function(this: any) {
    this.onCombatPhase=(event:any)=>{
      if (this.stage!=='warden' || event.detail?.id!==this.warden?.id) return;
      const messages:Record<string,string>={
        armored:'WARDEN ARMORED · bait a shot · save your charged rounds',
        tracking:'WARDEN TRACKING · the beam follows you · prepare to dodge',
        locked:'AIM LOCKED · strafe or reach solid cover NOW',
        projectile:'BOLT OUT · stay clear · wait for the armor to open',
        exposed:'WARDEN EXPOSED · FIRE NOW · armor returns after 1.2 seconds'
      };
      const text=messages[event.detail.phase];
      if (text) this.objective(text,[target('WARDEN',BRIDGEHEAD_WARDEN)]);
    };
    this.el.addEventListener?.('enemy-combat-phase',this.onCombatPhase);
    this.resetMission();
  },
  objective: function(this: any, text: string, targets: any[] = []) { this.el.emit('mission-objective', {text, targets}); },
  progress: function(this: any, value = 0) { this.el.emit('mission-progress', {label:'EXTRACTION', value}); },
  resetMission: function(this: any) {
    this.stage = 'choice'; this.route = ''; this.previous = null;
    this.warden = null; this.extractionTime = 0; this.progressBucket = -1; this.guidanceState = '';
    this.wardenHealth = BRIDGEHEAD_COMBAT.health; this.wardenMissingTime = 0; this.wardenRecoveries = 0;
    this.courseProgress = {high:1,low:1}; this.extractionIndex=0;
    this.highApproachReady = false; this.lowClimbReady = false;
    this.el.querySelectorAll('[data-bridgehead-gate]').forEach((el: any) => el.setAttribute('visible', true));
    this.el.querySelectorAll('[data-bridgehead-exit]').forEach((el: any) => el.setAttribute('visible', false));
    this.el.querySelectorAll('[data-bridgehead-approach]').forEach((el: any) => el.setAttribute('visible', false));
    this.el.querySelector('#bridgehead-extraction')?.setAttribute('visible', false);
    this.progress(0);
    this.guideChoice();
  },
  start: function(this: any) {
    setWorld(BRIDGEHEAD_WORLD);
    const player = this.el.querySelector('#player');
    const health = player.components?.['player-component'];
    if (health?.data) {
      // Mission flight bounds are resident gameplay data. A missing visual
      // level must not restore the arena's positive-Y floor over the low lane.
      if (!this.playerLimits || this.playerLimits.component !== health) {
        this.playerLimits = {component: health, min: health.data.minFlyingHeight, max: health.data.maxFlyingHeight};
      }
      health.data.minFlyingHeight = BRIDGEHEAD_WORLD.bounds.minY;
      health.data.maxFlyingHeight = BRIDGEHEAD_WORLD.bounds.maxY;
    }
    player.object3D.position.set(BRIDGEHEAD_START.x, BRIDGEHEAD_START.y, BRIDGEHEAD_START.z);
    const flight = player.components?.['fly-controls'];
    if (flight) {
      flight.clearInput(); flight.rotation.set(-0.08, -Math.PI / 2, 0, 'YXZ');
      flight.applyLookRotation(); flight.updateCamera(0);
    }
    this.previous = {...player.object3D.position};
    this.guideChoice();
  },
  guideChoice: function(this:any) {
    this.objective('Choose a route: HIGH climbs for charged shots; LOW drops under cover for shield',(['high','low'] as BridgeheadRoute[]).map(route=>{
      const index=this.courseProgress[route], gate=gateIndex(route);
      return target(`${route.toUpperCase()} · ${routeActions[route][Math.min(index,routeActions[route].length-1)]}`,
        BRIDGEHEAD_ROUTE_PATHS[route][Math.min(index,gate)],index>=gate?'+X':'');
    }));
  },
  guideApproach: function(this:any) {
    const route=this.route as BridgeheadRoute, path=BRIDGEHEAD_ROUTE_PATHS[route],index=this.courseProgress[route];
    const arrival=index===path.length-1;
    this.objective(arrival ? (route==='high'?'Open court ahead · bait, dodge after lock, fire only when EXPOSED':'Covered court ahead · shield ready · peek north to bait the Warden')
      :'Bridge cleared · follow each climb and turn marker around the terrain',
      [target(arrival?(route==='high'?'OPEN COURT':'COVER APPROACH'):`${route.toUpperCase()} · CLIMB / TURN ${index-exitIndex(route)}`,path[index])]);
  },
  chooseRoute: function(this: any, route: BridgeheadRoute) {
    if (this.stage !== 'choice') return;
    this.route = route; this.stage = 'traverse'; this.guidanceState = '';
    const player = this.el.querySelector('#player').components['player-component'];
    const weapon = this.el.querySelector('#jetbike').components['weapon-component'];
    if (route === 'high') weapon.chargedShots = BRIDGEHEAD_COMBAT.chargedShots; else player.shield = BRIDGEHEAD_COMBAT.lowShield;
    this.el.querySelectorAll('[data-bridgehead-gate]').forEach((el: any) => el.setAttribute('visible', false));
    this.el.querySelector(`[data-bridgehead-exit="${route}"]`)?.setAttribute('visible', true);
    this.el.components['game-manager'].showMessage(route === 'high'
      ? 'NORTH LINE · 3 overcharged shots · exposed approach'
      : 'LOW LINE · 30 shield · covered approach', 3200);
    const exit = BRIDGEHEAD_EXITS.find(marker => marker.id === route)!;
    this.objective(route === 'high'
      ? 'Cross the north bridge · reach the cyan exit before engaging'
      : 'Cross the lower bridge · reach the amber exit before engaging', [target(route === 'high' ? 'CYAN EXIT' : 'AMBER EXIT', exit.position, '+X')]);
  },
  approachCourt: function(this: any) {
    this.stage = 'approach'; this.guidanceState = '';
    this.courseProgress[this.route]=exitIndex(this.route)+1;
    this.el.querySelector(`[data-bridgehead-approach="${this.route}"]`)?.setAttribute('visible', true);
    this.guideApproach();
  },
  spawnWarden: function(this: any, recovering = false) {
    this.stage = 'warden';
    this.wardenMissingTime = 0;
    this.warden = spawnEnemy(this.el, 'bridgehead-warden', BRIDGEHEAD_WARDEN, this.wardenHealth);
    this.el.querySelectorAll('[data-bridgehead-approach]').forEach((el: any) => el.setAttribute('visible', false));
    this.el.components['game-manager'].showMessage(recovering
      ? 'CONTACT RESTORED · Warden damage preserved'
      : 'WARDEN CONTACT · armor blocks shots · dodge after AIM LOCKED, fire when EXPOSED', 4500);
    const player = this.el.querySelector('#player')?.object3D?.position;
    const playerPosition = player ? {x: player.x, y: player.y + 1.05, z: player.z} : BRIDGEHEAD_LOW_PEEK;
    const wardenTorso = {x: BRIDGEHEAD_WARDEN.x, y: BRIDGEHEAD_WARDEN.y + 1.05, z: BRIDGEHEAD_WARDEN.z};
    if (this.route === 'low' && blockedLineOfSight(playerPosition, wardenTorso)) {
      this.objective('PEEK NORTH · move around cover to draw the Warden shot', [target('PEEK NORTH', BRIDGEHEAD_LOW_PEEK)]);
    } else {
      this.objective('WARDEN ARMORED · bait its tracking beam · save charged rounds for EXPOSED', [target('WARDEN', BRIDGEHEAD_WARDEN)]);
    }
  },
  remove: function(this: any) {
    this.el.removeEventListener?.('enemy-combat-phase',this.onCombatPhase);
    const previous = this.playerLimits;
    if (!previous?.component?.data) return;
    const data = previous.component.data;
    // Do not overwrite another owner's limits if it took over after this run.
    if (data.minFlyingHeight === BRIDGEHEAD_WORLD.bounds.minY) data.minFlyingHeight = previous.min;
    if (data.maxFlyingHeight === BRIDGEHEAD_WORLD.bounds.maxY) data.maxFlyingHeight = previous.max;
    this.playerLimits = null;
  },
  tick: function(this: any, _time: number, delta: number) {
    const manager = this.el.components['game-manager'];
    if (!manager?.gameStarted || manager.gameOver || !this.el.isPlaying) return;
    const playerEl = this.el.querySelector('#player');
    const pos = playerEl.object3D.position;
    if (this.stage === 'choice') {
      const flight = playerEl.components['fly-controls'];
      let advanced=false;
      for (const route of ['high','low'] as BridgeheadRoute[]) {
        const path=BRIDGEHEAD_ROUTE_PATHS[route];
        while (this.courseProgress[route]<gateIndex(route)) {
          const index=this.courseProgress[route];
          if (!reachesMarker(this.previous||pos,pos,{position:path[index],radius:courseRadius(route,index)})) break;
          this.courseProgress[route]++; advanced=true;
          if (samePoint(path[index],BRIDGEHEAD_HIGH_APPROACH.position)) this.highApproachReady=true;
        }
      }
      if(advanced) this.guideChoice();
      for (const gate of BRIDGEHEAD_GATES) {
        if (!this.previous || !crossesXGate(this.previous, pos, gate)) continue;
        if (this.courseProgress[gate.id]<gateIndex(gate.id)) {
          this.guideChoice();
          manager.showMessage('Course incomplete · follow the numbered markers before entering',2500);
        } else if (gate.id === 'high' && (flight.speedMultiplier <= 1 || flight.velocity.x < 14)) {
          this.guidanceState = 'high-rejected';
          this.objective('High line rejected · turn back, then hold Shift through cyan', [target('HIGH APPROACH', {...gate.position, x:gate.position.x-4}, '+X')]);
        } else { this.chooseRoute(gate.id); break; }
      }
      if (this.stage === 'choice' && this.guidanceState === 'high-rejected' && pos.x < BRIDGEHEAD_GATES[0].position.x-2) {
        this.guidanceState = '';
        this.objective('High approach ready · hold W + Shift through the HIGH ring', [target('HIGH · BOOST', BRIDGEHEAD_GATES[0].position, '+X')]);
      }
      this.previous = {x:pos.x,y:pos.y,z:pos.z};
    } else if (this.stage === 'traverse') {
      const exit = BRIDGEHEAD_EXITS.find(marker => marker.id === this.route);
      if (exit && this.previous && crossesXGate(this.previous, pos, exit)) {
        this.el.querySelector(`[data-bridgehead-exit="${this.route}"]`)?.setAttribute('visible', false);
        this.approachCourt();
      } else if (exit && pos.x > exit.position.x + 1 && Math.hypot(pos.y-exit.position.y,pos.z-exit.position.z) > exit.radius && this.guidanceState !== 'missed-exit') {
        this.guidanceState = 'missed-exit';
        this.objective('Exit missed · turn back to the approach marker, then cross toward the court', [target('TURN-BACK POINT', {...exit.position, x:exit.position.x-4}, '+X')]);
      } else if (exit && this.guidanceState === 'missed-exit' && pos.x < exit.position.x-2) {
        this.guidanceState = '';
        this.objective('Approach restored · cross the exit ring toward the court', [target('BRIDGE EXIT', exit.position, '+X')]);
      }
      this.previous = {x:pos.x,y:pos.y,z:pos.z};
    } else if (this.stage === 'approach') {
      const route=this.route as BridgeheadRoute,path=BRIDGEHEAD_ROUTE_PATHS[route],index=this.courseProgress[route];
      const point=path[index],arrival=index===path.length-1;
      if (point && reachesMarker(this.previous||pos,pos,{position:point,radius:arrival?BRIDGEHEAD_APPROACHES.find(p=>p.id===route)!.radius:courseRadius(route,index)})) {
        if(samePoint(point,BRIDGEHEAD_LOW_CLIMB.position)) this.lowClimbReady=true;
        if(arrival) this.spawnWarden(); else {this.courseProgress[route]++;this.guideApproach();}
      }
      this.previous = {x:pos.x,y:pos.y,z:pos.z};
    } else if (this.stage === 'warden') {
      const enemy = this.warden?.components?.['enemy-component'];
      if (enemy?.isDead) {
        this.stage = 'extraction';
        this.el.querySelector('#bridgehead-extraction')?.setAttribute('visible', true);
        this.progressBucket = -1; this.progress(0);
        this.previous={...pos};
        this.objective('Warden down · climb toward the extraction approach', [target('EXTRACTION CLIMB', BRIDGEHEAD_EXTRACTION_PATH[0])]);
      } else if (!enemy || this.warden?.parentNode !== this.el) {
        // A removed/malformed actor is a recoverable fault, never a free kill.
        // Use simulation time and retain the last observed hull across rebuilds.
        this.wardenMissingTime += Math.min(Math.max(delta, 0), 100);
        if (this.wardenMissingTime >= 1200) {
          this.warden?.remove?.();
          if (this.wardenRecoveries++ < 2) this.spawnWarden(true);
          else {
            this.stage = 'interrupted';
            manager.showMessage('Mission interrupted · sentinel unavailable · retry the sortie', 5000);
            manager.finishMission(false);
          }
        }
      } else {
        this.wardenMissingTime = 0;
        if (Number.isFinite(enemy.health) && enemy.health > 0) this.wardenHealth = enemy.health;
      }
    } else if (this.stage === 'extraction') {
      if(this.extractionIndex<BRIDGEHEAD_EXTRACTION_PATH.length-1 && reachesMarker(this.previous||pos,pos,{position:BRIDGEHEAD_EXTRACTION_PATH[this.extractionIndex],radius:3.5})) {
        this.extractionIndex++;
        this.objective('Extract · hold inside the amber beacon for 1.5 seconds',[target('EXTRACTION',BRIDGEHEAD_EXTRACTION)]);
      }
      this.previous={...pos};
      const inside = this.extractionIndex===BRIDGEHEAD_EXTRACTION_PATH.length-1 && Math.hypot(pos.x-BRIDGEHEAD_EXTRACTION.x,pos.y-BRIDGEHEAD_EXTRACTION.y,pos.z-BRIDGEHEAD_EXTRACTION.z) < BRIDGEHEAD_EXTRACTION_RADIUS;
      this.extractionTime = inside ? this.extractionTime + Math.min(delta,100) : 0;
      const bucket = Math.floor(Math.min(1500,this.extractionTime)/100);
      if (bucket !== this.progressBucket) { this.progressBucket = bucket; this.progress(this.extractionTime/1500); }
      if (this.extractionTime >= 1500) {
        this.stage = 'complete';
        const health = playerEl.components['player-component']?.health || 0;
        manager.score += bridgeheadCompletionScore(this.route, manager.elapsed, health);
        const score = document.getElementById('score-value'); if (score) score.textContent = String(manager.score);
        manager.finishMission(true);
      }
    }
  }
});
