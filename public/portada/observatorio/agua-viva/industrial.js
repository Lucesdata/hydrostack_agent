import {concreteMaterial} from './concrete.js';

export function paintedMetal(T,color){
 const m=new T.MeshStandardMaterial({color,roughness:.43,metalness:.55});
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPaint;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPaint=position;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPaint;\nfloat paintHash(vec3 p){return fract(sin(dot(floor(p),vec3(127.1,311.7,74.7)))*43758.5453);}')
  .replace('#include <color_fragment>',`#include <color_fragment>
   float paintGrain=paintHash(vPaint*240.0);
   float chips=step(.978,paintHash(vPaint*65.0));
   diffuseColor.rgb*=.94+paintGrain*.12;
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.20,.19),chips*.35);
  `);
 };return m;
}

export function slabMaterial(T,roof=false){
 const m=concreteMaterial(T,{panels:false,color:roof?0x666f70:0x7b817d});
 const base=m.onBeforeCompile;
 m.onBeforeCompile=s=>{base(s);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec2 slabUV=vConcreteWorld.xz;
  vec2 slabCell=fract(slabUV/${roof?'0.85':'1.5'});
  vec2 slabEdge=min(slabCell,1.0-slabCell);
  float slabJoint=1.0-smoothstep(.003,.012+fwidth(slabUV.x)*.4,min(slabEdge.x,slabEdge.y));
  diffuseColor.rgb*=1.0-slabJoint*${roof?'.36':'.48'};
  diffuseColor.rgb*=.92+wallHash(floor(slabUV/${roof?'0.85':'1.5'}))*.16;
 `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
  float dampPatch=smoothstep(.55,.8,wallFbm(vConcreteWorld.xz*1.1));
  roughnessFactor=mix(roughnessFactor,.32,dampPatch*.7);
 `);};m.customProgramCacheKey=()=>`slab-v2-${roof}`;return m;
}

