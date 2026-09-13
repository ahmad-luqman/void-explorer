import * as T from 'three';

export function createShip() {
  const ship=new T.Group();
  const ivory=new T.MeshStandardMaterial({color:'#ccc7b7',roughness:.69,metalness:.25,flatShading:true});
  const edge=new T.MeshStandardMaterial({color:'#252c40',roughness:.6,metalness:.55,flatShading:true});
  const glass=new T.MeshStandardMaterial({color:'#126a79',emissive:'#0a4e62',emissiveIntensity:.3,roughness:.22,metalness:.6,flatShading:true});
  const cyan=new T.MeshBasicMaterial({color:new T.Color('#73eaff').multiplyScalar(3)});
  const pink=new T.MeshBasicMaterial({color:new T.Color('#ff4ca6').multiplyScalar(3)});
  function add(geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);ship.add(m);return m;}
  const hull=add(new T.IcosahedronGeometry(1,0),ivory);hull.scale.set(1.05,.42,2.2);
  const spine=add(new T.BoxGeometry(.9,.25,2.4),ivory,0,.15,.3);spine.rotation.x=-.07;
  const canopy=add(new T.SphereGeometry(.64,8,4),glass,0,.35,-.7);canopy.scale.set(.73,.61,1.55);
  function wing(side:number,front:boolean){
    const z=front?-.65:.7;
    const verts=[side*.65,0,z-.7,side*(front?3.05:3.6),-.07,z+.65,side*.9,.02,z+.6,side*.7,.12,z-.6,side*(front?3.05:3.6),.02,z+.65,side*.9,.13,z+.6];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex([0,2,1,3,4,5,0,1,4,0,4,3,2,5,4,2,4,1]);g.computeVertexNormals();add(g,ivory);
    const light=add(new T.BoxGeometry(.09,.08,.17),pink,side*(front?3.05:3.6),0,z+.63);
    const seam=add(new T.BoxGeometry(front?2.2:2.7,.04,.055),edge,side*1.85,.08,z+.44);seam.rotation.y=side*-.04;
    return light;
  }
  const engines:T.Mesh[]=[];
  for(const side of [-1,1]){
    wing(side,true);wing(side,false);
    const nacelle=add(new T.CylinderGeometry(.44,.52,1.55,8),edge,side*.85,-.12,1);nacelle.rotation.x=Math.PI/2;
    const armor=add(new T.BoxGeometry(.65,.2,1.2),ivory,side*.85,.24,.82);armor.rotation.z=side*.12;
    const nozzle=add(new T.CylinderGeometry(.35,.39,.09,12),cyan,side*.85,-.12,1.82);nozzle.rotation.x=Math.PI/2;
    const flame=add(new T.ConeGeometry(.28,2.8,12,1,true),new T.MeshBasicMaterial({color:'#38cfff',transparent:true,opacity:.45,blending:T.AdditiveBlending,depthWrite:false}),side*.85,-.12,3.05);flame.rotation.x=Math.PI/2;engines.push(flame);
    const fin=add(new T.BoxGeometry(.1,.8,.75),ivory,side*.75,.5,.75);fin.rotation.z=side*-.17;fin.rotation.x=-.2;
  }
  add(new T.BoxGeometry(.48,.04,.08),cyan,0,.3,.2);
  const edges=new T.LineSegments(new T.EdgesGeometry(hull.geometry,25),new T.LineBasicMaterial({color:'#36394c',transparent:true,opacity:.55}));edges.scale.copy(hull.scale);ship.add(edges);
  return {ship,engines};
}
