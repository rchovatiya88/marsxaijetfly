import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { moveInWorld, traceWorld, clearSpawn } from './arena-world';
import { FrameBenchmark } from './FrameBenchmark';
import { CapturePanel } from './CapturePanel';
import { BRIDGEHEAD_APPROACHES, BRIDGEHEAD_EXTRACTION, BRIDGEHEAD_GATES, BRIDGEHEAD_EXITS, BRIDGEHEAD_ROUTE_PATHS, BRIDGEHEAD_EXTRACTION_PATH, BRIDGEHEAD_LOW_PEEK, BridgeheadRoute } from './mission/bridgehead-run';
import { runBridgeheadInputCheck } from './bridgehead-input-check';

// Explicit, local QA surface; no telemetry or test controls on the ordinary game URL.
export function PlaytestPanel({sceneRef,telemetry,launch}: {sceneRef: any;telemetry:string;launch:()=>void}) {
  const enabled = new URLSearchParams(window.location.search).has('playtest');
  const [report,setReport] = useState('Local QA. Fixtures alter this sortie. Use cursor aim after checks to start a fresh sortie.');
  const [running,setRunning] = useState(false);
  const stop = useRef(false);
  useEffect(() => () => {stop.current=true;},[]);
  if (!enabled) return null;
  const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  const inputCheck=async(repeats=1)=>{
    setRunning(true);stop.current=false;const lines:string[]=[];
    setReport('Starting continuous programmatic-input flight. No position or health changes after launch.');
    try{
      const resources:any[]=[];
      for(let cycle=0;cycle<repeats;cycle++){
        lines.push(`PAIR ${cycle+1}/${repeats}`);
        await runBridgeheadInputCheck(sceneRef.current,launch,line=>{lines.push(line);setReport(lines.join('\n'));},()=>stop.current);
        const scene=sceneRef.current;scene.components['game-manager'].resetMission();launch();
        const start=performance.now();while(scene.components['world-stream']?.stats().inFlight && performance.now()-start<16000 && !stop.current)await frame();
        await frame();await frame();scene.pause();
        const info=scene.renderer.info.memory,stream=scene.components['world-stream']?.stats();
        resources.push({pair:cycle+1,geometries:info.geometries,textures:info.textures,terrainTriangles:stream?.collisionTriangles});
        lines.push(`Settled ${JSON.stringify(resources[resources.length-1])}`);setReport(lines.join('\n'));
      }
      lines.push(`Completed ${repeats*2} full programmatic-input wins and retries. This does not substitute for native input or fresh-player observations.`);setReport(lines.join('\n'));
    }
    catch(error){setReport(lines.join('\n')+`\nERROR ${String(error)}`);}
    finally{sceneRef.current.pause();setRunning(false);}
  };
  const checks = async () => {
    setRunning(true); const lines: string[]=[];
    const check = (name:string,ok:boolean) => { lines.push(`${ok ? 'PASS' : 'FAIL'} ${name}`); setReport(lines.join('\n')); };
    const scene=sceneRef.current;
    try {
      const manager=scene.components['game-manager'];
      const player:any=document.getElementById('player');
      const flight=player.components['fly-controls'];
      const weapon=(document.getElementById('jetbike') as any).components['weapon-component'];
      const health=player.components['player-component'];
      scene.pause();
      check('WebGL renderer exists',!!scene.renderer?.getContext());
      const p={x:-9,y:2,z:-8}; moveInWorld(p,{x:0,y:0,z:-30});
      check('Boost sweep stops at gate pillar',p.z > -14.8 && p.z < -14.6);
      const slide={x:-9,y:2,z:-8};moveInWorld(slide,{x:4,y:0,z:-30});
      check('Diagonal collision slides along cover',slide.x > -5.1 && slide.z > -15);
      const under={x:0,y:2,z:-16};moveInWorld(under,{x:0,y:15,z:0});
      check('Ascent stops below gate crossbar',under.y < 3 && under.y > 2.8);
      check('Cover blocks both ray directions',!!traceWorld({x:-12,y:1,z:3},{x:0,y:0,z:-10}) && !!traceWorld({x:-12,y:1,z:-7},{x:0,y:0,z:10}));
      check('Spawn excludes solid cover and arena exterior',!clearSpawn(-12,-2) && !clearSpawn(30,0) && clearSpawn(0,0));
      manager.startGame();
      const elapsed=manager.elapsed; manager.tick(0,100);
      check('Paused manager does not advance',manager.elapsed === elapsed);
      weapon.ammoInClip=5;weapon.reload();
      const reload=weapon.reloadRemaining;
      await frame();await frame();
      check('Paused renderer does not advance reload',weapon.reloadRemaining === reload);
      for(let i=0;i<20;i++) weapon.tick(i*100,100);
      check('Reload completes in simulation time',weapon.ammoInClip===30 && !weapon.isReloading);
      scene.play();
      flight.moveState.forward=1;flight.speedMultiplier=2;weapon.mouseDown=true;
      scene.pause();
      check('Pause clears held boost and fire',flight.moveState.forward===0 && flight.speedMultiplier===1 && !weapon.mouseDown);
      // Actual A-Frame entity and shared Three runtime, rather than DOM mocks.
      const enemyEl:any=document.createElement('a-entity');
      enemyEl.setAttribute('position','0 0 0');enemyEl.setAttribute('enemy-component','health: 100; speed: 0; weaponRange: 50');scene.appendChild(enemyEl);
      for(let i=0;i<120 && !enemyEl.components?.['enemy-component']?.enemyHalo;i++) await frame();
      const enemy=enemyEl.components?.['enemy-component'];
      if (!enemy?.enemyHalo) throw new Error('Enemy did not initialize');
      player.object3D.position.set(0,3,12);
      flight.rotation.set(-0.3,0,0,'YXZ'); flight.applyLookRotation();
      const target=new THREE.Vector3(0,1,0);
      const camera:any=document.getElementById('camera');
      for(let i=0;i<12;i++) {
        scene.object3D.updateMatrixWorld(true);
        const origin=camera.object3D.getWorldPosition(new THREE.Vector3());
        const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(origin,target,new THREE.Vector3(0,1,0)));
        flight.rotation.setFromQuaternion(q,'YXZ');flight.applyLookRotation();
      }
      scene.object3D.updateMatrixWorld(true);
      const origin=camera.object3D.getWorldPosition(new THREE.Vector3());
      const direction=new THREE.Vector3(0,0,-1).applyQuaternion(camera.object3D.getWorldQuaternion(new THREE.Quaternion()));
      weapon.raycaster.set(origin,direction);
      check('Rotated camera ray hits rendered target',weapon.findEnemyHit(origin,direction)?.enemy === enemy);
      launch(); weapon.lastShot=-10000; weapon.shoot();scene.pause();
      check('Real weapon shot damages target',enemy.health===75);
      check('Twin world bolts are visible',weapon.boltPool?.filter((b:any)=>b.mesh.visible).length===2);
      await frame(); await frame();
      const geometry=scene.renderer.info.memory.geometries;
      for(let i=0;i<100;i++) weapon.createWeaponBolts(target,direction);
      await frame(); await frame();
      check('Sustained fire reuses a bounded bolt pool',weapon.boltPool.length===12 && scene.renderer.info.memory.geometries===geometry);
      const hp=health.health;
      enemy.lastEnemyShot=-10000;enemy.enemyShoot();
      check('Enemy warns before dealing damage',enemy.chargeRemaining===850 && health.health===hp);
      player.object3D.position.x+=8;
      for(let i=0;i<40;i++) enemy.updateAttack(100);
      check('Moving away dodges locked projectile',health.health===hp);
      enemy.chargeRemaining=0;enemy.boltRemaining=0;enemy.lastEnemyShot=-10000;
      enemyEl.object3D.position.set(-12,0,-7);player.object3D.position.set(-12,1,3);
      check('Enemy cannot charge through cover',enemy.enemyShoot()===false);
      enemyEl.remove();
      player.object3D.position.set(0,3,12);flight.rotation.set(0,0,0);flight.applyLookRotation();flight.clearInput();
      const resourceCounts:number[]=[];
      for(let run=0;run<10;run++) {
        const fixture:any=document.createElement('a-entity');
        fixture.setAttribute('position','0 0 0');fixture.setAttribute('enemy-component','speed: 0');scene.appendChild(fixture);
        for(let i=0;i<120 && !fixture.components?.['enemy-component']?.enemyHalo;i++)await frame();
        if(!fixture.components?.['enemy-component']?.enemyHalo)throw new Error('Cleanup fixture failed to initialize');
        await frame();await frame();fixture.remove();await frame();await frame();
        resourceCounts.push(scene.renderer.info.memory.geometries);
      }
      check('Ten enemy spawn/remove cycles leave no registrations',manager.activeEnemiesCount===0);
      check('GPU geometry count stabilizes across last five cycles',Math.max(...resourceCounts.slice(5))-Math.min(...resourceCounts.slice(5))<=1);
      lines.push(`Cleanup geometry counts: ${resourceCounts.join(', ')}`);
      health.takeDamage(health.health);
      check('Lethal damage ends mission and clears simulation',health.isDead && manager.gameOver && !scene.isPlaying);
      const resetCounts:number[]=[];
      const renderer=scene.renderer, world=scene.object3D;
      for(let run=0;run<10;run++) {
        manager.resetMission();
        launch();
        // Forced end-state fixture, not a full human or scripted combat sortie.
        const fixture:any=document.createElement('a-entity');
        fixture.setAttribute('enemy-component','speed: 0');scene.appendChild(fixture);
        for(let i=0;i<120 && !fixture.components?.['enemy-component']?.enemyHalo;i++)await frame();
        if(!fixture.components?.['enemy-component']?.enemyHalo)throw new Error('Reset enemy failed to initialize');
        weapon.ammoInClip=5;weapon.reload();flight.moveState.forward=1;weapon.mouseDown=true;
        if(run%2)health.takeDamage(health.health);else manager.finishMission(true);
        manager.resetMission();
        await frame();await frame();
        if(manager.activeEnemiesCount!==0 || scene.querySelector('[enemy-component]') || health.isDead || health.health!==health.maxHealth || weapon.isReloading || weapon.ammoInClip!==30 || weapon.mouseDown || flight.moveState.forward || player.object3D.position.distanceTo(new THREE.Vector3(0,3,12))>0.01)throw new Error(`Reset state mismatch at cycle ${run+1}`);
        resetCounts.push(scene.renderer.info.memory.geometries);
      }
      check('Ten alternating forced win/defeat retries restore mission state',!manager.gameStarted && !manager.gameOver);
      check('Retry retains scene and WebGL renderer',scene.renderer===renderer && scene.object3D===world);
      check('Retry geometries stabilize across last five cycles',Math.max(...resetCounts.slice(5))-Math.min(...resetCounts.slice(5))<=1);
      lines.push(`Retry fixture geometry counts: ${resetCounts.join(', ')}`);
      setReport(lines.join('\n')+'\nDone. Fresh sortie ready. Forced endings are lifecycle coverage, not ten complete combat sorties.');
    } catch(error) {setReport(lines.join('\n')+`\nERROR ${String(error)}`);} finally {scene.pause();setRunning(false);}
  };
  const soak = async () => {
    if (sceneRef.current.components['game-manager'].gameStarted) sceneRef.current.components['game-manager'].resetMission();
    setRunning(true); stop.current=false;launch();
    const scene=sceneRef.current, manager=scene.components['game-manager'];
    const player:any=document.getElementById('player');
    const flight=player.components['fly-controls'];
    const weapon=(document.getElementById('jetbike') as any).components['weapon-component'];
    const camera:any=document.getElementById('camera');
    const samples:number[]=[];let last=performance.now(),start=last;let fired=0;
    const initial=scene.renderer.info.memory.geometries;
    try {
      while(!stop.current && performance.now()-start < 90000 && !manager.gameOver) {
        await frame(); const now=performance.now();
        if (!scene.isPlaying) {setReport('Soak paused by focus loss. Resume cursor aim to continue.');last=now;continue;}
        if(now-start>2000) samples.push(now-last);last=now;
        const enemy=manager.activeEnemies.find((e:any)=>!e.isDead);
        if(enemy) {
          const target=enemy.el.object3D.position.clone();target.y+=1;
          // Scripted pilot: ordinary weapon damage/cooldown, no direct kills or health overrides.
          scene.object3D.updateMatrixWorld(true);
          const origin=camera.object3D.getWorldPosition(new THREE.Vector3());
          const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(origin,target,new THREE.Vector3(0,1,0)));
          const aim=new THREE.Quaternion().setFromEuler(flight.rotation).slerp(q,0.35);flight.rotation.setFromQuaternion(aim,'YXZ');flight.applyLookRotation();
          flight.moveState.right=1;flight.moveState.forward=0;flight.updateMovementVector();
          const ammo=weapon.ammoInClip;weapon.shoot();if(weapon.ammoInClip<ammo)fired++;
        } else {flight.clearInput();}
        if(samples.length%30===0) setReport(`Scripted combat: wave ${manager.level}/3 · score ${manager.score}\n${fired} shots · hull ${Math.round(player.components['player-component'].health)}\n${scene.renderer.info.render.calls} draws · ${scene.renderer.info.memory.geometries} geometries\nRunning; keep this tab focused.`);
      }
      samples.sort((a,b)=>a-b);
      const median=samples[Math.floor(samples.length*0.5)]||0,p95=samples[Math.floor(samples.length*0.95)]||0;
      setReport(`Combat ${manager.gameOver ? player.components['player-component'].isDead ? 'DEFEAT' : 'VICTORY' : 'STOPPED'}\nWave ${manager.level}/3 · score ${manager.score} · ${fired} shots\n${samples.length} frames · median ${median.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms\nGeometries ${initial} → ${scene.renderer.info.memory.geometries}\n${scene.renderer.domElement.width}×${scene.renderer.domElement.height} render pixels\n${navigator.userAgent}\nScripted pilot; not evidence of human enjoyment.`);
    } finally {flight.clearInput();weapon.pause();scene.pause();setRunning(false);}
  };
  const ridgeSmoke = async () => {
    const scene=sceneRef.current, ridge=scene.components['ridge-run'];
    if(!ridge) {setReport('Open ?ridge-run&playtest for the Ridge route fixture.');return;}
    setRunning(true);stop.current=false;
    const lines:string[]=[];
    const check=(name:string,ok:boolean)=>{lines.push(`${ok?'PASS':'FAIL'} ${name}`);setReport(lines.join('\n'));if(!ok)throw Error(name);};
    const manager=scene.components['game-manager'];
    const player:any=document.getElementById('player'), camera:any=document.getElementById('camera');
    const flight=player.components['fly-controls'], health=player.components['player-component'];
    const weapon=(document.getElementById('jetbike') as any).components['weapon-component'];
    const renderer=scene.renderer;
    try {
      for(const route of ['high','low']) {
        manager.resetMission();launch();
        player.object3D.position.set(route==='high'?-6:6,route==='high'?10:3.5,0);
        ridge.tick(0,0);
        flight.speedMultiplier=route==='high'?2:1;flight.velocity.set(0,0,-25);
        player.object3D.position.z=-12;ridge.tick(0,16);flight.clearInput();
        check(`${route}: swept gate crossing chooses route`,ridge.route===route && ridge.stage==='warden');
        check(`${route}: route reward applied`,route==='high'?weapon.chargedShots===3:health.shield===30);
        scene.pause();
        const loadStart=performance.now();
        while(!ridge.warden?.components?.['hero-model']?.model && !ridge.warden?.components?.['hero-model']?.failed && performance.now()-loadStart<10000 && !stop.current)await frame();
        check(`${route}: packaged Warden GLB loaded`,!!ridge.warden?.components?.['hero-model']?.model);
        player.object3D.position.set(-4,3,-23);scene.play();
        const start=performance.now();let shots=0;
        while(ridge.stage==='warden' && !manager.gameOver && !stop.current && performance.now()-start<15000) {
          await frame();
          if(!scene.isPlaying)throw Error('Fixture lost focus; rerun with this tab focused.');
          const enemy=ridge.warden.components?.['enemy-component'];
          if(!enemy || enemy.isDead)continue;
          const target=enemy.el.object3D.position.clone();target.y+=1;
          for(let i=0;i<8;i++) {
            scene.object3D.updateMatrixWorld(true);
            const origin=camera.object3D.getWorldPosition(new THREE.Vector3());
            const aim=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(origin,target,new THREE.Vector3(0,1,0)));
            flight.rotation.setFromQuaternion(aim,'YXZ');flight.applyLookRotation();
          }
          scene.object3D.updateMatrixWorld(true);
          const ammo=weapon.ammoInClip;weapon.shoot();if(weapon.ammoInClip<ammo)shots++;
        }
        check(`${route}: ordinary weapon defeats Warden (${shots} shots)`,ridge.stage==='extraction' && !health.isDead);
        check(`${route}: charged shots consumed only on high route`,!weapon.chargedShots);
        player.object3D.position.set(0,3.5,-41);
        const held=ridge.extractionTime;scene.pause();await frame();await frame();
        check(`${route}: extraction hold pauses`,ridge.extractionTime===held);
        scene.play();const extractionStart=performance.now();
        while(!manager.gameOver && performance.now()-extractionStart<5000 && !stop.current)await frame();
        check(`${route}: extraction wins`,manager.gameOver && ridge.stage==='complete' && !health.isDead);
        manager.resetMission();await frame();await frame();
        check(`${route}: retry clears reward, enemies and result`,!health.shield && !weapon.chargedShots && !manager.gameOver && !scene.querySelector('[enemy-component]'));
        lines.push(`${route}: reset GPU geometries ${renderer.info.memory.geometries}, textures ${renderer.info.memory.textures}`);
      }
      check('Both routes reuse the WebGL renderer',scene.renderer===renderer);
      setReport(lines.join('\n')+'\nScripted locomotion and aiming; real gate tests, weapon damage and extraction clock. Not human usability evidence.');
    } catch(error) {setReport(lines.join('\n')+`\nERROR ${String(error)}`);} finally {scene.pause();flight.clearInput();weapon.pause();setRunning(false);}
  };
  const bridgeheadSmoke = async () => {
    const scene=sceneRef.current,mission=scene.components['bridgehead-run'],stream=scene.components['world-stream'];
    if(!mission || !stream) {setReport('Open ?bridgehead&playtest and wait for Bridgehead Run to load.');return;}
    setRunning(true);stop.current=false;const lines:string[]=[];
    const check=(name:string,ok:boolean)=>{lines.push(`${ok?'PASS':'FAIL'} ${name}`);setReport(lines.join('\n'));if(!ok)throw Error(name);};
    const manager=scene.components['game-manager'];
    const player:any=document.getElementById('player'),camera:any=document.getElementById('camera');
    const flight=player.components['fly-controls'],health=player.components['player-component'];
    const weapon=(document.getElementById('jetbike') as any).components['weapon-component'];
    const renderer=scene.renderer,resourceCounts:number[]=[],frameSamples:number[]=[];
    const normalBestBefore=localStorage.getItem('mars-bridgehead-best-v1');
    try {
      manager.resetMission();launch();
      const beforeExit=BRIDGEHEAD_EXITS[1].position;
      mission.previous={...beforeExit,x:beforeExit.x-3};player.object3D.position.copy({...beforeExit,x:beforeExit.x+1});mission.tick(0,16);
      check('pre-entry bridge exit cannot skip route choice',mission.stage==='choice' && !mission.route && !mission.warden);
      for(const point of BRIDGEHEAD_ROUTE_PATHS.high.slice(1,7)){mission.previous={...point};player.object3D.position.copy(point);mission.tick(0,16);}
      const beforeHigh=BRIDGEHEAD_GATES[0].position;
      mission.previous={...beforeHigh,x:beforeHigh.x-3};player.object3D.position.copy({...beforeHigh,x:beforeHigh.x+1});flight.speedMultiplier=1;flight.velocity.set(8,0,0);mission.tick(0,16);
      check('unboosted high entry is rejected without reward',mission.stage==='choice' && !mission.route && !weapon.chargedShots && !health.shield);
      manager.resetMission();await frame();await frame();
      for(const route of ['high','low'] as BridgeheadRoute[]) {
        manager.resetMission();launch();
        const gate=BRIDGEHEAD_GATES.find(g=>g.id===route)!.position;
        const path=BRIDGEHEAD_ROUTE_PATHS[route],entryIndex=path.findIndex(point=>point.x===gate.x&&point.y===gate.y&&point.z===gate.z);
        for(const point of path.slice(1,entryIndex)){player.object3D.position.copy(point);mission.tick(0,16);}
        check(`${route}: numbered entry course completed`,mission.courseProgress[route]===entryIndex);
        mission.previous={...gate,x:gate.x-3};
        player.object3D.position.copy({...gate,x:gate.x+1});
        flight.speedMultiplier=route==='high'?2:1;flight.velocity.set(route==='high'?16:8,0,0);
        mission.tick(0,16);flight.clearInput();
        check(`${route}: ordered +X gate chooses route`,mission.route===route && mission.stage==='traverse');
        check(`${route}: exclusive reward applied`,route==='high'?weapon.chargedShots===3:health.shield===30);
        const exit=BRIDGEHEAD_EXITS.find(g=>g.id===route)!.position;
        mission.previous={x:exit.x-4,y:exit.y,z:exit.z};player.object3D.position.set(exit.x+1,exit.y,exit.z);
        mission.tick(0,16);
        check(`${route}: bridge exit requires court approach before Warden`,mission.stage==='approach' && !mission.warden);
        for(const point of path.slice(entryIndex+2)){player.object3D.position.copy(point);mission.tick(0,16);}
        check(`${route}: court arrival starts Warden encounter`,mission.stage==='warden' && !!mission.warden);
        scene.pause();
        const loadStart=performance.now();
        while(!mission.warden?.components?.['hero-model']?.model && !mission.warden?.components?.['hero-model']?.failed && performance.now()-loadStart<10000 && !stop.current)await frame();
        check(`${route}: packaged Warden GLB loaded`,!!mission.warden?.components?.['hero-model']?.model);
        const enemy=mission.warden.components?.['enemy-component'],hero=mission.warden.components?.['hero-model'];
        enemy.setState('idle');check(`${route}: Warden idle clip mapped`,hero?.currentAnimation==='Baka_Idle' && !!hero?.action);
        enemy.setState('attack');check(`${route}: Warden attack clip mapped`,hero?.currentAnimation==='Baka_Punch' && !!hero?.action);
        enemy.setState('chase');check(`${route}: Warden run clip mapped`,hero?.currentAnimation==='Baka_Run' && !!hero?.action);
        enemy.recoveryRemaining=1200;enemy.updateAI(.016);check(`${route}: recovery disarms and idles Warden`,enemy.currentState==='idle' && !enemy.seekBehavior.active && hero?.currentAnimation==='Baka_Idle');enemy.recoveryRemaining=0;
        const guardedHealth=enemy.health;
        check(`${route}: armor rejects premature damage`,enemy.takeDamage(25)===0 && enemy.health===guardedHealth);
        player.object3D.position.copy(route==='low'?BRIDGEHEAD_LOW_PEEK:BRIDGEHEAD_APPROACHES[0].position);scene.play();
        const start=performance.now();let shots=0;
        while(mission.stage==='warden' && !manager.gameOver && !stop.current && performance.now()-start<35000) {
          const frameStart=performance.now();await frame();frameSamples.push(performance.now()-frameStart);
          if(!scene.isPlaying)throw Error('Fixture lost focus; rerun with this tab focused.');
          const enemy=mission.warden.components?.['enemy-component'];if(!enemy || enemy.isDead)continue;
          const target=enemy.el.object3D.position.clone();target.y+=1;
          for(let i=0;i<8;i++) {
            scene.object3D.updateMatrixWorld(true);
            const origin=camera.object3D.getWorldPosition(new THREE.Vector3());
            const aim=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(origin,target,new THREE.Vector3(0,1,0)));
            flight.rotation.setFromQuaternion(aim,'YXZ');flight.applyLookRotation();
          }
          scene.object3D.updateMatrixWorld(true);
          const ammo=weapon.ammoInClip;if(enemy.recoveryRemaining>0)weapon.shoot();if(weapon.ammoInClip<ammo)shots++;
        }
        check(`${route}: ordinary weapon defeats Warden (${shots} shots)`,mission.stage==='extraction' && !health.isDead);
        check(`${route}: at least two attack and exposure cycles occur`,enemy.attackCycles>=2 && enemy.exposureWindows>=2);
        check(`${route}: stationary pilot is punished by real bolts`,health.health<health.maxHealth || route==='low'&&health.shield<30);
        check(`${route}: Warden death clip mapped before removal`,hero?.currentAnimation==='Baka_Dying' && !!hero?.action && mission.warden.parentNode);
        player.object3D.position.copy(BRIDGEHEAD_EXTRACTION_PATH[0]);mission.tick(0,0);
        player.object3D.position.copy(BRIDGEHEAD_EXTRACTION);
        const held=mission.extractionTime;scene.pause();await frame();await frame();
        check(`${route}: extraction clock freezes while paused`,mission.extractionTime===held);
        let resultDetail:any=null;
        scene.addEventListener('mission-ended',(event:any)=>{resultDetail=event.detail;},{once:true});
        scene.play();const extractionStart=performance.now();
        while(!manager.gameOver && performance.now()-extractionStart<5000 && !stop.current)await frame();
        check(`${route}: extraction produces route result`,manager.gameOver && mission.stage==='complete' && !health.isDead);
        check(`${route}: result reports mastery telemetry`,resultDetail?.route===route && resultDetail?.shots===shots && resultDetail?.chargesSpent===(route==='high'?3:0) && resultDetail?.hullLost>=0 && resultDetail?.seconds>=0);
        manager.resetMission();await frame();await frame();
        check(`${route}: retry clears reward and owned enemies`,!health.shield && !weapon.chargedShots && !manager.gameOver && !scene.querySelector('[enemy-component]'));
        launch();
        const settleStart=performance.now();
        while(stream.stats().inFlight && performance.now()-settleStart<16000 && !stop.current)await frame();
        await frame();await frame();scene.pause();
        const counts=stream.stats();resourceCounts.push(renderer.info.memory.geometries);
        check(`${route}: stream remains within resident budgets`,counts.lowResident===4 && counts.highResident<=2 && counts.inFlight<=2 && counts.visibleTriangles<=350000);
        lines.push(`${route}: settled resources ${renderer.info.memory.geometries} geometries / ${renderer.info.memory.textures} textures`);
      }
      check('Both routes reuse renderer and stabilize resources',scene.renderer===renderer && Math.max(...resourceCounts)-Math.min(...resourceCounts)<=1);
      check('QA best score is isolated from the pilot record',localStorage.getItem('mars-bridgehead-best-v1')===normalBestBefore && Number(localStorage.getItem('mars-bridgehead-qa-best-v1'))>0);
      lines.push(`Reset geometry counts: ${resourceCounts.join(', ')}`);
      const orderedFrames=[...frameSamples].sort((a,b)=>a-b);
      const median=orderedFrames[Math.floor(orderedFrames.length*.5)] || 0,p95=orderedFrames[Math.min(orderedFrames.length-1,Math.floor(orderedFrames.length*.95))] || 0;
      lines.push(`Embedded combat scheduling: ${frameSamples.length} samples · median ${median.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms · viewport ${window.innerWidth}×${window.innerHeight} · render ${renderer.domElement.width}×${renderer.domElement.height}`);
      manager.resetMission();launch();mission.chooseRoute('low');mission.spawnWarden();
      let lossDetail:any=null,lossEvents=0;
      const collectLoss=(event:any)=>{lossDetail=event.detail;lossEvents++;};
      scene.addEventListener('mission-ended',collectLoss);
      health.takeDamage(999);await frame();await frame();
      check('loss emits one accurate terminal result',manager.gameOver && health.isDead && lossEvents===1 && lossDetail?.won===false && lossDetail?.route==='low' && lossDetail?.hullLost===health.maxHealth);
      check('loss result is rendered for the pilot',document.body.querySelector('.mission-menu h1')?.textContent?.includes('SIGNAL')===true && document.body.querySelector('.menu-description')?.textContent?.includes('low route')===true);
      manager.finishMission(false);
      check('duplicate terminal calls cannot emit another result',lossEvents===1);
      scene.removeEventListener('mission-ended',collectLoss);
      manager.resetMission();await frame();await frame();
      check('loss retry restores hull and clears Warden',!manager.gameOver && !health.isDead && health.health===health.maxHealth && !scene.querySelector('[enemy-component]'));
      const lossGeometry:number[]=[];
      for(let run=0;run<9;run++) {
        launch();mission.chooseRoute(run%2?'high':'low');mission.spawnWarden();health.takeDamage(999);
        await frame();manager.resetMission();
        const cycleSettle=performance.now();while(performance.now()-cycleSettle<750 && !stop.current)await frame();
        lossGeometry.push(renderer.info.memory.geometries);
      }
      check('ten loss/retry cycles have bounded settled geometry',Math.max(...lossGeometry)-Math.min(...lossGeometry)<=1 && lossGeometry[lossGeometry.length-1]<=lossGeometry[0]+1 && !scene.querySelector('[enemy-component]'));
      lines.push(`Loss/retry geometry counts: ${lossGeometry.join(', ')}`);
      setReport(lines.join('\n')+'\nScripted route placement and aim; actual gate logic, GLB combat, pause, extraction, retry and streaming. Not human usability evidence.');
    } catch(error) {setReport(lines.join('\n')+`\nERROR ${String(error)}`);} finally {scene.pause();flight.clearInput();weapon.pause();setRunning(false);}
  };
  const streamSmoke = async () => {
    const scene=sceneRef.current,stream=scene.components['world-stream'];
    if(!stream || stream.status!=='ready'){setReport('Open ?full-level&playtest and wait for the full overview.');return;}
    setRunning(true);stop.current=false;const lines:string[]=[];
    const check=(name:string,ok:boolean)=>{lines.push(`${ok?'PASS':'FAIL'} ${name}`);setReport(lines.join('\n'));if(!ok)throw Error(name);};
    const player:any=document.getElementById('player'),flight=player.components['fly-controls'];
    const manager=scene.components['game-manager'];
    try {
      manager.resetMission();launch();
      check('Whole overview ready',stream.stats().lowResident===4);
      const b=stream.manifest.bounds;
      for(let cycle=0;cycle<3;cycle++) {
        player.object3D.position.set(0,b.max.y+35,b.max.z+18);flight.updateCamera(0);
        let start=performance.now();
        while((stream.stats().highResident || stream.stats().inFlight) && performance.now()-start<16000){await frame();if(stop.current)throw Error('Stopped');}
        const requested=stream.stats().counters.requests;
        const chunk=stream.manifest.chunks.find((c:any)=>c.id==='q10') || stream.manifest.chunks[0];
        player.object3D.position.copy(chunk.center);flight.updateCamera(0);
        start=performance.now();
        while(!stream.stats().highResident && performance.now()-start<16000){await frame();if(stop.current)throw Error('Stopped');}
        const near=stream.stats();
        check(`Cycle ${cycle+1}: near detail requested and loaded`,near.highResident>0 && near.counters.requests>requested);
        check(`Cycle ${cycle+1}: resident and triangle caps`,near.highResident<=2 && near.inFlight<=2 && near.visibleTriangles<=350000);
        player.object3D.position.set(0,b.max.y+35,b.max.z+18);flight.updateCamera(0);
        start=performance.now();await frame();
        while((stream.stats().highResident || stream.stats().inFlight) && performance.now()-start<16000){await frame();if(stop.current)throw Error('Stopped');}
        const far=stream.stats();
        check(`Cycle ${cycle+1}: detail disposed, whole coarse retained`,far.highResident===0 && far.lowResident===4 && far.counters.disposed>near.counters.disposed);
        lines.push(`Far reset ${cycle+1}: ${scene.renderer.info.memory.geometries} geometries / ${scene.renderer.info.memory.textures} textures`);
      }
      check('No streamed asset errors',stream.stats().counters.errors===0);
      const network=performance.getEntriesByType('resource').filter(e=>e.name.includes('/level1-stream/'));
      lines.push('Resource timing (page-relative): '+network.map(e=>`${e.name.split('/').pop()}@${Math.round(e.startTime)}ms`).join(', '));
      manager.resetMission();
      setReport(lines.join('\n')+'\nScripted relocation tests actual chunk fetch/decode/eviction, not terrain collision or human traversal.');
    }catch(error){setReport(lines.join('\n')+'\nERROR '+String(error));}finally{scene.pause();flight.clearInput();setRunning(false);}
  };
  return <aside className="playtest-panel"><strong>LOCAL BROWSER QA</strong><div>{telemetry}</div><button disabled={running} onClick={checks}>Run browser checks</button><button disabled={running} onClick={soak}>Run combat soak</button><button disabled={running} onClick={ridgeSmoke}>Run Ridge route smoke</button><button disabled={running} onClick={bridgeheadSmoke}>Run Bridgehead route smoke</button><button disabled={running} onClick={()=>inputCheck()}>Fly both routes with input</button><button disabled={running} onClick={()=>inputCheck(5)}>Run 10 full input sorties</button><button disabled={running} onClick={streamSmoke}>Run streaming smoke</button><button onClick={()=>{stop.current=true;}}>Stop soak</button><pre role="status">{report}</pre><CapturePanel sceneRef={sceneRef} launch={launch} /><FrameBenchmark sceneRef={sceneRef} /></aside>;
}
