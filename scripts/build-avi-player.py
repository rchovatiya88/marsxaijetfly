"""User-approved AVI + standalone jetbike assembly. Sources never overwritten."""
import bpy, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix
root=Path(__file__).resolve().parents[1]
out=root/'art/player';out.mkdir(parents=True,exist_ok=True)
bike=Path('C:/Users/roncho/Documents/OrnaLabs/MarsX/Models/jetbick.glb')
fighter=root/'public/models/avi.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(bike))
bike_meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('SM_Veh_Hover_Bike')]
bike_anchor=Vector((0,0,.25))
for o in bike_meshes:
    inv=o.matrix_world.inverted()
    for v in o.data.vertices:
        w=o.matrix_world@v.co
        w=bike_anchor+Vector(((w.x-bike_anchor.x)*1.28,(w.y-bike_anchor.y)*1.45,(w.z-bike_anchor.z)*1.08))
        v.co=inv@w
    o.data.update()
bpy.ops.import_scene.gltf(filepath=str(fighter))
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
arm.animation_data_clear()
for b in arm.pose.bones:b.matrix_basis=Matrix.Identity(4)
for o in list(bpy.context.scene.objects):
    if o.name=='Icosphere' or o.type=='EMPTY':bpy.data.objects.remove(o,do_unlink=True)
bpy.context.view_layer.update()
def bone(n):return arm.pose.bones['Scifi_city:'+n]
def head(n):return arm.matrix_world@bone(n).head
arm.location+=Vector((0,.50,.50))-head('Hips')
bpy.context.view_layer.update()
def point(n,child,target):
    b=bone(n);p=head(n);direction=head(child)-p
    q=direction.rotation_difference(Vector(target)-p)
    b.matrix=arm.matrix_world.inverted()@Matrix.Translation(p)@q.to_matrix().to_4x4()@Matrix.Translation(-p)@arm.matrix_world@b.matrix
    bpy.context.view_layer.update()
def chain(a,b,c,target,pole):
    p=head(a);t=Vector(target);v=t-p;d=v.length;v.normalize()
    l1=(head(b)-p).length;l2=(head(c)-head(b)).length
    d=min(d,l1+l2-.0001)
    x=(l1*l1-l2*l2+d*d)/(2*d)
    bend=Vector(pole)-p;bend-=v*bend.dot(v);bend.normalize()
    elbow=p+v*x+bend*max(0,l1*l1-x*x)**.5
    point(a,b,elbow);point(b,c,target)
point('Spine','Spine1',(0,.28,.76))
for side,s in [('Left',1),('Right',-1)]:
    chain(side+'UpLeg',side+'Leg',side+'Foot',(s*.40,.17,-.17),(s*.6,-.55,.42))
    point(side+'Foot',side+'ToeBase',(s*.40,-.26,-.26))
    chain(side+'Arm',side+'ForeArm',side+'Hand',(s*.59,-.29,.61),(s*.74,-.02,.78))
    point(side+'Hand',side+'HandIndex1',(s*.55,-.57,.58))
# Keep functional source colors; lower oversized maps for a browser player asset.
for im in bpy.data.images:
    assert all(im.size), 'Undecodable image '+im.name
    if max(im.size)>1024:
        r=1024/max(im.size);im.scale(round(im.size[0]*r),round(im.size[1]*r))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
scene=bpy.context.scene
scene.world=bpy.data.worlds.new('Player studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.20,.27,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.light_add(type='AREA',location=(3,-4,6));bpy.context.object.data.energy=900;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=5
bpy.context.object.rotation_euler=(Vector((0,0,.4))-bpy.context.object.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4,-5,2.8));cam=bpy.context.object
cam.rotation_euler=(Vector((0,-.3,.3))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=5.2;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=850;scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(out/'avi-jetbike.blend'))
scene.render.filepath=str(out/'avi-jetbike.png');bpy.ops.render.render(write_still=True)
# Bake only the seated deformation into runtime meshes; editable rig stays in .blend.
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.convert(target='MESH')
target=root/'public/models/avi-jetbike.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
report={'sources':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [bike,fighter]],'output':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'license':'source rights unverified','pose':'static seated deformation; editable rig preserved in Blender','textures':[{'name':im.name,'size':list(im.size)} for im in bpy.data.images]}
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(target))
report['reimport_meshes']=sum(o.type=='MESH' for o in bpy.context.scene.objects)
report['reimport_images_valid']=all(all(im.size) for im in bpy.data.images)
(out/'avi-jetbike.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
