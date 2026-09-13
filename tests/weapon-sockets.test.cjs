const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const THREE=require('three');

function rig() {
  const definitions={},cache=new Map(),aframe={components:definitions,registerComponent(name,value){definitions[name]=value;}};
  const camera=new THREE.Object3D();camera.position.set(0,.62,0);camera.updateMatrixWorld(true);
  const document={querySelector:s=>s==='#camera'?{object3D:camera}:null,querySelectorAll:()=>[],getElementById:()=>null};
  const load=file=>{
    const absolute=path.resolve(file);if(cache.has(absolute))return cache.get(absolute);
    const exports={};cache.set(absolute,exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
      {exports,console,document,performance,setTimeout,clearTimeout,
        require:id=>id==='./aframe-export'?{default:aframe}:id==='../game-audio'?{gameAudio:{pulse(){}}}:id.startsWith('.')?load(path.resolve(path.dirname(absolute),id+'.ts')):require(id)});
    return exports;
  };
  load('src/components/weapon-component.ts');
  const definition=definitions['weapon-component'];
  const weapon=Object.assign({},definition,{data:Object.fromEntries(Object.entries(definition.schema).map(([k,v])=>[k,v.default]))});
  const world=load('src/arena-world.ts');world.setWorld({bounds:{minX:-20,maxX:20,minY:-20,maxY:20,minZ:-20,maxZ:20},boxes:[]});
  let damage=0,hits=0;const bolts=[];
  Object.assign(weapon,{el:{object3D:new THREE.Object3D(),sceneEl:{isPlaying:true},emit(){}},ammoInClip:30,shotClock:0,lastShot:-10000,
    raycaster:new THREE.Raycaster(),findEnemyHit:()=>({enemy:{takeDamage(value){damage+=value;return value;}},point:new THREE.Vector3(0,.62,-8),distance:8}),
    createBolt(start,end,color){bolts.push({start:start.clone(),end:end.clone(),color});},showHitMarker(){hits++;},
    updateAmmoDisplay(){},applyWeaponFeedback(){},createHudBolt(){},createImpactEffect(){}});
  weapon.data.accuracy=1;
  return {weapon,world,bolts,load,definitions,document,get damage(){return damage;},get hits(){return hits;}};
}

test('resident fallback geometry fits the same protected body including full-thrust plumes',()=>{
  const h=rig(),root=h.weapon.el.object3D;
  h.document.createElement=()=>({object3D:new THREE.Object3D(),setObject3D(_key,model){this.object3D.add(model);}});
  Object.assign(h.weapon.el,{getObject3D(){return null;},removeAttribute(){},appendChild(child){root.add(child.object3D);}});
  h.weapon.createHoverBikeModel();assert.equal(h.weapon.enginePlumes.length,2);
  for(const plume of h.weapon.enginePlumes)plume.scale.y=1.66;
  root.updateMatrixWorld(true);const bound=new THREE.Box3().setFromObject(root),envelope=h.world.BIKE_BODY_ENVELOPE;
  for(const axis of ['x','y','z']) {assert.ok(bound.min[axis]>=envelope.min[axis],`${axis} minimum escapes`);assert.ok(bound.max[axis]<=envelope.max[axis],`${axis} maximum escapes`);}
  assert.ok(Math.abs(bound.min.z+2.36)<1e-6,'fallback nose is just behind authored muzzle tips');
  h.weapon.bikeResources.forEach(resource=>resource.dispose());
});

test('measured twin sockets clip each visible bolt independently and a blocked barrel contributes no damage',()=>{
  const h=rig();
  h.world.setWorld({bounds:{minX:-20,maxX:20,minY:-20,maxY:20,minZ:-20,maxZ:20},boxes:[
    {id:'left-edge',center:{x:-.095,y:.62,z:-3.5},size:{x:.09,y:1,z:.1}}
  ]});
  h.weapon.shoot();
  assert.equal(h.damage,12.5);assert.equal(h.hits,1);assert.equal(h.bolts.length,2);
  assert.ok(h.bolts[0].end.z>-3.51 && h.bolts[0].end.z<-3.4);
  assert.equal(h.bolts[1].end.z,-8);
  assert.equal(h.bolts[0].start.y,.62);assert.equal(h.bolts[0].start.z,-2.4);
});

test('armor rejection suppresses the damage hit marker while both socket effects remain visible',()=>{
  const h=rig();
  h.weapon.findEnemyHit=()=>({enemy:{takeDamage(){return 0;}},point:new THREE.Vector3(0,.62,-8),distance:8});
  h.weapon.shoot();
  assert.equal(h.hits,0);assert.equal(h.damage,0);assert.equal(h.bolts.length,2);
  assert.equal(h.weapon.ammoInClip,29);
});

