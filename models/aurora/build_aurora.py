"""Build AURORA in a fresh background Blender process. Never touches an open user scene.
Run: Blender --background --factory-startup --python models/aurora/build_aurora.py
"""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'models/aurora'; OUT.mkdir(parents=True,exist_ok=True)
RUNTIME=ROOT/'game/public/models/aurora-v1.glb'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene; scene.name='AURORA Studio'; scene.unit_settings.system='METRIC'
parts=[]
def point(v): return (v[0]*4,-v[2]*4,v[1]*4)
def linear(hexcode):
 c=[int(hexcode[i:i+2],16)/255 for i in (1,3,5)]
 return tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c)+(1,)
def material(name,color,metal=.2,rough=.6,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=linear(color);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=linear(color);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if emission:n.inputs['Emission Color'].default_value=linear(color);n.inputs['Emission Strength'].default_value=emission
 return m
ivory=material('Ivory armor','#c9c5b7',.25,.66);light=material('Pale armor','#e4dfcc',.2,.56)
dark=material('Graphite structure','#242c40',.6,.52);trim=material('Titanium trim','#536178',.65,.4)
glass=material('Teal canopy','#08778c',.55,.2,.18);cyan=material('Cyan emission','#42dfff',.25,.25,3);pink=material('Magenta emission','#ff4099',.2,.3,2)
def mesh(name,vertices,faces,mat,category='Static',bevel=0):
 data=bpy.data.meshes.new(name);data.from_pydata([point(v) for v in vertices],[],faces);data.update()
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.data.materials.append(mat);obj['category']=category;parts.append(obj)
 if bevel:
  mod=obj.modifiers.new('Edge chamfer','BEVEL');mod.width=bevel*4;mod.segments=1
 return obj
def box(name,center,size,mat,category='Static',bevel=.015):
 x,y,z=center;a,b,c=[v/2 for v in size]
 verts=[(x+dx*a,y+dy*b,z+dz*c) for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 return mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat,category,bevel)
def loft(name,sections,mat):
 verts=[]
 for z,w,b,t in sections:
  cut=min(.085,(t-b)*.24)
  verts += [(x,y,z) for x,y in [(-w*.7,b),(w*.7,b),(w,b+cut),(w,t-cut),(w*.7,t),(-w*.7,t),(-w,t-cut),(-w,b+cut)]]
 faces=[tuple(reversed(range(8))),tuple(range(len(verts)-8,len(verts)))]
 for k in range(len(sections)-1):
  for i in range(8):faces.append((k*8+i,k*8+(i+1)%8,(k+1)*8+(i+1)%8,(k+1)*8+i))
 return mesh(name,verts,faces,mat)
def prism(name,outline,thickness,mat,category='Static',bevel=.01):
 n=len(outline);v=[(x,y-thickness/2,z) for x,y,z in outline]+[(x,y+thickness/2,z) for x,y,z in outline]
 return mesh(name,v,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat,category,bevel)
def tube(name,x,y,rings,mat,category='Static',caps=False):
 n=12 if category=='Core' else 8;v=[]
 for z,r in rings:
  v += [(x+math.cos(i/n*math.tau+math.pi/8)*r,y+math.sin(i/n*math.tau+math.pi/8)*r,z) for i in range(n)]
 f=[]
 for k in range(len(rings)-1):
  for i in range(n):f.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
 if caps:f.extend([tuple(reversed(range(n))),tuple(range(len(v)-n,len(v)))])
 return mesh(name,v,f,mat,category)
def strut(name,a,b,radius,mat,category='Static'):
 # Mesh in Blender coordinates, then map back to the authored coordinate convention.
 a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((1,0,0)))
 if u.length<.1:u=axis.cross(Vector((0,1,0)))
 u.normalize();v=axis.cross(u);verts=[]
 for p in [a,b]:
  for i in range(6):verts.append(tuple(p+(u*math.cos(i*math.tau/6)+v*math.sin(i*math.tau/6))*radius))
 return mesh(name,verts,[tuple(reversed(range(6))),tuple(range(6,12))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)],mat,category)
