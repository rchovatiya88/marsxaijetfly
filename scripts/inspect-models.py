"""Blender background source inspection; originals are never saved or modified."""
import bpy, json, sys, hashlib, math
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
out = root / 'art' / 'inspection'
out.mkdir(parents=True, exist_ok=True)
reports = []
names = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['level1', 'level1_navmesh', 'enemy', 'avi', 'jetbickavi', 'gun']
for name in names:
    source = root / 'public' / 'models' / (name + '.glb')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    report = {'source': str(source.relative_to(root)), 'bytes': source.stat().st_size,
              'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'blender': bpy.app.version_string}
    try:
        bpy.ops.import_scene.gltf(filepath=str(source))
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        points = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
        lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
        hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
        center, size = (lo + hi) / 2, max(hi - lo)
        report.update(objects=len(bpy.context.scene.objects), meshes=len(meshes),
                      triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),
                      bounds={'min': list(lo), 'max': list(hi)},
                      materials=[m.name for m in bpy.data.materials],
                      animations=[a.name for a in bpy.data.actions],
                      images=[{'name': im.name, 'size': list(im.size)} for im in bpy.data.images])
        scene = bpy.context.scene
        scene.render.engine = 'CYCLES'
        scene.cycles.samples = 12
        scene.cycles.use_denoising = True
        scene.render.resolution_x, scene.render.resolution_y = 960, 720
        scene.render.resolution_percentage = 100
        scene.world = bpy.data.worlds.new('Inspection world')
        scene.world.use_nodes = True
        scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.28, .32, .4, 1)
        scene.world.node_tree.nodes['Background'].inputs[1].default_value = .7
        bpy.ops.object.light_add(type='SUN', location=center + Vector((size, -size, size)))
        bpy.context.object.rotation_euler = (.4, -.5, -.4)
        bpy.context.object.data.energy = 2
        bpy.ops.object.camera_add(location=center + Vector((1, -1.4, 1.0)).normalized() * size * 1.8)
        camera = bpy.context.object
        camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = size * 1.35
        camera.data.clip_end = size * 10 + 100
        scene.camera = camera
        scene.render.filepath = str(out / (name + '.png'))
        bpy.ops.render.render(write_still=True)
        report['render'] = 'art/inspection/' + name + '.png'
        report['status'] = 'imported-and-rendered'
    except Exception as exc:
        report.update(status='failed', error=str(exc))
    reports.append(report)
    (out / (name + '.json')).write_text(json.dumps(report, indent=2), encoding='utf8')
    print('MODEL_REPORT ' + json.dumps(report), flush=True)
