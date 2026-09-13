"""Create a reversible material-repaired hero candidate; never overwrite source."""
import bpy, json, hashlib
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / 'art' / 'staging'
out.mkdir(parents=True, exist_ok=True)
source = root / 'public/models/jetbickavi.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
repairs = []
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    for node in list(material.node_tree.nodes):
        if node.type == 'TEX_IMAGE' and node.image and (node.image.size[0] == 0 or node.image.size[1] == 0):
            repairs.append({'material': material.name, 'missing_image': node.image.name})
            material.node_tree.nodes.remove(node)
    for node in material.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            if not node.inputs['Base Color'].is_linked:
                node.inputs['Base Color'].default_value = (.22, .085, .035, 1)
            node.inputs['Roughness'].default_value = .65
            if not node.inputs['Emission Color'].is_linked:
                node.inputs['Emission Color'].default_value = (0, 0, 0, 1)
                node.inputs['Emission Strength'].default_value = 0
for im in bpy.data.images:
    if max(im.size) > 1024:
        ratio = 1024 / max(im.size)
        im.scale(max(1, int(im.size[0] * ratio)), max(1, int(im.size[1] * ratio)))
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'jetbike-material-study.blend'))
target = out / 'jetbike-material-study.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', export_yup=True, export_animations=True)
report = {'source': str(source.relative_to(root)), 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'output': str(target.relative_to(root)), 'output_sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
          'bytes': target.stat().st_size, 'blender': bpy.app.version_string, 'repairs': repairs,
          'status': 'material replacement study; not recovered original textures; not runtime admitted',
          'license': 'source provenance unverified; local inspection only'}
(out / 'jetbike-material-study.json').write_text(json.dumps(report, indent=2), encoding='utf8')
print(json.dumps(report))
