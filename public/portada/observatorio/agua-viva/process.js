import {particleSample,sludgeDepth} from './process-model.mjs';
export function createProcess(T,{scene,camera,renderer,bridge,waterSurface,shellParts,box,rod,mesh,blue,dark,yellow}){
 renderer.localClippingEnabled=true;
 const steel=new T.MeshStandardMaterial({color:0x778b89,metalness:.75,roughness:.38});
 const silt=new T.MeshStandardMaterial({color:0x4a4030,roughness:1});
 const internal=new T.Group();scene.add(internal);
 const sludge=mesh(new T.CylinderGeometry(6.07,6.07,1,96),silt,internal);sludge.position.y=.4;
 const hopper=mesh(new T.ConeGeometry(.85,.24,48),dark,internal);hopper.rotation.z=Math.PI;hopper.position.y=.49;
 rod([0,.4,0],[0,3.1,0],.13,steel,bridge);
 // Opposed scraper arms and angled bottom blades rotate as part of the bridge.
 for(const side of [-1,1]){
  rod([0,.72,0],[side*5.8,.72,0],.075,steel,bridge);
  rod([0,1.8,0],[side*5.3,.72,0],.035,steel,bridge);
  for(let i=0;i<7;i++){const blade=box(side*(1.1+i*.7),.6,0,.7,.18,.06,steel,bridge);blade.rotation.y=side*.3;rod([side*(1.1+i*.7),.68,0],[side*(1.1+i*.7),.76,0],.025,dark,bridge);}
 }
 // Center gearbox, cooling fins, coupling and a perimeter running wheel.
 box(0,3.95,-.28,.64,.25,.72,blue,bridge);
 const motor=mesh(new T.CylinderGeometry(.18,.18,.52,24),blue,bridge);motor.rotation.x=Math.PI/2;motor.position.set(0,4.17,-.45);
 for(let i=0;i<10;i++)box(0,4.17,-.69+i*.05,.4,.018,.018,dark,bridge);
 rod([0,4.15,-.12],[0,4.15,.22],.055,steel,bridge);
 const wheelGroup=new T.Group();wheelGroup.position.set(0,3.34,-6.79);bridge.add(wheelGroup);
 const wheel=mesh(new T.CylinderGeometry(.22,.22,.16,32),dark,wheelGroup);wheel.rotation.z=Math.PI/2;
 const hub=mesh(new T.CylinderGeometry(.1,.1,.18,16),steel,wheelGroup);hub.rotation.z=Math.PI/2;
 box(0,3.52,-6.79,.45,.18,.5,blue,bridge);
 for(let i=0;i<8;i++){const spoke=rod([-.1,0,0],[-.1,Math.cos(i*Math.PI/4)*.18,Math.sin(i*Math.PI/4)*.18],.016,steel,wheelGroup);}
 const track=mesh(new T.TorusGeometry(6.79,.027,8,160),steel);track.rotation.x=Math.PI/2;track.position.y=3.16;
 // Three particle populations provide different visible sizes and settling rates.
 const particles=[];for(let population=0;population<3;population++){
  const n=240,geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3));
  const m=new T.PointsMaterial({color:[0xb69e70,0x968153,0x746041][population],size:[.038,.06,.085][population],transparent:true,opacity:.78,depthWrite:false});
  const points=new T.Points(geo,m);internal.add(points);particles.push({points,n,offset:population*n});
 }
 // Saw-toothed perimeter weir, a lower collection channel, and many narrow falls.
 const channelGeo=new T.RingGeometry(6.23,6.55,160);channelGeo.rotateX(-Math.PI/2);
 const channel=mesh(channelGeo,new T.MeshPhysicalMaterial({color:0x236e76,roughness:.19,metalness:.18,transparent:true,opacity:.82,clearcoat:1}));channel.position.y=2.43;channel.castShadow=false;
 const weirs=new T.Group();scene.add(weirs);const shape=new T.Shape();shape.moveTo(-.2,0);shape.lineTo(.2,0);shape.lineTo(.2,.17);shape.lineTo(.07,.17);shape.lineTo(0,.055);shape.lineTo(-.07,.17);shape.lineTo(-.2,.17);shape.closePath();
 const plateGeo=new T.ShapeGeometry(shape),plateMat=steel.clone();plateMat.side=T.DoubleSide;
 const sheetGeo=new T.PlaneGeometry(.055,.36,1,8);
 const streamMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0}},vertexShader:'varying vec2 vUV;void main(){vUV=uv;vec3 p=position;p.z+=sin(uv.y*18.0)*.008;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',fragmentShader:'uniform float time;varying vec2 vUV;void main(){float glint=.5+.5*sin(vUV.y*45.0+time*14.0+vUV.x*7.0);float edge=sin(vUV.x*3.14159);gl_FragColor=vec4(mix(vec3(.19,.49,.52),vec3(.73,.91,.88),glint*.55),edge*(.22+glint*.4));}'});
 const falls=new T.Group();weirs.add(falls);
 for(let i=0;i<96;i++){
  const a=i*Math.PI*2/96;const g=new T.Group();g.position.set(Math.cos(a)*6.17,2.66,Math.sin(a)*6.17);g.rotation.y=Math.PI/2-a;weirs.add(g);const plate=mesh(plateGeo,plateMat,g);plate.castShadow=false;
  const fall=new T.Mesh(sheetGeo,streamMat);fall.position.set(Math.cos(a)*6.235,2.58,Math.sin(a)*6.235);fall.rotation.y=Math.PI/2-a;fall.rotation.x=.23;falls.add(fall);
 }
 // Continuous inlet jet with moving highlights and ballistic spray.
 const jetMaterial=streamMat.clone();jetMaterial.uniforms.time=streamMat.uniforms.time;
 const jet=mesh(new T.CylinderGeometry(.085,.14,.4,16,12,true),jetMaterial);jet.position.set(-1.7,2.94,-4);jet.castShadow=false;
 const sprayGeo=new T.BufferGeometry();sprayGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(90*3),3));const spray=new T.Points(sprayGeo,new T.PointsMaterial({color:0xbce5dd,size:.034,transparent:true,opacity:.7,depthWrite:false}));scene.add(spray);
 const plane=new T.Plane(new T.Vector3(0,0,-1),.3);let cutaway=false;const clipped=new Map();
 function clipObject(object){if(!object.material||object===sludge)return;const original=object.material;if(original.isShaderMaterial)return;if(!clipped.has(original)){const m=original.clone();m.onBeforeCompile=original.onBeforeCompile;m.customProgramCacheKey=original.customProgramCacheKey;m.clippingPlanes=[plane];m.clipShadows=true;m.side=T.DoubleSide;clipped.set(original,m);}object.material=clipped.get(original);}
 // The base stays intact; only the upper shell and perimeter are sectioned.
 shellParts.filter(o=>o.position.y>.35||o.geometry?.type==='ExtrudeGeometry').forEach(clipObject);
 weirs.traverse(clipObject);scene.children.filter(o=>o.userData.sectionable).forEach(o=>o.traverse(clipObject));clipObject(channel);clipObject(track);
 function setCutaway(value){cutaway=value;for(const m of clipped.values())m.clippingPlanes=cutaway?[plane]:[];waterSurface.setCutaway(cutaway,0,1);}
 setCutaway(false);
 function update(state){
  const t=state.time;
  const forward=new T.Vector3(camera.position.x,0,camera.position.z).normalize();plane.normal.copy(forward).negate();plane.constant=.25;waterSurface.setCutaway(cutaway,forward.x,forward.z);
  sludge.scale.y=sludgeDepth(t);sludge.position.y=.4+sludge.scale.y/2;
  particles.forEach(({points,n,offset})=>{const arr=points.geometry.attributes.position.array;for(let i=0;i<n;i++){const p=particleSample(i+offset,t);arr[i*3]=p.x;arr[i*3+1]=Math.max(p.y,.43+sludgeDepth(t));arr[i*3+2]=p.z;}points.geometry.attributes.position.needsUpdate=true;points.material.opacity=cutaway?.8:.35;});
  wheelGroup.rotation.x=-t*.026*6.79/.22;
  falls.visible=state.running;jet.visible=state.running;spray.visible=state.running;streamMat.uniforms.time.value=t;
  const arr=sprayGeo.attributes.position.array;for(let i=0;i<90;i++){const phase=(t*1.4+i*.618)%1,a=i*2.39996;arr[i*3]=-1.7+Math.cos(a)*phase*.34;arr[i*3+2]=-4+Math.sin(a)*phase*.34;arr[i*3+1]=2.76+Math.sin(phase*Math.PI)*(.12+(i%7)*.025);}sprayGeo.attributes.position.needsUpdate=true;
 }
 return {update,setCutaway};
}
