export function addLandscape(T,{scene,box,rod,dark}){
 let seed=5731;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const temp=new T.Object3D(),up=new T.Vector3(0,1,0),sets=new Map();
 function put(geo,mat,p,scale,rotation,color){const key=geo.uuid+mat.uuid;if(!sets.has(key))sets.set(key,{geo,mat,items:[]});temp.position.set(...p);temp.scale.set(...scale);temp.rotation.set(...rotation);temp.updateMatrix();sets.get(key).items.push([temp.matrix.clone(),new T.Color(color)]);}
 const bark=new T.MeshStandardMaterial({color:0x514532,roughness:.95});
 const foliage=new T.MeshStandardMaterial({color:0xffffff,roughness:.82,side:T.DoubleSide,emissive:0x061602,emissiveIntensity:.13});
 const soil=new T.MeshStandardMaterial({color:0x36372d,roughness:1});
 const rockMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.95});
 const rock=new T.IcosahedronGeometry(1,0);
 // Folded lanceolate leaves catch the light differently on their two halves.
 const vertices=[],indices=[];
 for(let i=0;i<=4;i++){let y=i/4,w=Math.sin(y*Math.PI)*.27;vertices.push(-w,y,.07*y*y,0,y,.07*y*y+.025*Math.sin(y*Math.PI),w,y,.07*y*y);}
 for(let i=0;i<4;i++)for(let j=0;j<2;j++){let a=i*3+j,b=a+3;indices.push(a,b,a+1,b,b+1,a+1);}
 const leaf=new T.BufferGeometry();leaf.setAttribute('position',new T.Float32BufferAttribute(vertices,3));leaf.setIndex(indices);leaf.computeVertexNormals();
 const blade=new T.BufferGeometry();blade.setAttribute('position',new T.Float32BufferAttribute([-.018,0,0,.018,0,0,-.012,.5,.07,.012,.5,.07,0,1,.21],3));blade.setIndex([0,1,2,1,3,2,2,3,4]);blade.computeVertexNormals();
 const leafColors=[0x376941,0x487b42,0x69884b,0x2d593a,0x789550,0x416c43];
 const stoneColors=[0x6a726d,0x47504d,0x92988e,0x777b70];
 for(const side of [-1,1]){
  const x=side*7.67;box(x,.09,5.45,.97,.11,4.1,soil);
  for(let i=0;i<540;i++){const px=x+(random()-.5)*.94,pz=3.43+random()*4.02,r=.025+random()*.038;put(rock,rockMat,[px,.16,pz],[r,r*.45,r*.8],[random(),random()*6.28,random()],stoneColors[i%4]);}
  for(let bush=0;bush<4;bush++){
   const bx=x+(random()-.5)*.25,bz=3.9+bush*.94,height=.62+random()*.47;
   rod([bx,.14,bz],[bx+.04,height*.8,bz+.03],.028,bark);
   for(let branch=0;branch<14;branch++){
    const angle=branch*2.39996+random()*.4,reach=.18+random()*.32;
    const tip=new T.Vector3(bx+Math.cos(angle)*reach,height*(.55+random()*.5),bz+Math.sin(angle)*reach);
    const start=new T.Vector3(bx,.25+height*random()*.4,bz);
    rod(start.toArray(),tip.toArray(),.007+random()*.005,bark);
    for(let j=0;j<18;j++){
     const t=.3+random()*.7,p=start.clone().lerp(tip,t);p.x+=(random()-.5)*.19;p.y+=(random()-.5)*.12;p.z+=(random()-.5)*.19;
     const len=.14+random()*.16;
     put(leaf,foliage,p.toArray(),[len,len,len],[random()*1.9-.8,angle+random()*2,random()*2-.9],leafColors[(branch+j)%leafColors.length]);
    }
   }
  }
  for(let i=0;i<14;i++){
   const bx=x+(random()-.5)*.65,bz=3.55+random()*3.85;
   for(let j=0;j<17;j++){const h=.14+random()*.35;put(blade,foliage,[bx,.17,bz],[.6+random(),h,h],[random()*.35,random()*6.28,(random()-.5)*1.2],leafColors[j%6]);}
  }
 }
 for(const {geo,mat,items} of sets.values()){
  const inst=new T.InstancedMesh(geo,mat,items.length);items.forEach(([matrix,color],i)=>{inst.setMatrixAt(i,matrix);inst.setColorAt(i,color);});inst.castShadow=true;inst.receiveShadow=true;scene.add(inst);
 }
 // Soft local occlusion anchors the planting beds and equipment to the ground.
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');const g=ctx.createRadialGradient(64,64,2,64,64,64);g.addColorStop(0,'rgba(0,0,0,.42)');g.addColorStop(.5,'rgba(0,0,0,.16)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
 const contact=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 for(const [x,z,w,d] of [[-3.5,6.5,4.8,3.1],[1.05,-8.1,4.3,3.3],[8.2,2,1,1],[-7.67,5.45,1.6,4.6],[7.67,5.45,1.6,4.6]]){const plane=new T.Mesh(new T.PlaneGeometry(w,d),contact);plane.rotation.x=-Math.PI/2;plane.position.set(x,.068,z);scene.add(plane);}
}

