const fract=x=>x-Math.floor(x);
const random=(i,k)=>fract(Math.sin(i*127.1+k*311.7)*43758.5453);
export function particleSample(i,time){const angle=random(i,1)*Math.PI*2,radius=Math.sqrt(random(i,2))*5.9,size=.035+random(i,3)*.055,start=.75+random(i,4)*1.8,speed=.007+size*.25;return {x:Math.cos(angle+Math.min(time,120)*.001)*radius,z:Math.sin(angle+Math.min(time,120)*.001)*radius,y:Math.max(.5+random(i,5)*.12,start-time*speed),size};}
export function sludgeDepth(time){return .035+.14*(1-Math.exp(-Math.max(0,time)/95));}
