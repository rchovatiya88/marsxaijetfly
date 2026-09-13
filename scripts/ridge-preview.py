"""Preview-only scene corrections; never writes runtime shell or collision data."""
import bpy, math
from pathlib import Path
from mathutils import Vector

def configure_preview():
    collection=bpy.data.collections['ACTORS_PREVIEW']
    for root_name,clip,height,anchor in [
        ('PLAYER_PREVIEW','ArmatureAction.001',2.2,Vector((0,-12,3))),
        ('WARDEN_PREVIEW','Baka_Idle',2.15,Vector((0,30,0))),
    ]:
        root=bpy.data.objects[root_name]
        descendants=list(root.children_recursive)
        for obj in descendants:
            if obj.type=='ARMATURE':
                obj.animation_data_create()
                for track in obj.animation_data.nla_tracks:track.mute=True
                action=bpy.data.actions[clip]
                obj.animation_data.action=action
                obj.animation_data.action_slot=action.slots[0]
        bpy.context.scene.frame_set(1)
        bpy.context.view_layer.update()
        def bounds():
            deps=bpy.context.evaluated_depsgraph_get()
            pts=[o.evaluated_get(deps).matrix_world@Vector(c)
                 for o in descendants if o.type=='MESH' for c in o.evaluated_get(deps).bound_box]
            return Vector([min(p[i] for p in pts) for i in range(3)]),Vector([max(p[i] for p in pts) for i in range(3)])
        lo,hi=bounds();root.scale*=height/(hi.z-lo.z);bpy.context.view_layer.update()
        lo,hi=bounds();root.location+=anchor-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    for name,radius,color in [('high_gate',2.8,'Route / cyan'),('low_gate',2.8,'Route / amber'),('extraction',4,'Route / cyan')]:
        old=bpy.data.objects.get('PREVIEW_'+name)
        if old:bpy.data.objects.remove(old,do_unlink=True)
        bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=.11,major_segments=48,minor_segments=8,
            location=bpy.data.objects[name].location,rotation=(math.pi/2,0,0))
        obj=bpy.context.object
        for c in list(obj.users_collection):c.objects.unlink(obj)
        collection.objects.link(obj);obj.name='PREVIEW_'+name
        obj.data.materials.append(bpy.data.materials[color]);obj['purpose']='Preview only; runtime owns mission rings'
    bpy.ops.object.select_all(action='DESELECT')

if __name__=='__main__':
    configure_preview()
    root=Path(__file__).resolve().parents[1]
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/ridge-run/ridge-run.blend'))
    bpy.context.scene.render.filepath=str(root/'art/ridge-run/ridge-run-scene.png')
    bpy.ops.render.render(write_still=True)
