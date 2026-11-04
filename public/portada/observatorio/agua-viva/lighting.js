export function addLighting(T, { scene, box, rod, mesh, dark }) {
  const housing = new T.MeshStandardMaterial({ color: 0x35464b, metalness: 0.7, roughness: 0.38 });
  const metal = new T.MeshStandardMaterial({ color: 0x8a989b, metalness: 0.8, roughness: 0.32 });
  const lens = new T.MeshStandardMaterial({
    color: 0xffefd4,
    emissive: 0xffe4b5,
    emissiveIntensity: 3,
    roughness: 0.18,
  });
  function floodlight(x, y, z, target) {
    const root = new T.Group();
    root.position.set(x, y, z);
    scene.add(root);
    const lamp = new T.Group();
    root.add(lamp);
    lamp.lookAt(new T.Vector3(...target));
    box(0, 0, 0, 0.53, 0.3, 0.16, housing, lamp);
    box(0, 0, 0.095, 0.45, 0.23, 0.035, metal, lamp);
    box(0, 0, 0.12, 0.4, 0.18, 0.018, lens, lamp);
    for (let i = 0; i < 6; i++) box(-0.21 + i * 0.084, 0, -0.105, 0.016, 0.26, 0.08, housing, lamp);
    for (let side of [-1, 1]) {
      box(side * 0.29, -0.06, 0, 0.035, 0.3, 0.08, metal, root);
      const bolt = mesh(new T.CylinderGeometry(0.035, 0.035, 0.05, 6), metal, lamp);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.x = side * 0.28;
    }
    const light = new T.SpotLight(0xffe7c5, 220, 22, Math.PI / 4, 0.65, 1.6);
    light.position.set(x, y, z);
    light.target.position.set(...target);
    scene.add(light, light.target);
  }
  // Two anchored twin-head light poles illuminate the tank and walkways.
  for (const [x, z] of [
    [-7.65, -1.8],
    [7.65, -3.4],
  ]) {
    box(x, 0.17, z, 0.62, 0.25, 0.62, dark);
    box(x, 0.315, z, 0.4, 0.055, 0.4, metal);
    rod([x, 0.34, z], [x, 7.4, z], 0.065, housing);
    for (let dx of [-0.14, 0.14])
      for (let dz of [-0.14, 0.14]) {
        const bolt = mesh(new T.CylinderGeometry(0.027, 0.027, 0.045, 6), metal);
        bolt.position.set(x + dx, 0.37, z + dz);
      }
    rod([x - 0.65, 7.35, z], [x + 0.65, 7.35, z], 0.045, housing);
    floodlight(x - 0.57, 7.4, z, [x * 0.2, 2.7, z + 1.8]);
    floodlight(x + 0.57, 7.4, z, [x * 0.55, 1.2, z + 4]);
    box(x, 0.9, z, 0.19, 0.35, 0.12, housing);
    rod([x, 0.4, z + 0.08], [x, 1.1, z + 0.08], 0.014, metal);
  }
  // Mounted floodlight over the main control-room door.
  rod([1.05, 5.35, -6.74], [1.05, 5.35, -6.42], 0.025, metal);
  floodlight(1.05, 5.36, -6.4, [0, 3.4, -4.8]);
}