test('guarded sentinel tracks until the final lock, rejects premature damage and exposes after the projectile resolves',()=>{
  const h=rig();h.load('src/components/enemy-component.ts');
  const definition=h.definitions['enemy-component'];
  const enemy=Object.assign({},definition,{data:Object.fromEntries(Object.entries(definition.schema).map(([k,v])=>[k,v.default]))});
  Object.assign(enemy.data,{speed:0,windupTime:1.2,aimTrackingTime:.95,guardDamageMultiplier:0});
  const phases=[],object=new THREE.Object3D(),player=new THREE.Object3D();player.position.set(0,.62,-8);
  Object.assign(enemy,{el:{id:'sentinel',object3D:object,sceneEl:{components:{'game-manager':{elapsed:10000}},emit(_type,detail){phases.push(detail.phase);}}},
    playerEntity:{object3D:player,components:{'player-component':{takeDamage(){}}}},health:450,isDead:false,
    lastEnemyShot:-10000,chargeRemaining:0,trackingRemaining:0,boltRemaining:0,recoveryRemaining:0,attackCycles:0,exposureWindows:0,
    attackOrigin:new THREE.Vector3(),attackTarget:new THREE.Vector3(),attackDirection:new THREE.Vector3(),
    enemyBolt:{position:new THREE.Vector3(),visible:false},enemyHalo:{material:{color:new THREE.Color()},scale:{setScalar(){}}},
    flashThreatWarning(){},updateHealthBar(){},flashColor(){},setState(state){this.currentState=state;}});
  assert.equal(enemy.takeDamage(1000),0);assert.equal(enemy.health,450);
  assert.equal(enemy.enemyShoot(),true);enemy.updateCombatPresentation();assert.equal(phases.at(-1),'tracking');
  player.position.x=3;
  for(let i=0;i<9;i++)enemy.updateAttack(100);
  enemy.updateAttack(50);enemy.updateCombatPresentation();
  assert.equal(enemy.trackingRemaining,0);assert.equal(enemy.chargeRemaining,250);assert.equal(phases.at(-1),'locked');
  player.position.x=8;enemy.updateAttack(100);
  assert.equal(enemy.attackTarget.x,3);
  enemy.updateAttack(100);enemy.updateAttack(50);
  assert.equal(enemy.attackCycles,1);assert.ok(enemy.boltRemaining>0);
  while(enemy.boltRemaining>0)enemy.updateAttack(100);
  enemy.updateCombatPresentation();
  assert.equal(enemy.exposureWindows,1);assert.equal(enemy.recoveryRemaining,1200);assert.equal(phases.at(-1),'exposed');
  assert.equal(enemy.takeDamage(25),25);assert.equal(enemy.health,425);
  for(let i=0;i<12;i++)enemy.updateAttack(100);
  assert.equal(enemy.takeDamage(25),0);assert.equal(enemy.health,425);
});

test('authored charged reward saves one reliable counter window including a 100ms aiming response',()=>{
  for(const route of ['high','low']) {
    const h=rig();h.load('src/components/enemy-component.ts');
    const combat=h.load('src/mission/bridgehead-run.ts').BRIDGEHEAD_COMBAT;
    const enemy=Object.assign({},h.definitions['enemy-component'],{data:{speed:0,guardDamageMultiplier:combat.guardMultiplier},
      health:combat.health,isDead:false,recoveryRemaining:0,chargeRemaining:0,updateHealthBar(){},flashColor(){},createHitEffect(){},
      setState(){},die(){this.isDead=true;}});
    h.weapon.data.cooldown=.16;h.weapon.chargedShots=route==='high'?combat.chargedShots:0;
    h.weapon.findEnemyHit=()=>({enemy,point:new THREE.Vector3(0,.62,-8),distance:8});
    let windows=0;
    while(!enemy.isDead && windows<4) {
      assert.equal(enemy.takeDamage(1000),0,'armor cannot be chipped between windows');
      windows++;enemy.recoveryRemaining=combat.recoverySeconds*1000;
      for(let ms=0;ms<combat.recoverySeconds*1000&&!enemy.isDead;ms+=16) {
        h.weapon.shotClock+=16;
        if(ms>=100)h.weapon.shoot();
        enemy.recoveryRemaining=Math.max(0,enemy.recoveryRemaining-16);
      }
      enemy.recoveryRemaining=0;h.weapon.shotClock+=4200;
    }
    assert.equal(windows,route==='high'?2:3);
    assert.equal(h.weapon.chargedShots,0);
    assert.equal(h.weapon.shotsFired,route==='high'?14:17);
  }
});