export function addIndustrialDetails(T,{scene,renderer,bridge,blue,yellow,dark,concrete,box,rod,mesh}){
 // Soft surrounding light cards give steel, paint and damp paving real reflections.
 const environmentScene=new T.Scene();environmentScene.background=new T.Color(0x263b46);
 for(const [position,size,color] of [
  [[-5,6,3],[.1,9,7],0xa6c5cb],[[3,8,-5],[8,.1,6],0xe2e2cd],[[5,3,-4],[.1,5,5],0x3a6470]
 ]){const lightCard=new T.Mesh(new T.BoxGeometry(...size),new T.MeshBasicMaterial({color}));lightCard.position.set(...position);environmentScene.add(lightCard);}
 const pmrem=new T.PMREMGenerator(renderer);const environmentTarget=pmrem.fromScene(environmentScene,.02);
 scene.environment=environmentTarget.texture;scene.environmentIntensity=.42;pmrem.dispose();
 environmentScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 const steel=new T.MeshStandardMaterial({color:0x939c9c,metalness:.8,roughness:.32});
 steel.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSteelLocal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSteelLocal=position;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSteelLocal;')
   .replace('#include <color_fragment>',`#include <color_fragment>
    float oxidation=fract(sin(dot(floor(vSteelLocal*19.0),vec3(47.1,113.7,83.3)))*23817.1);
    float oxidized=smoothstep(.85,.98,oxidation)*.25;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.095,.042),oxidized);
   `);
 };
 const gasket=new T.MeshStandardMaterial({color:0x1b2325,roughness:.9});
 const red=paintedMetal(T,0xa83a25),roof=slabMaterial(T,true);
 const batches=new Map(),temp=new T.Object3D(),up=new T.Vector3(0,1,0);
 const unitCylinder=new T.CylinderGeometry(1,1,1,12),hex=new T.CylinderGeometry(1,1,1,6),cube=new T.BoxGeometry(1,1,1);
 function instance(geo,mat,pos,scale,axis=[0,1,0],parent=scene){
  let key=geo.uuid+mat.uuid+parent.uuid;
  if(!batches.has(key))batches.set(key,{geo,mat,parent,items:[]});
  temp.position.set(...pos);temp.scale.set(...scale);temp.quaternion.setFromUnitVectors(up,new T.Vector3(...axis).normalize());temp.updateMatrix();batches.get(key).items.push(temp.matrix.clone());
 }
 function bolt(pos,axis=[0,1,0],size=.025,parent=scene){
  const v=new T.Vector3(...axis).normalize(),p=new T.Vector3(...pos);
  instance(unitCylinder,steel,p.toArray(),[size*1.5,size*.28,size*1.5],axis,parent);
  instance(hex,steel,p.addScaledVector(v,size*.6).toArray(),[size,size,size],axis,parent);
  instance(unitCylinder,steel,p.addScaledVector(v,size*.65).toArray(),[size*.5,size*.4,size*.5],axis,parent);
 }
 function disk(p,r,h,mat,axis=[0,1,0],parent=scene){instance(unitCylinder,mat,p,[r,h,r],axis,parent);}
 function flange(p,axis=[0,1,0],radius=.27,parent=scene){
  const group=new T.Group();group.position.set(...p);group.quaternion.setFromUnitVectors(up,new T.Vector3(...axis).normalize());parent.add(group);
  disk([0,-.055,0],radius,.07,blue,[0,1,0],group);disk([0,.055,0],radius,.07,blue,[0,1,0],group);disk([0,0,0],radius*.98,.025,gasket,[0,1,0],group);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*radius*.79,z=Math.sin(a)*radius*.79;disk([x,0,z],.012,.22,steel,[0,1,0],group);bolt([x,.1,z],[0,1,0],.025,group);bolt([x,-.1,z],[0,-1,0],.025,group);}
  return group;
 }
 function valve(p,axis=[0,1,0],scale=1){
  const g=new T.Group();g.position.set(...p);g.scale.setScalar(scale);g.quaternion.setFromUnitVectors(up,new T.Vector3(...axis).normalize());scene.add(g);
  const body=mesh(new T.SphereGeometry(.255,16,12),blue,g);body.scale.y=1.3;
  flange([0,-.32,0],[0,1,0],.28,g);flange([0,.32,0],[0,1,0],.28,g);
  rod([0,0,.2],[0,0,.6],.07,blue,g);rod([0,0,.5],[0,0,.84],.032,steel,g);
  const wheel=mesh(new T.TorusGeometry(.29,.032,8,32),red,g);wheel.position.set(0,0,.84);
  disk([0,0,.84],.07,.08,steel,[0,0,1],g);
  for(let i=0;i<5;i++){let a=i*Math.PI*2/5;rod([0,0,.84],[Math.cos(a)*.27,Math.sin(a)*.27,.84],.018,red,g);}
  const plate=box(.16,.04,.23,.12,.18,.025,steel,g);plate.rotation.y=.15;
 }
 // Pipe joints, valves, inspection caps and anchoring saddles.
 for(let p of [[-5,6,-4],[-3.3,6,-4]])flange(p,[1,0,0]);
 flange([-6,4.25,-4]);flange([-1.7,3.9,-4]);
 valve([-6,1.75,-4]);valve([7.3,2.8,2],[1,0,0],.85);
 flange([8.2,1.2,2],[0,1,0],.23);
 for(let y of [.65,3.45,4.9]){disk([-6,y,-4],.193,.13,steel);box(-6,y,-4.25,.13,.16,.43,dark);bolt([-5.85,y,-4.1],[1,0,0]);}
 for(let y of [.7,2.1]){disk([8.2,y,2],.16,.09,steel);box(8.2,.18,2,.65,.3,.65,concrete);}
 // Small blanked inspection branch on the discharge pipe.
 rod([8.2,1.65,2],[8.2,1.65,2.46],.09,blue);flange([8.2,1.65,2.47],[0,0,1],.17);disk([8.2,1.65,2.58],.17,.045,blue,[0,0,1]);
 // Pressure gauge: stem, metal bezel, cream face and needle.
 rod([-4.45,6,-4],[-4.45,6.5,-4],.025,steel);
 disk([-4.45,6.52,-3.98],.14,.07,steel,[0,0,1]);disk([-4.45,6.52,-3.934],.117,.008,new T.MeshStandardMaterial({color:0xe1ded0,roughness:.55}),[0,0,1]);
 rod([-4.45,6.52,-3.923],[-4.51,6.59,-3.923],.009,red);
 for(let i=0;i<9;i++){let a=(i/8)*Math.PI*1.5-.25*Math.PI;rod([-4.45+Math.cos(a)*.09,6.52+Math.sin(a)*.09,-3.922],[-4.45+Math.cos(a)*.105,6.52+Math.sin(a)*.105,-3.922],.003,dark);}
 const railDetails=new T.Group();railDetails.userData.sectionable=true;scene.add(railDetails);
 // Every guardrail post gets an anchoring plate, four nuts and a sealed cap.
 for(let i=0;i<64;i++){
  const a=i*Math.PI*2/64,x=Math.cos(a)*6.91,z=Math.sin(a)*6.91;
  instance(cube,yellow,[x,3.255,z],[.19,.035,.19],[0,1,0],railDetails);disk([x,4.13,z],.044,.025,yellow,[0,1,0],railDetails);
  for(let dx of [-.065,.065])for(let dz of [-.065,.065])bolt([x+dx,3.28,z+dz],[0,1,0],.017,railDetails);
  if(i%8===0)disk([x,4.12,z],.049,.11,steel,[-Math.sin(a),0,Math.cos(a)],railDetails);
 }
 // Deck grating and bolted feet move with the bridge.
 for(let side of [-1,1])for(let i=0;i<12;i++){
  instance(cube,yellow,[side*.48,3.64,-i*.6],[.14,.025,.14],[0,1,0],bridge);
  bolt([side*.48-.045,3.66,-i*.6],[0,1,0],.014,bridge);bolt([side*.48+.045,3.66,-i*.6],[0,1,0],.014,bridge);
 }
 for(let i=0;i<112;i++)instance(cube,steel,[0,3.647,-i*.059],[.83,.022,.012],[0,1,0],bridge);
 for(let x of [-.34,-.17,0,.17,.34])instance(cube,dark,[x,3.63,-3.3],[.016,.025,6.6],[0,1,0],bridge);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;bolt([Math.cos(a)*.67,3.22,Math.sin(a)*.67],[0,1,0],.035);}
 // Roof coverings, seams, service hatches, vent caps and rainwater outlets.
 function roofDetails(x,y,z,w,d){
  const vx=y<3?x-w*.30:x+.85,vz=y<3?z+d*.26:z-.45;
  box(x,y,z,w-.16,.022,d-.16,roof);
  for(let dx of [-w*.24,w*.24])box(x+dx,y+.019,z,.018,.02,d-.2,dark);
  box(x-.5,y+.04,z+.05,.95,.065,.75,dark);box(x-.5,y+.095,z+.05,.86,.055,.66,steel);
  for(let dx of [-.35,.35])for(let dz of [-.25,.25])bolt([x-.5+dx,y+.13,z+.05+dz],[0,1,0],.019);
  rod([x-.65,y+.14,z+.05],[x-.35,y+.14,z+.05],.025,dark);
  disk([vx,y+.035,vz],.22,.05,dark);disk([vx,y+.24,vz],.11,.4,steel);disk([vx,y+.45,vz],.19,.07,steel);
  const cap=mesh(new T.ConeGeometry(.19,.065,24),steel);cap.position.set(vx,y+.51,vz);
  box(x+w/2-.2,y+.02,z+d/2-.2,.26,.03,.26,dark);
  for(let i=0;i<5;i++)box(x+w/2-.3+i*.045,y+.045,z+d/2-.2,.018,.025,.24,steel);
  rod([x+w/2+.1,y-.05,z+d/2-.15],[x+w/2+.1,y-1.9,z+d/2-.15],.045,steel);
  for(let i=0;i<3;i++)box(x+w/2+.1,y-.4-i*.6,z+d/2-.15,.15,.035,.13,dark);
 }
 roofDetails(1.05,5.925,-8.1,3.6,2.6);roofDetails(-3.5,2.375,6.5,4.1,2.2);
 // Ground drainage and a bolted manhole with a ribbed cover.
 function grate(x,z,w,d){box(x,.086,z,w+.12,.045,d+.12,dark);box(x,.105,z,w,.015,d,gasket);for(let i=0;i<Math.floor(w/.06);i++)instance(cube,steel,[x-w/2+i*.06,.124,z],[.018,.025,d]);}
 grate(.25,7,.95,.46);grate(7.65,0,.42,3.5);
 box(5.8,.09,5.5,.99,.06,.99,dark);disk([5.8,.135,5.5],.44,.05,steel);disk([5.8,.165,5.5],.39,.02,dark);
 for(let j=-5;j<=5;j++){const z=j*.055;const half=Math.sqrt(.35*.35-z*z);instance(cube,steel,[5.8,.181,5.5+z],[half*2,.014,.014]);}
 for(let i=0;i<6;i++){let a=i*Math.PI/3;bolt([5.8+Math.cos(a)*.405,.17,5.5+Math.sin(a)*.405],[0,1,0],.018);}
 // Low kerbs define the slab edge and protect the service walkway.
 for(let z=-7;z<7.5;z+=.75){box(8.35,.14,z,.18,.18,.72,concrete);box(-8.35,.14,z,.18,.18,.72,concrete);}
 for(const {geo,mat,parent,items} of batches.values()){
  const m=new T.InstancedMesh(geo,mat,items.length);items.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.castShadow=true;m.receiveShadow=true;m.instanceMatrix.needsUpdate=true;parent.add(m);
 }
}
