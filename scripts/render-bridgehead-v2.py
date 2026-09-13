"""Render fixed pose reviews of the authored v2 scene without rewriting its GLB."""
import bpy, json, math, hashlib, sys
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art/bridgehead'
D=json.loads((OUT/'bridgehead-v2-layout.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(OUT/'bridgehead-v2.blend'))
scene=bpy.context.scene
contract_text=(OUT/'bridgehead-v2-layout.json').read_text()
embedded=bpy.data.texts.get('bridgehead-v2-layout.json') or bpy.data.texts.new('bridgehead-v2-layout.json')
embedded.clear()
embedded.write(contract_text)
scene['layout_source']='art/bridgehead/bridgehead-v2-layout.json'
scene['layout_sha256']=hashlib.sha256((OUT/'bridgehead-v2-layout.json').read_bytes()).hexdigest()
scene['warden_health']=D['combat']['health']
verification=json.loads((OUT/'verification.json').read_text(encoding='utf-8-sig'))
verification['layoutSha256']=scene['layout_sha256']
verification['combat']=D['combat']
(OUT/'verification.json').write_text(json.dumps(verification,indent=2)+'\n',encoding='utf-8')
if '--contract-only' in sys.argv:
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bridgehead-v2.blend'))
    print('V2_EMBEDDED_CONTRACT_SYNCED',flush=True)
    sys.exit(0)
cam=scene.camera
cam.data.type='PERSP'
cam.data.sensor_fit='VERTICAL'
cam.data.sensor_height=24
cam.data.lens=12/math.tan(math.radians(D['camera']['fov']/2))
cam.data.clip_start=.1
cam.data.clip_end=500
player=bpy.data.objects['PLAYER_BASE_ORIGIN']
warden=bpy.data.objects['WARDEN_IDLE_POSED']

def V(g):
    return Vector((g['x'],-g['z'],g['y'])) if isinstance(g,dict) else Vector((g[0],-g[2],g[1]))

def pose(root,p,target,skinned=False):
    # glTF +Z points toward Blender -Y. Positive Blender Z rotation points +X.
    root.rotation_euler.z=math.atan2(target['x']-p['x'],target['z']-p['z'])
    root.location=(0,0,0)
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    points=[]
    for obj in root.children_recursive:
        if obj.type!='MESH':continue
        if skinned:
            evaluated=obj.evaluated_get(deps)
            mesh=evaluated.to_mesh()
            points.extend(evaluated.matrix_world@v.co for v in mesh.vertices)
            evaluated.to_mesh_clear()
        else:
            points.extend(obj.matrix_world@Vector(c) for c in obj.bound_box)
    lo=Vector([min(q[i] for q in points) for i in range(3)])
    hi=Vector([max(q[i] for q in points) for i in range(3)])
    root.location=V(p)-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    bpy.context.view_layer.update()

views=[
    ('launch',D['start'],D['gates'][1]['position']),
    ('fork',{'x':-45,'y':1,'z':12},D['highApproach']['position']),
    ('high-descent',D['highDescent']['position'],D['gates'][0]['position']),
    ('low-bridge',{'x':0,'y':-8.2,'z':32.1},D['lowClimb']['position']),
    ('low-turn',D['lowClimb']['position'],{'x':30,'y':-1,'z':6}),
    ('high-court',D['approaches'][0]['position'],{'x':69,'y':2.55,'z':-27}),
    ('low-cover',D['approaches'][1]['position'],{'x':69,'y':2.55,'z':-27}),
    ('low-peek',D['lowPeek'],{'x':69,'y':2.55,'z':-27}),
    ('exit',{'x':80,'y':7.8,'z':-39},D['extraction']),
]
receipt=[]
for name,p,target in views:
    forward=Vector((target['x']-p['x'],0,target['z']-p['z'])).normalized()
    right=Vector((-forward.z,0,forward.x))
    eye=Vector((p['x'],p['y']+D['camera']['height'],p['z']))-forward*D['camera']['distance']+right*D['camera']['shoulder']
    cam.location=V(eye)
    cam.rotation_euler=(V(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    pose(player,p,target)
    pose(warden,D['warden'],p,True)
    scene.render.filepath=str(OUT/('v2-'+name+'.png'))
    bpy.ops.render.render(write_still=True)
    receipt.append({'name':name,'player':p,'target':target,'camera':list(eye),'verticalFov':D['camera']['fov'],'shoulder':D['camera']['shoulder'],'kind':'posed offline Blender composition; yaw corrected; Warden faces player'})
cam.location=V((165,110,140))
cam.rotation_euler=(V((10,0,-5))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO'
cam.data.ortho_scale=245
scene.render.filepath=str(OUT/'v2-overview.png')
bpy.ops.render.render(write_still=True)
(OUT/'v2-cameras.json').write_text(json.dumps(receipt,indent=2)+'\n')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bridgehead-v2.blend'))
print('V2_REVIEW_POSES_CORRECTED',flush=True)
