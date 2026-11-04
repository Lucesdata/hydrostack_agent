// Concrete is shaded in world-space metres, preserving texture scale on every wall.
export function concreteMaterial(T,{circular=false,base=0.1,color=0x92958d,panels=true}={}){
 const material=new T.MeshStandardMaterial({color,roughness:.92,metalness:0});
 material.onBeforeCompile=shader=>{
  shader.uniforms.wallCircular={value:circular?1:0};
  shader.uniforms.wallBase={value:base};
  shader.uniforms.wallPanels={value:panels?1:0};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vConcreteWorld;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nvConcreteWorld=(modelMatrix*vec4(position,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vConcreteWorld;
   uniform float wallCircular;
   uniform float wallBase;
   uniform float wallPanels;
   float wallHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float wallNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(wallHash(i),wallHash(i+vec2(1,0)),f.x),mix(wallHash(i+vec2(0,1)),wallHash(i+vec2(1)),f.x),f.y);}
   float wallFbm(vec2 p){return wallNoise(p)*.55+wallNoise(p*2.03)*.28+wallNoise(p*4.11)*.12+wallNoise(p*8.21)*.05;}
   vec2 concreteUV(){
    vec3 n=normalize(cross(dFdx(vConcreteWorld),dFdy(vConcreteWorld)));
    if(abs(n.y)>.7)return vConcreteWorld.xz;
    if(wallCircular>.5)return vec2(atan(vConcreteWorld.z,vConcreteWorld.x)*7.0,vConcreteWorld.y-wallBase);
    return vec2(abs(n.x)>.7?vConcreteWorld.z:vConcreteWorld.x,vConcreteWorld.y-wallBase);
   }
   float concreteHeight(vec2 p){return wallNoise(p*95.0)*.0012+wallNoise(p*27.0)*.0025+wallNoise(p*7.0)*.003;}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   vec2 cUV=concreteUV();
   vec3 faceNormal=normalize(cross(dFdx(vConcreteWorld),dFdy(vConcreteWorld)));
   float verticalFace=1.0-smoothstep(.4,.75,abs(faceNormal.y));
   vec2 panelSize=vec2(wallCircular>.5?1.832596:1.35,1.48);
   vec2 cell=floor(cUV/panelSize);
   vec2 within=fract(cUV/panelSize)*panelSize;
   vec2 seamDistance=min(within,panelSize-within);
   float aa=max(fwidth(cUV.x),fwidth(cUV.y));
   float joint=(1.0-smoothstep(.004,.013+aa,min(seamDistance.x,seamDistance.y)))*verticalFace*wallPanels;
   float castVariation=wallHash(cell)*.12-.06;
   float mottling=(wallFbm(cUV*2.5)-.5)*.24;
   float aggregate=(wallNoise(cUV*110.0)-.5)*.12;
   float streak=pow(wallNoise(vec2(cUV.x*13.0,cUV.y*.6)),3.0);
   float damp=exp(-max(cUV.y,0.0)*2.8)*( .28+wallFbm(cUV*vec2(3.0,1.0))*.5)*verticalFace;
   float runoff=streak*(.05+.12*exp(-abs(cUV.y-1.48)*1.5))*verticalFace;
   // Tie-rod recesses with a light mineral lip around each dark inset.
   vec2 tie=abs(within-panelSize*.5)-panelSize*vec2(.29,.27);
   float tieDistance=length(tie);
   float inset=(1.0-smoothstep(.017,.027+aa,tieDistance))*verticalFace*wallPanels;
   float lip=(1.0-smoothstep(.026,.043+aa,tieDistance))*verticalFace*wallPanels;
   float pores=pow(max(0.0,(wallNoise(cUV*170.0)-.66)*2.7),2.0);
   diffuseColor.rgb*=1.0+mottling+aggregate+castVariation*verticalFace*wallPanels;
   diffuseColor.rgb*=1.0-joint*.42-inset*.48-pores*.16-runoff;
   diffuseColor.rgb+=vec3(.025)*max(lip-inset,0.0);
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.53,.59,.49),damp);
   float innerWall=(1.0-smoothstep(6.7,6.85,length(vConcreteWorld.xz)))*wallCircular*verticalFace;
   float tide=exp(-pow((vConcreteWorld.y-2.78)/.11,2.0))*innerWall;
   float belowTide=(1.0-smoothstep(2.68,2.78,vConcreteWorld.y))*innerWall;
   float mineral=exp(-pow((vConcreteWorld.y-2.91)/.065,2.0))*innerWall;
   float irregular=wallFbm(cUV*vec2(15.0,3.0));
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.38,.49,.29),tide*(.35+irregular*.45)+belowTide*.24);
   diffuseColor.rgb+=vec3(.09,.085,.063)*mineral*irregular;

  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   // Millimetre-scale relief changes light response without adding geometry.
   float concreteRelief=concreteHeight(concreteUV());
   vec3 sX=dFdx(-vViewPosition),sY=dFdy(-vViewPosition);
   vec3 rX=cross(sY,normal),rY=cross(normal,sX);
   float determinant=dot(sX,rX);
   normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(concreteRelief)*rX+dFdy(concreteRelief)*rY));
  `);
 };
 material.customProgramCacheKey=()=>`concrete-v1-${circular}-${base}-${panels}`;
 return material;
}

export function beveledConcreteBox(T,w,h,d){
 const b=Math.min(.026,w*.08,h*.08,d*.08);
 const shape=new T.Shape();shape.moveTo(-w/2+b,-h/2+b);shape.lineTo(w/2-b,-h/2+b);shape.lineTo(w/2-b,h/2-b);shape.lineTo(-w/2+b,h/2-b);shape.closePath();
 const geo=new T.ExtrudeGeometry(shape,{depth:d-2*b,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:b,bevelThickness:b});
 geo.translate(0,0,-d/2+b);return geo;
}
