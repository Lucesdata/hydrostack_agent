import {Reflector} from './vendor/Reflector.js';

export function addWeathering(T,{scene,camera,water,box}){
 // Several irregular puddles share a single ground-plane reflection pass.
 const vertices=[],indices=[],uvs=[];
 const puddles=[[1.45,7.07,.62,.28,1],[7.58,2.65,.4,.65,2],[6.82,4.5,.48,.23,3],[-.6,7.23,.27,.16,4]];
 function polygon(cx,cz,rx,rz,seed,scale=1){
  const points=[];for(let i=0;i<48;i++){const a=i*Math.PI*2/48;const irregular=1+.14*Math.sin(a*5+seed)+.08*Math.cos(a*9-seed);points.push([cx+Math.cos(a)*rx*irregular*scale,cz+Math.sin(a)*rz*irregular*scale]);}return points;
 }
 const dampMat=new T.MeshStandardMaterial({color:0x35413d,roughness:.5,transparent:true,opacity:.2,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 function patch(points,y,mat){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const m=new T.Mesh(new T.ShapeGeometry(shape),mat);m.rotation.x=-Math.PI/2;m.position.y=y;scene.add(m);return m;}
 for(const [x,z,rx,rz,seed] of puddles){
  const points=polygon(x,z,rx,rz,seed),offset=vertices.length/3;vertices.push(x,-z,0);uvs.push(.5,.5);
  points.forEach(([px,pz],i)=>{vertices.push(px,-pz,0);const a=i*Math.PI*2/48;uvs.push(.5+Math.cos(a)*.5,.5+Math.sin(a)*.5);});
  for(let i=0;i<48;i++)indices.push(offset,offset+1+(i+1)%48,offset+1+i);
  patch(polygon(x,z,rx,rz,seed,1.28),.073,dampMat);
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
 const puddle=new Reflector(geo,{textureWidth:512,textureHeight:512,multisample:0,color:0x84928b,clipBias:.001});puddle.rotation.x=-Math.PI/2;puddle.position.y=.08;
 puddle.material.transparent=true;puddle.material.depthWrite=false;
 puddle.material.vertexShader=puddle.material.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv;\nvarying vec2 puddleUV;').replace('void main() {','void main() {\npuddleUV=uv;');
 puddle.material.fragmentShader=puddle.material.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv;\nvarying vec2 puddleUV;').replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',`float edge=1.0-smoothstep(.36,.5,length(puddleUV-.5));
  vec3 reflected=mix(vec3(.11,.15,.14),blendOverlay(base.rgb,color),.8);
  gl_FragColor=vec4(reflected,edge*.66);`);
 const capture=puddle.onBeforeRender;
 puddle.onBeforeRender=function(renderer,sceneArg,renderCamera){
  if(renderCamera!==camera)return;
  const visible=water.visible;water.visible=false;
  try{capture.call(this,renderer,sceneArg,renderCamera);}finally{water.visible=visible;}
 };
 scene.add(puddle);
 // Rust blooms remain small and local to pipe joints and fixing points.
 const rust=new T.MeshStandardMaterial({color:0x70452d,roughness:.98,transparent:true,opacity:.46,polygonOffset:true,polygonOffsetFactor:-2});
 function rustStreak(x,y,z,w,h){const s=new T.Shape();s.moveTo(-w/2,h/2);s.lineTo(w/2,h/2);s.lineTo(w*.2,-h*.23);s.lineTo(-w*.08,-h/2);s.closePath();const m=new T.Mesh(new T.ShapeGeometry(s),rust);m.position.set(x,y,z);scene.add(m);}
 rustStreak(7.31,2.77,2.255,.035,.10);
 
 // Irregular grime along the drain approach and pipe foot, without covering grates.
 patch(polygon(7.78,2.12,.23,.39,9),.074,dampMat);
 patch(polygon(.25,7.0,.7,.35,13),.074,new T.MeshStandardMaterial({color:0x655f4e,roughness:.92,transparent:true,opacity:.09,depthWrite:false}));
 return puddle;
}
