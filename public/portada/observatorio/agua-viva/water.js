import { Water } from "./vendor/Water.js";

// Real-time planar reflection, multiscale normal waves and inlet turbulence.
export function createWaterSurface(T, scene, sun) {
  const normals = new T.TextureLoader().load("./vendor/waternormals.jpg", () =>
    window.dispatchEvent(new Event("agua-viva:texture"))
  );
  normals.wrapS = normals.wrapT = T.RepeatWrapping;
  normals.anisotropy = 4;
  const water = new Water(new T.CircleGeometry(6.12, 160), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: normals,
    sunDirection: new T.Vector3(-0.45, 0.82, -0.4).normalize(),
    sunColor: 0xfff3d9,
    waterColor: 0x294c45,
    distortionScale: 0.65,
    alpha: 1,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = 2.75;
  water.receiveShadow = true;
  const material = water.material;
  material.uniforms.size.value = 9;
  material.uniforms.clarity = { value: 0 };
  material.uniforms.activity = { value: 0 };
  material.uniforms.bridgeAngle = { value: 0 };
  material.uniforms.wakeStrength = { value: 0 };
  material.uniforms.cutMode = { value: 0 };
  material.uniforms.cutDirection = { value: new T.Vector2(0, 1) };
  material.fragmentShader = material.fragmentShader
    .replace(
      "uniform float size;",
      "uniform float size;\n uniform float clarity;\n uniform float activity;\n uniform float bridgeAngle;\n uniform float wakeStrength;\n uniform float cutMode;\n uniform vec2 cutDirection;"
    )
    .replace(
      "vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );",
      `
  vec2 p = worldPosition.xz;
  // Different directions and wavelengths avoid mechanical concentric rings.
  vec2 slope=vec2(
   cos(p.x*4.1+p.y*2.7+time*1.2)*0.075+cos(p.x*9.3-p.y*6.8-time*1.7)*0.035,
   cos(p.y*4.7-p.x*1.9-time*.9)*0.07+cos(p.y*11.1+p.x*5.2+time*1.3)*0.028
  );
  vec2 inlet=p-vec2(-1.7,-4.0);
  float inletDistance=length(inlet);
  slope+=normalize(inlet+vec2(.001))*cos(inletDistance*22.0-time*11.0)*exp(-inletDistance*1.7)*.22*activity;
  float radius=length(p);
  float relativeAngle=atan(-p.x,-p.y)-bridgeAngle;
  relativeAngle=atan(sin(relativeAngle),cos(relativeAngle));
  float trail=relativeAngle+.075+.012*sin(radius*3.0-time);
  float wakeEnvelope=exp(-pow(trail/.065,2.0))*smoothstep(.85,1.4,radius)*(1.0-smoothstep(6.0,6.4,radius))*wakeStrength;
  vec2 tangent=vec2(-p.y,p.x)/max(radius,.1);
  slope+=tangent*cos(trail*110.0+radius*1.3-time*1.5)*wakeEnvelope*.12;
  vec3 surfaceNormal=normalize(vec3(noise.x*.7+slope.x, max(.65,noise.z),noise.y*.7+slope.y));
 `
    )
    .replace(
      "vec4 noise = getNoise( worldPosition.xz * size );",
      "if(cutMode>.5 && dot(worldPosition.xz,cutDirection)>.25) discard; vec4 noise = getNoise( worldPosition.xz * size );"
    )
    .replace("float rf0 = 0.3;", "float rf0 = 0.075;")
    .replace(
      "vec3 outgoingLight = albedo;",
      `
  // Deep water absorbs light, while grazing angles preserve reflected structures.
  float edgeDistance=6.12-length(p);
  float bank=exp(-max(edgeDistance,0.0)*5.0);
  vec3 sky=vec3(.10,.23,.27);
  vec3 depthColor=mix(waterColor,waterColor*1.35,bank*.35);
  vec3 body=depthColor*(.52+diffuseLight*.4);
  vec3 reflected=mix(sky,reflectionSample,.9);
  float fresnel=.16+.72*pow(1.0-theta,3.0);
  vec3 outgoingLight=mix(body,reflected,clamp(fresnel,0.0,.9));
  outgoingLight+=specularLight*.085;
  outgoingLight*=mix(.72,1.0,getShadowMask());
  // Soft, irregular aeration near the inlet rather than drawn rings.
  float foamNoise=sin(p.x*91.0+sin(p.y*61.0+time*3.0))*sin(p.y*73.0-time*2.0);
  float foam=pow(max(foamNoise,0.0),5.0)*exp(-inletDistance*3.0)*activity;
  outgoingLight=mix(outgoingLight,vec3(.65,.85,.80),foam*.6);
  float wakeCrest=pow(max(sin(trail*95.0+radius*1.5-time),0.0),8.0)*wakeEnvelope;
  outgoingLight=mix(outgoingLight,vec3(.35,.52,.49),wakeCrest*.13);

 `
    );
  scene.add(water);
  // Small soft spray droplets and aeration flecks, all tied to simulation time.
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, "rgba(224,255,249,.9)");
  gradient.addColorStop(0.28, "rgba(200,245,239,.5)");
  gradient.addColorStop(1, "rgba(170,230,230,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const sprite = new T.CanvasTexture(canvas);
  const count = 190,
    positions = new Float32Array(count * 3);
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(positions, 3));
  const foam = new T.Points(
    geo,
    new T.PointsMaterial({
      map: sprite,
      color: 0xc2ebe4,
      size: 0.11,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
  );
  scene.add(foam);
  const dirty = new T.Color(0x344b39),
    clean = new T.Color(0x076475);
  function update(time, clarity, running) {
    material.uniforms.time.value = time * 0.6;
    material.uniforms.bridgeAngle.value = time * 0.026;
    material.uniforms.wakeStrength.value = Math.min(time / 5, 1);
    material.uniforms.clarity.value = clarity;
    material.uniforms.waterColor.value.copy(dirty).lerp(clean, clarity);
    material.uniforms.activity.value = running ? 1 : 0;
    foam.visible = running;
    for (let i = 0; i < count; i++) {
      const phase = (time * 0.48 + i * 0.61803398875) % 1;
      const angle = i * 2.39996 + time * 0.12;
      const radius = 0.08 + phase * 0.72;
      positions[i * 3] = -1.7 + Math.cos(angle) * radius;
      positions[i * 3 + 2] = -4 + Math.sin(angle) * radius;
      positions[i * 3 + 1] =
        2.78 + (i % 5 === 0 ? Math.sin(phase * Math.PI) * 0.25 : 0.012 * Math.sin(angle * 3));
    }
    geo.attributes.position.needsUpdate = true;
  }
  update(0, 0, false);
  return {
    water,
    update,
    setCutaway: (enabled, x, z) => {
      material.uniforms.cutMode.value = enabled ? 1 : 0;
      material.uniforms.cutDirection.value.set(x, z);
    },
  };
}
