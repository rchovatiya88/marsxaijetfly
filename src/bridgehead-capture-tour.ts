import * as THREE from 'three';
import {traceWorld, Vec, BIKE_BODY, BIKE_BODY_ENVELOPE} from './arena-world';
import {heroPoseBounds} from './components/hero-model';
import {BRIDGEHEAD_START, BRIDGEHEAD_GATES, BRIDGEHEAD_EXITS, BRIDGEHEAD_APPROACHES,
  BRIDGEHEAD_EXTRACTION, BRIDGEHEAD_WARDEN} from './mission/bridgehead-run';

export const BRIDGEHEAD_CAPTURE_VIEWS = [
  {id:'launch',label:'Launch'}, {id:'fork',label:'Fork'}, {id:'high-bridge',label:'High bridge'},
  {id:'low-bridge',label:'Low bridge'}, {id:'court',label:'Court / aimed'}, {id:'extraction',label:'Extraction'}
] as const;
export type BridgeheadCaptureView = typeof BRIDGEHEAD_CAPTURE_VIEWS[number]['id'];
const frame = () => new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
const xyz = (value: Vec) => ({x:value.x,y:value.y,z:value.z});
const middle = (a:Vec,b:Vec) => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2});

// A posed inspection tour: reset -> launch -> pause -> place inspection camera.
// No sortie completed by this helper qualifies as input or player evidence.
// Its returned metadata describes the exact state to pair with a screenshot.
export async function poseBridgeheadCapture(scene:any, id:BridgeheadCaptureView, launch:()=>void) {
  if (scene.getAttribute('data-playtest') !== 'true') throw new Error('Capture tour requires ?playtest to keep inspection separate from normal records.');
  if (!BRIDGEHEAD_CAPTURE_VIEWS.some(view=>view.id===id)) throw new Error(`Unknown capture view: ${id}`);
  const mission=scene.components['bridgehead-run'], manager=scene.components['game-manager'];
  if (!mission || !manager) throw new Error('Bridgehead scene is not ready.');
  const generation=(scene.bridgeheadCaptureGeneration||0)+1; scene.bridgeheadCaptureGeneration=generation;
  manager.resetMission(); launch(); await frame(); scene.pause();
  const player=scene.querySelector('#player'), bike=scene.querySelector('#jetbike'), cameraEl=scene.querySelector('#camera');
  const flight=player.components['fly-controls'], weapon=bike.components['weapon-component'];
  flight.clearInput(); weapon.pause();
  let position:Vec={...BRIDGEHEAD_START}, focus:Vec={...BRIDGEHEAD_GATES[1].position}, aimed=false;
  if (id==='fork') position=middle(BRIDGEHEAD_START,{...BRIDGEHEAD_GATES[1].position,y:BRIDGEHEAD_START.y});
  if (id==='high-bridge' || id==='low-bridge') {
    const index=id==='high-bridge'?0:1, route=index===0?'high':'low';
    mission.chooseRoute(route);
    position=middle(BRIDGEHEAD_GATES[index].position,BRIDGEHEAD_EXITS[index].position);
    focus={...BRIDGEHEAD_EXITS[index].position};
  }
  if (id==='court') {
    mission.chooseRoute('high'); mission.spawnWarden();
    position={...BRIDGEHEAD_APPROACHES[0].position}; focus={...BRIDGEHEAD_WARDEN,y:BRIDGEHEAD_WARDEN.y+1.05}; aimed=true;
  }
  if (id==='extraction') {
    position={...BRIDGEHEAD_EXTRACTION,x:BRIDGEHEAD_EXTRACTION.x-12,y:BRIDGEHEAD_EXTRACTION.y+1};
    focus={...BRIDGEHEAD_EXTRACTION}; aimed=true;
    mission.stage='extraction'; mission.route='inspection';
    scene.querySelectorAll('[data-bridgehead-gate], [data-bridgehead-exit], [data-bridgehead-approach]').forEach((el:any)=>el.setAttribute('visible',false));
    scene.querySelector('#bridgehead-extraction')?.setAttribute('visible',true);
  }
  player.object3D.position.set(position.x,position.y,position.z);
  flight.rotation.set(-.08,-Math.PI/2,0,'YXZ'); flight.applyLookRotation(); flight.updateCamera(0);
  const stream=scene.components['world-stream']; stream?.updateSelection?.(position);
  const waitStart=performance.now();
  while (performance.now()-waitStart < 8000) {
    if (scene.bridgeheadCaptureGeneration!==generation) throw new Error('Capture superseded by a newer view.');
    const hero=bike.components['hero-model'], warden=mission.warden?.components?.['hero-model'];
    const settled=(!hero || hero.model || hero.failed) && (id!=='court' || !!warden && (warden.model || warden.failed)) && !stream?.active?.size;
    if (settled) break;
    await frame();
  }
  if (aimed) for (let i=0;i<10;i++) {
    scene.object3D.updateMatrixWorld(true);
    const origin=cameraEl.object3D.getWorldPosition(new THREE.Vector3());
    const delta=new THREE.Vector3(focus.x,focus.y,focus.z).sub(origin);
    flight.rotation.set(Math.atan2(delta.y,Math.hypot(delta.x,delta.z)),Math.atan2(-delta.x,-delta.z),0,'YXZ');
    flight.applyLookRotation(); flight.updateCamera(0);
  }
  mission.objective(`POSED INSPECTION · ${BRIDGEHEAD_CAPTURE_VIEWS.find(view=>view.id===id)!.label} · no input completion`,[]);
  await frame(); scene.object3D.updateMatrixWorld(true);
  const renderCamera=scene.camera, renderer=scene.renderer;
  const bounds=(model:any) => {
    if (!model) return null;
    const box=heroPoseBounds(model), size=box.getSize(new THREE.Vector3());
    if (box.isEmpty()) return null;
    const projected=[];
    for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) {
      const point=new THREE.Vector3(x,y,z).project(renderCamera);
      projected.push({x:(point.x+1)/2,y:(1-point.y)/2,z:point.z});
    }
    const minX=Math.min(...projected.map(p=>p.x)),maxX=Math.max(...projected.map(p=>p.x));
    const minY=Math.min(...projected.map(p=>p.y)),maxY=Math.max(...projected.map(p=>p.y));
    return {min:xyz(box.min),max:xyz(box.max),size:xyz(size),projectedBounds:{minX,maxX,minY,maxY,
      heightFraction:maxY-minY,crosshairInside:minX<=.5&&maxX>=.5&&minY<=.5&&maxY>=.5,
      allCornersInDepth:projected.every(p=>p.z>=-1&&p.z<=1)},
      projectionLimit:'Projected world AABB is conservative; it does not prove opaque-pixel occlusion.'};
  };
  const ray=(origin:THREE.Vector3,target:Vec) => {
    const delta=new THREE.Vector3(target.x,target.y,target.z).sub(origin),hit=traceWorld(origin,delta);
    return {origin:xyz(origin),target:xyz(target),blocked:!!hit,hit:hit?{t:hit.t,point:xyz(origin.clone().addScaledVector(delta,hit.t)),normal:xyz(hit.normal)}:null};
  };
  const cameraOrigin=cameraEl.object3D.getWorldPosition(new THREE.Vector3());
  const cameraDirection=new THREE.Vector3(0,0,-1).applyQuaternion(cameraEl.object3D.getWorldQuaternion(new THREE.Quaternion()));
  const muzzlePaths=weapon.getMuzzlePaths(new THREE.Vector3(focus.x,focus.y,focus.z));
  const rendererSize=renderer.getDrawingBufferSize(new THREE.Vector2());
  const hero=bike.components['hero-model'], enemy=mission.warden?.components?.['enemy-component'];
  return {
    kind:'posed-runtime-inspection',view:id,generation,capturedAt:new Date().toISOString(),
    evidenceLimit:'Direct inspection placement and paused actors. Not natural traversal, combat, retry or human evidence.',
    buildScript:Array.from(document.scripts).map(script=>script.src).find(src=>src.includes('/assets/'))||null,
    scenePaused:!scene.isPlaying,elapsedMs:manager.elapsed,missionStage:mission.stage,
    player:xyz(player.object3D.position),bikeLocal:xyz(bike.object3D.position),
    movementCollider:{shape:'18 conservative swept body spheres',bodyEnvelope:BIKE_BODY_ENVELOPE,
      samples:BIKE_BODY,baseOrigin:xyz(player.object3D.position),yaw:flight.rotation.y},
    camera:{world:xyz(cameraOrigin),localBoom:xyz(scene.querySelector('#camera-rig').object3D.position),
      configuredHeight:flight.data.cameraHeight,configuredDistance:flight.data.cameraDistance,
      pitch:flight.rotation.x,yaw:flight.rotation.y,fov:renderCamera.fov,aspect:renderCamera.aspect,near:renderCamera.near,far:renderCamera.far},
    hero:{loaded:!!hero?.model,failed:!!hero?.failed,bounds:bounds(hero?.model)},
    warden:{loaded:!!mission.warden?.components?.['hero-model']?.model,bounds:bounds(mission.warden?.components?.['hero-model']?.model),state:enemy?.currentState||null},
    aimRay:ray(cameraOrigin,cameraOrigin.clone().addScaledVector(cameraDirection,weapon.data.range)),
    focusRays:muzzlePaths.map((path:any,index:number)=>({name:index===0?'left authored muzzle':'right authored muzzle',
      damageShare:1/muzzlePaths.length,...ray(path.start,focus)})),
    renderer:{width:rendererSize.x,height:rendererSize.y,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,
      geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},
    streaming:{status:stream?.status,activeRequests:stream?.active?.size||0,terrainTriangles:stream?.collision?.triangleCount||0}
  };
}
