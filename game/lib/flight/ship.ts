import * as T from 'three';

export function createShip() {
  const ship = new T.Group();
  const ivory = new T.MeshStandardMaterial({
    color: '#ccc7b7',
    roughness: 0.69,
    metalness: 0.25,
    flatShading: true,
  });
  const edge = new T.MeshStandardMaterial({
    color: '#252c40',
    roughness: 0.6,
    metalness: 0.55,
    flatShading: true,
  });
  const glass = new T.MeshStandardMaterial({
    color: '#126a79',
    emissive: '#0a4e62',
    emissiveIntensity: 0.3,
    roughness: 0.22,
    metalness: 0.6,
    flatShading: true,
  });
  const cyan = new T.MeshBasicMaterial({
    color: new T.Color('#32ccef').multiplyScalar(1.25),
  });
  const pink = new T.MeshBasicMaterial({
    color: new T.Color('#ff4ca6').multiplyScalar(1.4),
  });
  function add(
    geometry: T.BufferGeometry,
    material: T.Material,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    ship.add(m);
    return m;
  }
  const hull = add(new T.IcosahedronGeometry(1, 0), ivory);
  hull.scale.set(1.05, 0.42, 2.2);
  const spine = add(new T.BoxGeometry(0.9, 0.25, 2.4), ivory, 0, 0.15, 0.3);
  spine.rotation.x = -0.07;
  const canopy = add(new T.SphereGeometry(0.64, 8, 4), glass, 0, 0.35, -0.7);
  canopy.scale.set(0.73, 0.61, 1.55);
  function wing(side: number, front: boolean) {
    const z = front ? -0.65 : 0.7;
    const verts = [
      side * 0.65,
      0,
      z - 0.7,
      side * (front ? 3.05 : 3.6),
      -0.07,
      z + 0.65,
      side * 0.9,
      0.02,
      z + 0.6,
      side * 0.7,
      0.12,
      z - 0.6,
      side * (front ? 3.05 : 3.6),
      0.02,
      z + 0.65,
      side * 0.9,
      0.13,
      z + 0.6,
    ];
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
    g.setIndex([0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 2, 5, 4, 2, 4, 1]);
    g.computeVertexNormals();
    add(g, ivory);
    const light = add(
      new T.BoxGeometry(0.09, 0.08, 0.17),
      pink,
      side * (front ? 3.05 : 3.6),
      0,
      z + 0.63,
    );
    const seam = add(
      new T.BoxGeometry(front ? 2.2 : 2.7, 0.04, 0.055),
      edge,
      side * 1.85,
      0.08,
      z + 0.44,
    );
    seam.rotation.y = side * -0.04;
    return light;
  }
  const engines: T.Mesh[] = [];
  for (const side of [-1, 1]) {
    wing(side, true);
    wing(side, false);
    const nacelle = add(
      new T.CylinderGeometry(0.44, 0.52, 1.55, 8),
      edge,
      side * 0.85,
      -0.12,
      1,
    );
    nacelle.rotation.x = Math.PI / 2;
    const armor = add(
      new T.BoxGeometry(0.65, 0.2, 1.2),
      ivory,
      side * 0.85,
      0.24,
      0.82,
    );
    armor.rotation.z = side * 0.12;
    const nozzle = add(
      new T.CylinderGeometry(0.35, 0.39, 0.09, 12),
      cyan,
      side * 0.85,
      -0.12,
      1.82,
    );
    nozzle.rotation.x = Math.PI / 2;
    const flame = add(
      new T.ConeGeometry(0.28, 2.8, 12, 1, true),
      new T.MeshBasicMaterial({
        color: '#38cfff',
        transparent: true,
        opacity: 0.45,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
      side * 0.85,
      -0.12,
      3.05,
    );
    flame.rotation.x = Math.PI / 2;
    engines.push(flame);
    const fin = add(
      new T.BoxGeometry(0.1, 0.8, 0.75),
      ivory,
      side * 0.75,
      0.5,
      0.75,
    );
    fin.rotation.z = side * -0.17;
    fin.rotation.x = -0.2;
  }
  add(new T.BoxGeometry(0.48, 0.04, 0.08), cyan, 0, 0.3, 0.2);
  const edges = new T.LineSegments(
    new T.EdgesGeometry(hull.geometry, 25),
    new T.LineBasicMaterial({
      color: '#36394c',
      transparent: true,
      opacity: 0.55,
    }),
  );
  edges.scale.copy(hull.scale);
  ship.add(edges);
  const gear = new T.Group();
  for (const [x, z] of [
    [-0.85, 1],
    [0.85, 1],
    [0, -1.3],
  ]) {
    const strut = new T.Mesh(
      new T.CylinderGeometry(0.045, 0.065, 0.5, 6),
      edge,
    );
    strut.position.set(x, -0.45, z);
    gear.add(strut);
    const foot = new T.Mesh(new T.BoxGeometry(0.35, 0.1, 0.35), ivory);
    foot.position.set(x, -0.7, z);
    gear.add(foot);
  }
  gear.visible = false;
  ship.add(gear);
  return { ship, engines, gear };
}
