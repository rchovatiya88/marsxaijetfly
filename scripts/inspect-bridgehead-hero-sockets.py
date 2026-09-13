"""Measure active GLB in the same height1.8 / heading180 / minY0 convention."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/avi-jetbike.glb'));bpy.context.view_layer.update()
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
allpts=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
lo=Vector([min(p[i]for p in allpts)for i in range(3)]);hi=Vector([max(p[i]for p in allpts)for i in range(3)])
scale=1.8/(hi.z-lo.z);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));rot=Matrix.Rotation(math.pi,4,'Z')
def game(p):
    p=rot@(p-center)*scale
    return Vector((p.x,p.z,-p.y))
report={'convention':'active GLB minY0,height1.8,heading180deg; player root at assembly base; no inherited -.5m displacement','meshes':[]}
targets=[Vector((side*.34,.58,-2.1))for side in [-1,1]]
for o in meshes:
    points=[game(o.matrix_world@v.co)for v in o.data.vertices]
    lower=[min(p[i]for p in points)for i in range(3)];upper=[max(p[i]for p in points)for i in range(3)]
    nearest=[min(points,key=lambda p:(p-t).length)for t in targets]
    report['meshes'].append({'name':o.name,'bounds':{'min':lower,'max':upper},'nearestCandidateVertices':[list(p)for p in nearest]})
vertices=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
front=sorted([game(p)for p in vertices if .05<game(p).y<.9 and game(p).z<-1.4],key=lambda p:p.z)
report['forwardRegionSamples']=[list(p)for p in front[::max(1,len(front)//20)]]
(ROOT/'art/bridgehead/hero-socket-study.json').write_text(json.dumps(report,indent=2)+'\n')
print('SOCKET_STUDY '+json.dumps(report),flush=True)
