import * as T from './vendor/three.module.js';
import {createWaterSurface} from './water.js';
import {concreteMaterial,beveledConcreteBox} from './concrete.js';
import {paintedMetal,slabMaterial,addIndustrialDetails} from './industrial.js';
import {addLandscape,addCabinDetails} from './landscape.js';
import {addWeathering} from './weathering.js';
import {createProcess} from './process.js';
import {addLighting} from './lighting.js';
import {createState,advance} from './simulation.mjs';
const $=id=>document.getElementById(id);const state=createState();state.running=true;state.speed=4;
const container=$('viewport');let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch(e){throw e;}
renderer.setClearColor(0x000000,0);
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;container.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=null;const camera=new T.PerspectiveCamera(37,1,.1,150);let az=.78,elevation=.66,distance=34;
scene.add(new T.HemisphereLight(0xc5d9e4,0x454137,1.45));const sun=new T.DirectionalLight(0xffedce,3.5);sun.position.set(-9,13,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-16;sun.shadow.camera.right=16;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;sun.shadow.normalBias=.015;sun.shadow.bias=-.00015;sun.shadow.radius=2;sun.shadow.camera.near=.5;sun.shadow.camera.far=45;scene.add(sun);const rimLight=new T.DirectionalLight(0x95bed2,.85);rimLight.position.set(4,8,-10);scene.add(rimLight);
const mat=(color,roughness=.65,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});const concrete=concreteMaterial(T,{panels:false}),edge=concreteMaterial(T,{color:0xa8aba1,panels:false}),yellow=paintedMetal(T,0xf3bd24),blue=paintedMetal(T,0x137f9c),dark=mat(0x263b41,.45,.7),glass=mat(0x58d8dd,.18,.35),ground=mat(0x344e52,.95);
function mesh(geo,material,parent=scene){const m=new T.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(x,y,z,w,h,d,m,p=scene){let o=mesh((m===concrete||m===edge||m.userData.isWall)?beveledConcreteBox(T,w,h,d):new T.BoxGeometry(w,h,d),m,p);o.position.set(x,y,z);return o;}
function cyl(x,y,z,r,h,m,p=scene){let o=mesh(new T.CylinderGeometry(r,r,h,48),m,p);o.position.set(x,y,z);return o;}
function rod(a,b,r,m,p=scene){const v=new T.Vector3(...b).sub(new T.Vector3(...a));const o=mesh(new T.CylinderGeometry(r,r,v.length(),10),m,p);o.position.copy(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
function ring(r,y,tube,m,p=scene){let o=mesh(new T.TorusGeometry(r,tube,8,128),m,p);o.rotation.x=Math.PI/2;o.position.y=y;return o;}
box(0,-.18,0,19,.35,17,ground);box(0,0,0,17,.12,15,slabMaterial(T));
// Open concrete shell, floor and circular overflow channel.
const shellStart=scene.children.length;
const outer=new T.Shape();outer.absarc(0,0,7,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,6.62,0,Math.PI*2,true);outer.holes.push(hole);let wall=mesh(new T.ExtrudeGeometry(outer,{depth:3,bevelEnabled:false,curveSegments:100}),concreteMaterial(T,{circular:true}));wall.rotation.x=-Math.PI/2;wall.position.y=.1;
cyl(0,.25,0,6.7,.25,dark);ring(6.84,3.17,.23,edge);ring(6.47,2.50,.045,dark);
for(let i=0;i<64;i++){let a=i/64*Math.PI*2,x=Math.cos(a)*6.91,z=Math.sin(a)*6.91;rod([x,3.2,z],[x,4.12,z],.035,yellow);if(i%4===0){box(x,3.22,z,.14,.04,.14,dark);}}
ring(6.91,4.12,.035,yellow);ring(6.91,3.65,.026,yellow);
const shellParts=scene.children.slice(shellStart);
// Water: animated circular mesh and suspended particles.
const waterSurface=createWaterSurface(T,scene,sun);
// Rotating bridge and center drive.
const bridge=new T.Group();scene.add(bridge);cyl(0,2.94,0,.83,.52,dark);cyl(0,3.27,0,.57,.2,edge);box(0,3.47,-3.35,.95,.19,6.7,dark,bridge);box(0,3.6,-3.35,.84,.06,6.7,edge,bridge);
for(let s of [-1,1]){rod([s*.48,4.58,0],[s*.48,4.58,-6.8],.035,yellow,bridge);rod([s*.48,4.08,0],[s*.48,4.08,-6.8],.025,yellow,bridge);for(let i=0;i<12;i++)rod([s*.48,3.62,-i*.6],[s*.48,4.58,-i*.6],.028,yellow,bridge);}
box(0,3.83,-.25,.48,.42,.54,blue,bridge);cyl(0,1.8,0,.11,2.6,dark,bridge);rod([0,.53,0],[5.7,.53,0],.065,dark,bridge);rod([0,.53,0],[-5.7,.53,0],.065,dark,bridge);
// Fixed access to the operating building.
box(0,3.38,-7.65,1.25,.18,1.8,dark);for(let s of [-1,1]){rod([s*.63,4.46,-6.8],[s*.63,4.46,-8.5],.035,yellow);for(let i=0;i<4;i++)rod([s*.63,3.5,-6.8-i*.5],[s*.63,4.46,-6.8-i*.5],.03,yellow);}
function building(x,y,z,w,h,d){const wallMaterial=concreteMaterial(T,{base:y});wallMaterial.userData.isWall=true;box(x,y+h/2,z,w,h,d,wallMaterial);box(x,y+h+.1,z,w+.3,.22,d+.3,edge);box(x,y+h+.27,z-d/2,w+.25,.22,.12,edge);box(x,y+h+.27,z+d/2,w+.25,.22,.12,edge);box(x-w/2,y+h+.27,z,.12,.22,d,edge);box(x+w/2,y+h+.27,z,.12,.22,d,edge);box(x,y+.9,z+d/2+.025,.66,1.8,.06,dark);box(x,y+1.2,z+d/2+.07,.5,1,.03,glass);for(let s of [-1,1]){box(x+s*w*.32,y+h*.6,z+d/2+.05,.7,.82,.07,edge);box(x+s*w*.32,y+h*.6,z+d/2+.1,.57,.68,.04,glass);}box(x+w/2+.02,y+h*.6,z,.06,.85,1,glass);}
building(1.05,2.9,-8.1,3.6,2.8,2.6);building(-3.5,.1,6.5,4.1,2.05,2.2);
// Blue inlet and outlet pipes, flanges and illuminated flowing beads.
const curve=new T.CurvePath();
curve.add(new T.LineCurve3(new T.Vector3(-6,.5,-4),new T.Vector3(-6,5.55,-4)));
// Tangent quarter-circle elbows maintain a constant diameter and bend radius.
class PipeElbow extends T.Curve{constructor(cx,cy,r,start,end){super();Object.assign(this,{cx,cy,r,start,end});}getPoint(t,target=new T.Vector3()){const a=this.start+(this.end-this.start)*t;return target.set(this.cx+Math.cos(a)*this.r,this.cy+Math.sin(a)*this.r,-4);}}
curve.add(new PipeElbow(-5.55,5.55,.45,Math.PI,Math.PI/2));
curve.add(new T.LineCurve3(new T.Vector3(-5.55,6,-4),new T.Vector3(-2.15,6,-4)));
curve.add(new PipeElbow(-2.15,5.55,.45,Math.PI/2,0));
curve.add(new T.LineCurve3(new T.Vector3(-1.7,5.55,-4),new T.Vector3(-1.7,3,-4)));
mesh(new T.TubeGeometry(curve,180,.16,20,false),blue);
rod([6.5,.2,2],[6.5,2.8,2],.13,blue);rod([6.5,2.8,2],[8.2,2.8,2],.13,blue);rod([8.2,2.8,2],[8.2,.6,2],.13,blue);
const flowing=[];const glow=new T.MeshBasicMaterial({color:0x94fff4});for(let i=0;i<16;i++){let b=mesh(new T.SphereGeometry(.07,8,8),glow);b.castShadow=false;flowing.push(b);}
// Water pouring at inlet.
const pour=mesh(new T.CylinderGeometry(.1,.17,.5,12),new T.MeshBasicMaterial({color:0x65c4bc,transparent:true,opacity:.7}));pour.position.set(-1.7,2.97,-4);
// Floor joints, landscaping and amber perimeter lamps.


const lampStart=scene.children.length;
for(let a of [.2,1.8,3.3,4.5]){const x=7*Math.cos(a),z=7*Math.sin(a);rod([x,3.3,z],[x,4.3,z],.027,dark);let lamp=mesh(new T.SphereGeometry(.075,8,8),new T.MeshBasicMaterial({color:0xffdf8c}));lamp.position.set(x,4.34,z);}
rod([3.2,3,-7],[3.2,8,-7],.055,dark);box(3.2,8,-7,1,.08,.32,new T.MeshBasicMaterial({color:0xb2fcff}));
shellParts.push(...scene.children.slice(lampStart));
addIndustrialDetails(T,{scene,renderer,bridge,blue,yellow,dark,concrete,box,rod,mesh});
addLandscape(T,{scene,box,rod,dark});
addCabinDetails(T,{scene,box,rod,dark,glass});
addWeathering(T,{scene,camera,water:waterSurface.water,box});
addLighting(T,{scene,box,rod,mesh,dark});
const process=createProcess(T,{scene,camera,renderer,bridge,waterSurface,shellParts,box,rod,mesh,blue,dark,yellow});

// Embedded decorative scene: no wheel/drag handlers, so the card keeps its navigation.
let running=false, raf=0, previous=0, lastDraw=0;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
function requestFrame(){if(!raf)raf=requestAnimationFrame(frame);}
function setRunning(next){
 running=next && !reduced.matches && !document.hidden;
 previous=performance.now();lastDraw=0;
 if(raf)cancelAnimationFrame(raf);
 raf=0;
 requestFrame();
}
function frame(now){
 raf=0;
 if(running)requestFrame();
 if(running && now-lastDraw<1000/24)return;
 const dt=running?Math.min((now-previous)/1000,.1):0;
 previous=now;lastDraw=now;
 advance(state,dt);
 const fittedDistance=distance*Math.max(1,1.25/camera.aspect);
 camera.position.set(Math.sin(az)*Math.cos(elevation)*fittedDistance,Math.sin(elevation)*fittedDistance+2,Math.cos(az)*Math.cos(elevation)*fittedDistance);
 camera.lookAt(0,2.2,0);
 bridge.rotation.y=state.time*.026;
 const t=state.time;
 waterSurface.update(t,state.clarity,state.running);
 process.update(state);
 flowing.forEach((b,i)=>{b.visible=state.running;b.position.copy(curve.getPointAt((t*.08+i/16)%1));});
 pour.visible=false;
 renderer.render(scene,camera);
}
window.addEventListener('message',event=>{
 if(event.source!==window.parent || event.origin!==window.location.origin || event.data?.type!=='agua-viva:playback')return;
 setRunning(event.data.running===true);
});
reduced.addEventListener('change',()=>setRunning(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden)setRunning(false);});
window.addEventListener('agua-viva:texture',requestFrame);
renderer.domElement.addEventListener('webglcontextlost',event=>{
 event.preventDefault();running=false;
 if(raf)cancelAnimationFrame(raf);raf=0;
 window.parent.postMessage({type:'agua-viva:error'},window.location.origin);
});
new ResizeObserver(()=>{
 const {width,height}=container.getBoundingClientRect();
 if(!width || !height)return;
 renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
 requestFrame();
}).observe(container);
requestFrame();

window.parent.postMessage({type:'agua-viva:ready'},window.location.origin);
