"""Read-only source-scene surface samples for Bridgehead authoring."""
import bpy, json, math, sys
from mathutils import Vector
from pathlib import Path
root=Path(__file__).resolve().parents[1]
low_mode='--low' in sys.argv
if low_mode:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for q in ['q00','q01','q10','q11']:bpy.ops.import_scene.gltf(filepath=str(root/f'public/models/level1-stream/{q}-lod1.glb'))
else:bpy.ops.wm.open_mainfile(filepath=str(root/'art/full-level/full-level.blend'))
scene=bpy.context.scene; deps=bpy.context.evaluated_depsgraph_get()
out=[]
for name,x,z in [('launch',-19,10.7),('low_entry',-9,10.7),('low_exit',7,10.7),('high_entry',-9,-11.8),('high_exit',1,-11.8),('high_approach',12,-11.8),('low_approach',11,-1.5),('warden',23,-10),('exit',32,-15),('cover_west',14,-4),('cover_east',26,-17),('core',28,-5),('west_step',-15,-1)]:
    origin=Vector((x,-z,40)); heights=[]
    for i in range(20):
        hit,loc,normal,index,obj,matrix=scene.ray_cast(deps,origin,Vector((0,0,-1)),distance=100)
        if not hit:break
        heights.append({'y':round(loc.z,3),'object':obj.name,'normalY':round(normal.z,3)})
        origin=loc+Vector((0,0,-.025))
    out.append({'name':name,'x':x,'z':z,'surfaces':heights})
print('BRIDGEHEAD_GROUND_SAMPLES '+json.dumps(out),flush=True)
grid=[]
for x in [29,30,31,32,33,34,35]:
 for z in [-18,-17,-16,-15,-14,-13,-12]:
    hit,loc,normal,index,obj,matrix=scene.ray_cast(deps,Vector((x,-z,40)),Vector((0,0,-1)),distance=100)
    if hit:grid.append({'x':x,'y':round(loc.z,3),'z':z})
print('EXTRACTION_GRID '+json.dumps(grid),flush=True)
dest=root/'art/bridgehead';dest.mkdir(parents=True,exist_ok=True)
paths={'low':[(-19,-.8,10.7),(-9,-2.2,10.7),(7,-2.2,10.7),(8,.6,10.7),(11,.4,-1.5)],'high':[(-19,-.8,10.7),(-15,3.2,5),(-15,3.2,-1),(-15,3.2,-7),(-15,3.2,-11.8),(-9,3.2,-11.8),(1,3.2,-11.8),(12,3.2,-11.8)]}
corridors=[];probe_samples={}
for route,path in paths.items():
 for a,b in zip(path,path[1:]):
    dx,dz=b[0]-a[0],b[2]-a[2];length=math.hypot(dx,dz);ux,uz=dx/length,dz/length
    samples=[]
    for i in range(math.ceil(length)+1):
      t=i/math.ceil(length);x=a[0]+dx*t;y=a[1]+(b[1]-a[1])*t;z=a[2]+dz*t
      for along in [-2.36,0,2.36]:
       for side in [-.5,0,.5]:
        sx=x+along*ux-side*uz;sz=z+along*uz+side*ux
        hit,loc,normal,index,obj,matrix=scene.ray_cast(deps,Vector((sx,-sz,40)),Vector((0,0,-1)),distance=100)
        if hit:
            samples.append({'x':round(sx,3),'z':round(sz,3),'surfaceY':round(loc.z,3),'bikeBaseY':round(y,3),'clearance':round(y-loc.z,3)})
            probe_samples[f'{sx:.3f},{sz:.3f}']=round(loc.z,4)
    worst=min(samples,key=lambda s:s['clearance'])
    camera_samples=[]
    for i in range(math.ceil(length)+1):
      t=i/math.ceil(length);x=a[0]+dx*t-ux*6.2;y=a[1]+(b[1]-a[1])*t+2.5;z=a[2]+dz*t-uz*6.2
      hit,loc,normal,index,obj,matrix=scene.ray_cast(deps,Vector((x,-z,40)),Vector((0,0,-1)),distance=100)
      if hit:camera_samples.append({'x':round(x,3),'z':round(z,3),'surfaceY':round(loc.z,3),'cameraY':round(y,3),'clearance':round(y-loc.z,3)})
    corridors.append({'route':route,'from':a,'to':b,'minClearance':worst,'blockedSampleCount':sum(s['clearance']<.1 for s in samples),'sampleCount':len(samples),'cameraMinClearance':min(camera_samples,key=lambda s:s['clearance'])})
print('ROUTE_SWEEPS '+json.dumps(corridors),flush=True)
report={'blender':bpy.app.version_string,'units':'runtime Y-up metres','method':'ray_cast downward from Y40; all intersections, upper surface may be prop rather than terrain','geometry':'actual 4 low GLBs' if low_mode else 'normalized source full-level.blend','markers':out,'extractionGrid':grid,'envelopeProbe':{'width':1,'length':4.72,'samplesAcross':3,'samplesAlong':3,'routeStepMetres':1,'cameraHeight':2.5,'cameraDistance':6.2,'limits':'vertical top-surface samples only; not continuous swept triangle collision or browser input proof'},'corridorSweeps':corridors,'probeSamples':probe_samples}
if low_mode:
    original=json.loads((dest/'source-ground-samples.json').read_text())['probeSamples']
    deltas=[{'xz':k,'sourceY':original[k],'lowY':v,'delta':round(v-original[k],4)}for k,v in probe_samples.items()if k in original]
    errors=sorted(abs(x['delta'])for x in deltas)
    report['sourceComparison']={'sampleCount':len(deltas),'medianAbsoluteError':errors[len(errors)//2],'p95AbsoluteError':errors[int(len(errors)*.95)],'worstAbsolute':max(deltas,key=lambda x:abs(x['delta'])),'lowestLowRelative':min(deltas,key=lambda x:x['delta']),'highestLowRelative':max(deltas,key=lambda x:x['delta'])}
    print('LOW_SOURCE_COMPARISON '+json.dumps(report['sourceComparison']),flush=True)
(dest/('low-ground-samples.json' if low_mode else 'source-ground-samples.json')).write_text(json.dumps(report,indent=2)+'\n')