export function addCabinDetails(T,{scene,box,rod,dark,glass}){
 const metal=new T.MeshStandardMaterial({color:0x687b7e,metalness:.7,roughness:.34});
 const frame=new T.MeshStandardMaterial({color:0x233b40,roughness:.55,metalness:.45});
 const doorPaint=new T.MeshStandardMaterial({color:0x35616b,roughness:.55,metalness:.35});
 const glazing=new T.MeshPhysicalMaterial({color:0x527277,roughness:.12,metalness:.18,clearcoat:1,transparent:true,opacity:.8,emissive:0x0a1718,emissiveIntensity:.18});
 function pane(x,y,z,w,h){
  box(x,y,z,w+.09,h+.09,.1,frame);box(x,y,z+.064,w,h,.028,glazing);
  box(x,y-h/2-.07,z+.08,w+.18,.055,.23,metal);
  box(x,y,z+.085,.018,h,.024,metal);box(x,y,z+.085,w,.018,.024,metal);
  // Dark recess and uneven interior silhouettes behind the glass.
  box(x,y,z+.025,w-.05,h-.05,.035,dark);
  box(x-w*.26,y-h*.2,z+.046,w*.23,h*.43,.02,frame);
 }
 for(const b of [{x:1.05,y:2.9,z:-8.1,w:3.6,h:2.8,d:2.6},{x:-3.5,y:.1,z:6.5,w:4.1,h:2.05,d:2.2}]){
  const {x,y,z,w,h,d}=b,front=z+d/2;
  // Offset the new door beyond the old flat placeholder, with jambs and threshold.
  box(x,y+.91,front+.11,.7,1.82,.08,frame);box(x,y+.91,front+.163,.59,1.7,.03,doorPaint);
  box(x,y+.07,front+.18,.83,.09,.35,metal);
  box(x,y+1.33,front+.19,.39,.51,.024,frame);box(x,y+1.33,front+.21,.32,.44,.016,glazing);
  for(let dh of [.35,1.45])box(x-.32,y+dh,front+.21,.045,.14,.045,metal);
  rod([x+.19,y+.92,front+.22],[x+.19,y+.78,front+.22],.013,metal);
  for(let dy of [.25,.31,.37,.43])box(x,y+dy,front+.19,.34,.012,.014,frame);
  for(const side of [-1,1])pane(x+side*w*.32,y+h*.6,front+.11,.59,.7);
  // Shielded wall light, service cabinet, conduit and louvred air vent.
  box(x,y+1.98,front+.18,.33,.12,.18,frame);
  const lightFace=box(x,y+1.94,front+.23,.25,.035,.08,new T.MeshStandardMaterial({color:0xf4de9f,emissive:0xffce7c,emissiveIntensity:.7}));
  box(x+w*.38,y+.75,front+.14,.36,.52,.15,metal);box(x+w*.38,y+.75,front+.225,.31,.46,.025,doorPaint);
  rod([x+w*.38,y+.48,front+.15],[x+w*.38,y+.1,front+.15],.014,metal);
  box(x-w*.34,y+.42,front+.13,.47,.38,.04,frame);
  for(let i=0;i<6;i++)box(x-w*.34,y+.28+i*.05,front+.17,.43,.025,.045,metal);
  // Side window gains a sill, frame, mullion and darker glass.
  const side=x+w/2;
  box(side+.065,y+h*.6,z,.075,.93,1.1,frame);box(side+.11,y+h*.6,z,.025,.78,.96,glazing);
  box(side+.1,y+h*.6-.49,z,.24,.055,1.18,metal);box(side+.13,y+h*.6,z,.025,.78,.02,metal);
 }
}
