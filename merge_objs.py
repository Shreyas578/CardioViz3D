import os
import trimesh

obj_dir = r"d:\Projects\Heart\BP51782_FMA3_2_1_inference_isa_FMA67135_Postnatal_anatomical_structure"
output_path = r"d:\Projects\Heart\cardio-viz-3d\frontend\public\models\heart.glb"

print("Loading OBJ files into a scene...")
scene = trimesh.Scene()

count = 0
for filename in os.listdir(obj_dir):
    if filename.endswith(".obj"):
        filepath = os.path.join(obj_dir, filename)
        try:
            mesh = trimesh.load(filepath, force='mesh')
            
            # Ensure the mesh has a name derived from the filename
            mesh_name = os.path.splitext(filename)[0]
            mesh.metadata['name'] = mesh_name
            
            # Add to scene
            scene.add_geometry(mesh, node_name=mesh_name, geom_name=mesh_name)
            count += 1
        except Exception as e:
            print(f"Failed to load {filename}: {e}")

if count > 0:
    print(f"Loaded {count} meshes into scene.")
    print(f"Exporting to {output_path}...")
    scene.export(output_path)
    print("Done!")
else:
    print("No meshes found or loaded.")