def plate(name,outline,normal,mat,well=False):
 # Real framed well with a lower floor. The backing stays above the underlying
 # structure; no coplanar decals, booleans, textures or extra runtime materials.
 normal=Vector(normal).normalized();outer=[Vector(v) for v in outline]
 if (outer[1]-outer[0]).cross(outer[2]-outer[0]).dot(normal)<0:outer.reverse()
 center=sum(outer,Vector())/len(outer);n=len(outer)
 back=[v-normal*.008 for v in outer]
 if well:
  inner=[v.lerp(center,.22) for v in outer]
  lower=[v-normal*.008 for v in inner]
  # The back is a ring, leaving the floor unobstructed on double-sided exports.
  mesh(name+' frame',[tuple(v) for v in outer+inner+back+lower],
   [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]+
   [(i,2*n+i,2*n+(i+1)%n,(i+1)%n) for i in range(n)]+
   [(2*n+i,3*n+i,3*n+(i+1)%n,2*n+(i+1)%n) for i in range(n)],mat)
  mesh(name+' recess wall',[tuple(v) for v in inner+lower],
   [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],trim)
  mesh(name+' recess floor',[tuple(v) for v in lower],[tuple(range(n))],dark)
 else:
  mesh(name,[tuple(v) for v in outer+back],
   [tuple(range(n)),tuple(reversed(range(n,2*n)))]+
   [(i,n+i,n+(i+1)%n,(i+1)%n) for i in range(n)],mat)
def nacelle_plates(x,y,side):
 stations=[(.4,.575),(.82,.575),(1.47,.575),(1.67,.49)]
 for section,((za,ra),(zb,rb)) in enumerate(zip(stations,stations[1:])):
  for face in range(8):
   a=face*math.tau/8+math.pi/8;b=(face+1)*math.tau/8+math.pi/8
   outline=[Vector((x+math.cos(angle)*r,y+math.sin(angle)*r,z)) for angle,r,z in [(a,ra,za),(b,ra,za),(b,rb,zb),(a,rb,zb)]]
   center=sum(outline,Vector())/4
   outline=[tuple(v.lerp(center,.07)) for v in outline]
   normal=(math.cos((a+b)/2),math.sin((a+b)/2),0)
   # Outboard lateral service wells and an upper intake are legible on foot.
   well=section==1 and face in ([0,7] if side>0 else [2,3])
   plate('Nacelle plate '+str(side)+' '+str(section)+' '+str(face),outline,normal,light if face in [0,1,2] else ivory,well)
