export function addLighting(T,{scene,box,rod,mesh,dark}){
 const housing=new T.MeshStandardMaterial({color:0x35464b,metalness:.7,roughness:.38});
 const metal=new T.MeshStandardMaterial({color:0x8a989b,metalness:.8,roughness:.32});
 const lens=new T.MeshStandardMaterial({color:0xffefd4,emissive:0xffe4b5,emissiveIntensity:3,roughness:.18});
 function floodlight(x,y,z,target){
  const root=new T.Group();root.position.set(x,y,z);scene.add(root);
  const lamp=new T.Group();root.add(lamp);lamp.lookAt(new T.Vector3(...target));
  box(0,0,0,.53,.3,.16,housing,lamp);box(0,0,.095,.45,.23,.035,metal,lamp);box(0,0,.12,.4,.18,.018,lens,lamp);
  for(let i=0;i<6;i++)box(-.21+i*.084,0,-.105,.016,.26,.08,housing,lamp);
  for(let side of [-1,1]){box(side*.29,-.06,0,.035,.3,.08,metal,root);const bolt=mesh(new T.CylinderGeometry(.035,.035,.05,6),metal,lamp);bolt.rotation.z=Math.PI/2;bolt.position.x=side*.28;}
  const light=new T.SpotLight(0xffe7c5,220,22,Math.PI/4,.65,1.6);light.position.set(x,y,z);light.target.position.set(...target);scene.add(light,light.target);
 }
 // Two anchored twin-head light poles illuminate the tank and walkways.
 for(const [x,z] of [[-7.65,-1.8],[7.65,-3.4]]){
  box(x,.17,z,.62,.25,.62,dark);box(x,.315,z,.4,.055,.4,metal);
  rod([x,.34,z],[x,7.4,z],.065,housing);
  for(let dx of [-.14,.14])for(let dz of [-.14,.14]){const bolt=mesh(new T.CylinderGeometry(.027,.027,.045,6),metal);bolt.position.set(x+dx,.37,z+dz);}
  rod([x-.65,7.35,z],[x+.65,7.35,z],.045,housing);
  floodlight(x-.57,7.4,z,[x*.2,2.7,z+1.8]);floodlight(x+.57,7.4,z,[x*.55,1.2,z+4]);
  box(x,.9,z,.19,.35,.12,housing);rod([x,.4,z+.08],[x,1.1,z+.08],.014,metal);
 }
 // Mounted floodlight over the main control-room door.
 rod([1.05,5.35,-6.74],[1.05,5.35,-6.42],.025,metal);
 floodlight(1.05,5.36,-6.4,[0,3.4,-4.8]);
}
