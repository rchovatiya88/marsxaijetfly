"""Read-only scale-three source samples before choosing revised mission art."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/full-level/full-level.blend'))
for o in bpy.context.scene.objects:
    if o.type=='MESH':o.scale=(3,3,3)
bpy.context.view_layer.update();scene=bpy.context.scene;deps=bpy.context.evaluated_depsgraph_get()
def surface(x,z):
    hit,p,n,index,obj,matrix=scene.ray_cast(deps,Vector((x,-z,100)),Vector((0,0,-1)),distance=300)
    return {'x':x,'z':z,'top':round(p.z,3),'upNormal':round(n.z,3)} if hit else {'x':x,'z':z,'top':None}
markers=[('launch',-57,32.1),('fork',-48,32.1),('north-a',-45,15),('north-b',-45,0),('north-c',-45,-21),('north-align',-45,-35.4),
 ('high-entry',-27,-35.4),('high-exit',3,-35.4),('high-bank',15,-35.4),('high-court',45,-35.4),
 ('low-entry',-27,32.1),('low-exit',21,32.1),('low-bank',27,32.1),('low-north-turn',33,15),('low-court',45,-4.5),
 ('warden-old-x3',69,-30),('extraction-old-x3',96,-45)]
report={'scale':3,'units':'runtime Y-up metres','source':'art/full-level/full-level.blend','unchangedOnDisk':True,
 'markers':[{'id':n,**surface(x,z)}for n,x,z in markers],
 'northDescent':[surface(x,-35.4)for x in range(-51,-17,1)],
 'courtGrid':[surface(x,z)for x in range(45,96,3)for z in range(-51,1,3)],
 'courtFloorGrid':[surface(x,z)for x in range(54,79)for z in range(-36,-11)],
 'extractionGrid':[surface(x,z)for x in range(86,95)for z in range(-49,-40)],
 'lowClimb':[surface(27,z)for z in range(33,-10,-2)]}
for label,rect in [('court',(54,78,-36,-12)),('extraction',(86,94,-49,-41))]:
    points=[]
    for o in scene.objects:
      if o.type!='MESH':continue
      for v in o.data.vertices:
        p=o.matrix_world@v.co;x,z=p.x,-p.y
        if rect[0]<=x<=rect[1] and rect[2]<=z<=rect[3]:points.append({'x':round(x,3),'z':round(z,3),'top':round(p.z,3)})
    report[label+'VertexTop']=max(points,key=lambda p:p['top'])
paths={
 'low':[(-57,-4.5,32.1),(-42,-6.5,32.1),(-27,-8.2,32.1),(21,-8.2,32.1),(30,-6.4,32.1),(30,-1,6),(45,3.2,-12),(53,3.2,-16)],
 'high':[(-57,-4.5,32.1),(-48,-4.5,32.1),(-45,1,12),(-45,8.4,-21),(-45,8.4,-35.4),(-30,8.4,-35.4),(-21,-.7,-35.4),(-18,-.7,-35.4),(3,-.7,-35.4),(9,3.2,-35.4),(53,5.6,-33)]}
report['candidatePaths']=paths;report['candidateSweeps']=[]
for route,points in paths.items():
 for a,b in zip(points,points[1:]):
    dx,dz=b[0]-a[0],b[2]-a[2];length=math.hypot(dx,dz);ux,uz=dx/length,dz/length;probes=[]
    for i in range(math.ceil(length)+1):
      t=i/math.ceil(length);x=a[0]+t*dx;z=a[2]+t*dz;y=a[1]+t*(b[1]-a[1])
      for along in [-2.38,0,2.38]:
       for side in [-.53,0,.53]:
        s=surface(x+ux*along-uz*side,z+uz*along+ux*side)
        if s['top'] is not None:probes.append({**s,'base':round(y,3),'clearance':round(y-.03-s['top'],3)})
    report['candidateSweeps'].append({'route':route,'from':a,'to':b,'length':round(math.dist(a,b),3),'worst':min(probes,key=lambda p:p['clearance']),'belowMargin':sum(p['clearance']<.35 for p in probes)})
out=ROOT/'art/bridgehead/scale3-study.json';out.write_text(json.dumps(report,indent=2)+'\n')
print('MARKERS '+json.dumps(report['markers']),flush=True)
print('DESCENT '+json.dumps(report['northDescent']),flush=True)
print('LOW_CLIMB '+json.dumps(report['lowClimb']),flush=True)
print('VERTEX_TOP '+json.dumps([report['courtVertexTop'],report['extractionVertexTop']]),flush=True)
print('CANDIDATE_SWEEPS '+json.dumps(report['candidateSweeps']),flush=True)
