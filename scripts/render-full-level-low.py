"""Compare the actual all-low streaming files with the preserved authoring scene."""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root/'art/full-level/full-level.blend'))
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH':obj.hide_render=True
for path in sorted((root/'public/models/level1-stream').glob('*-lod1.glb')):
    bpy.ops.import_scene.gltf(filepath=str(path))
bpy.context.scene.render.filepath=str(root/'art/full-level/full-level-low.png')
bpy.ops.render.render(write_still=True)