# Layered wedge and raised cockpit.
loft('Main pressure hull',[(-2.45,.055,-.06,.06),(-1.6,.38,-.23,.24),(-.6,.7,-.32,.35),(.45,.75,-.34,.38),(1.5,.36,-.24,.2),(1.82,.08,-.15,.12)],dark)
loft('Upper ivory shell',[(-2.4,.06,.01,.1),(-1.5,.4,.05,.3),(-.5,.67,.18,.43),(.55,.68,.24,.46),(1.5,.27,.12,.29)],ivory)
loft('Nose crown',[(-2.4,.045,.06,.11),(-1.55,.16,.28,.32),(-.72,.2,.39,.44)],light)
loft('Cockpit frame',[(-1.5,.24,.24,.29),(-1.15,.38,.32,.39),(-.58,.4,.36,.43),(-.28,.28,.4,.44)],dark)
loft('Faceted canopy',[(-1.43,.22,.32,.37),(-1.12,.335,.4,.63),(-.6,.345,.44,.68),(-.33,.23,.44,.56)],glass)
strut('Canopy center rib',(0,.39,-1.4),(0,.685,-.6),.018,trim)
for side in [-1,1]:
 strut('Canopy outer frame',(.23*side,.37,-1.43),(.35*side,.68,-.6),.021,light)
 strut('Canopy rear frame',(.35*side,.68,-.6),(.23*side,.55,-.33),.023,light)
 box('Cockpit shoulder',(.53*side,.3,-.75),(.22,.2,1.08),ivory)
 box('Shoulder vent',(.555*side,.42,-.45),(.16,.015,.28),dark,bevel=.004)
 for j in range(3):box('Shoulder vent louver',(.555*side,.431,-.54+j*.09),(.135,.01,.014),trim,bevel=0)
 box('Center service cover',(.28*side,.46,.45),(.45,.035,.85),light)
 for j in range(4):box('Spine radiator',(.28*side,.485,.15+j*.12),(.29,.016,.034),dark,bevel=.002)
 # Two separated planform wings on each side. Negative space is structural.
 for front in [True,False]:
  if front:poly=[(.65,.02,-1.12),(3.0,-.035,-2.03),(2.9,-.035,-1.77),(.82,.05,-.15)];tip=(3.01*side,-.035,-1.98)
  else:poly=[(.9,.015,.27),(3.55,-.045,1.64),(3.56,-.045,1.88),(.78,.025,1.29)];tip=(3.56*side,-.045,1.83)
  poly=[(x*side,y,z) for x,y,z in poly]
  prism(('Fore' if front else 'Aft')+' wing '+str(side),poly,.12,ivory,bevel=.012)
  a,b=Vector(poly[0]),Vector(poly[1]);c,d=Vector(poly[2]),Vector(poly[3])
  panel=[tuple(a.lerp(b,.08)+Vector((0,.067,0))),tuple(a.lerp(b,.43)+Vector((0,.067,0))),tuple(d.lerp(c,.43)+Vector((0,.067,0))),tuple(d.lerp(c,.08)+Vector((0,.067,0)))]
  prism('Wing root inset',panel,.016,dark,bevel=.003)
  for fraction in [.59,.79]:strut('Wing panel joint',tuple(a.lerp(b,fraction)+Vector((0,.065,0))),tuple(d.lerp(c,fraction)+Vector((0,.065,0))),.009,trim)
  # A shallow maintenance well between the dark root and outboard skin.
  hatch=[a.lerp(b,.45).lerp(d.lerp(c,.45),.2),a.lerp(b,.55).lerp(d.lerp(c,.55),.2),a.lerp(b,.55).lerp(d.lerp(c,.55),.8),a.lerp(b,.45).lerp(d.lerp(c,.45),.8)]
  plate('Wing maintenance hatch '+str(side)+' '+str(front),[tuple(v+Vector((0,.082,0))) for v in hatch],(0,1,0),light,True)
  box('Wingtip lamp',tip,(.08,.075,.12),pink,bevel=.006)
 # Octagonal armored nacelles, recessed trim rings, separate runtime emission cores.
 x=.85*side;y=.05
 tube('Engine structural barrel',x,y,[(.1,.43),(.35,.56),(1.64,.56),(1.91,.45)],dark,caps=True)
 nacelle_plates(x,y,side)
 tube('Forward nacelle collar',x,y,[(.1,.43),(.18,.51),(.31,.51)],light)
 tube('Nozzle rim',x,y,[(1.7,.48),(1.84,.49),(1.96,.43),(1.96,.37),(1.79,.34)],trim)
 tube('Dark exhaust recess',x,y,[(1.78,.34),(1.93,.33)],dark)
 tube('EngineCore_'+('L' if side<0 else 'R'),x,y,[(1.925,.29),(1.945,.29)],cyan,'Core',True)
 tube('Inner exhaust ring',x,y,[(1.95,.29),(1.98,.3),(1.98,.24)],dark)
 box('Nacelle upper armor',(x,.45,.87),(.57,.13,.78),light,bevel=.035)
 # Swept stabilizer, extruded along X rather than a third horizontal wing.
 fin=[(side*.81,.47,.52),(side*.81,.47,1.43),(side*1.04,1.17,1.46),(side*1.04,1.17,1.04)]
 verts=[(x+dx,y,z) for dx in [-.035,.035] for x,y,z in fin]
 mesh('Vertical stabilizer '+str(side),verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],ivory,bevel=.01)
 # The rudder seam sits inside the original fin outline on the outboard face.
 f=[Vector(v)+Vector((side*.037,0,0)) for v in fin]
 seam=[f[0].lerp(f[1],.78).lerp(f[3].lerp(f[2],.78),.12),f[0].lerp(f[1],.82).lerp(f[3].lerp(f[2],.82),.12),f[0].lerp(f[1],.82).lerp(f[3].lerp(f[2],.82),.86),f[0].lerp(f[1],.78).lerp(f[3].lerp(f[2],.78),.86)]
 if (seam[1]-seam[0]).cross(seam[2]-seam[0]).dot(Vector((side,-.23/.7,0)))<0:seam.reverse()
 mesh('Rudder hinge seam '+str(side),[tuple(v) for v in seam],[(0,1,2,3)],dark)
 box('Fin heel',(side*.83,.48,.91),(.18,.1,.75),dark)
box('Dorsal cyan marker',(0,.49,.65),(.26,.027,.065),cyan)
# Contact points exactly match the existing simulation, in quarter-meter authoring units.
for name,x,z in [('Left',-.85,1),('Right',.85,1),('Nose',0,-1.3)]:
 box(name+' gear bay',(x,-.28,z),(.34,.09,.5),dark,'Gear')
 strut(name+' gear piston',(x,-.28,z-.08),(x,-.67,z),.045,trim,'Gear')
 strut(name+' gear brace',(x,-.33,z+.2),(x,-.63,z),.034,dark,'Gear')
 box(name+' landing pad',(x,-.7,z),(.35,.1,.35),ivory,'Gear',.012)
 box(name+' landing pad inset',(x,-.64,z),(.2,.016,.22),dark,'Gear',.002)
# Editable source and studio. Parts remain individually named and editable.
scene.world.color=(.025,.035,.06);scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.055,.09,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-3.02));floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(material('Studio','#111d2d',.1,.72))
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,color,size in [('Key',(15,-8,30),5200,(1,.87,.7),18),('Fill',(-20,-5,12),3900,(.38,.75,1),16),('Rim',(0,22,20),6000,(.75,.85,1),12)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size;obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;aim(obj,(0,0,0))
camdata=bpy.data.cameras.new('Presentation');cam=bpy.data.objects.new('Presentation',camdata);scene.collection.objects.link(cam);cam.location=point((5.7,3.4,7.6));aim(cam,point((0,.12,0)));camdata.type='ORTHO';camdata.ortho_scale=39;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'aurora-studio.png')
# Make the asset pleasant to open interactively.
for area in bpy.context.screen.areas if bpy.context.screen else []:
 if area.type=='VIEW_3D':area.spaces.active.region_3d.view_distance=40
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'aurora-v1.blend'))
bpy.ops.render.render(write_still=True)
# Export optimized copies only; the saved source stays fully editable.
root=bpy.data.objects.new('AURORA_VX9',None);scene.collection.objects.link(root)
gear=bpy.data.objects.new('LandingGear',None);scene.collection.objects.link(gear);gear.parent=root
exports=[root,gear];groups={}
for obj in parts:
 dup=obj.copy();dup.data=obj.data.copy();scene.collection.objects.link(dup)
 bpy.ops.object.select_all(action='DESELECT');dup.select_set(True);bpy.context.view_layer.objects.active=dup
 for modifier in list(dup.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
 category=obj['category'];dup.parent=gear if category=='Gear' else root
 if category=='Core':dup.name=obj.name+'_Runtime';exports.append(dup)
 else:groups.setdefault((category,obj.data.materials[0].name),[]).append(dup)
for (category,mat),objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for obj in objects:obj.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];
 if len(objects)>1:bpy.ops.object.join()
 combined=bpy.context.object;combined.name=category+'_'+mat.replace(' ','_');exports.append(combined)
bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT')
for obj in exports:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(RUNTIME),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
meshes=[o for o in exports if o.type=='MESH'];triangles=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
vertices=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
report={'source':'aurora-v1.blend','runtime':'game/public/models/aurora-v1.glb','blender':bpy.app.version_string,'authoring_parts':len(parts),'runtime_meshes':len(meshes),'triangles':triangles,'materials':len(set(m.name for o in meshes for m in o.data.materials)),'dimensions_m':[max(v[i] for v in vertices)-min(v[i] for v in vertices) for i in range(3)],'gear_bottom_m':-3,'glb_bytes':RUNTIME.stat().st_size}
(OUT/'asset-report.json').write_text(json.dumps(report,indent=2)+'\n');print('ASSET_REPORT',json.dumps(report))
