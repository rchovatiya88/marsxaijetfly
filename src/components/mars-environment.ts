import * as THREE from 'three';
import AFRAME from './aframe-export';

// Deterministic, entirely local art. The central collision arena stays flat and unchanged.
export default function initializeMarsEnvironment(): void {
  if (AFRAME.components['mars-environment']) return;
  AFRAME.registerComponent('mars-environment', {
    init: function(this:any) {
      const group = new THREE.Group();
      this.resources = [];
      let seed=8127;
      const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const mesh=(geometry:THREE.BufferGeometry,material:THREE.Material)=>{
        const object=new THREE.Mesh(geometry,material);group.add(object);this.resources.push(geometry,material);return object;
      };
      // Sand grain and wind streaks provide surface scale without downloaded textures.
      const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
      const ctx=canvas.getContext('2d')!;
      ctx.fillStyle='#c5b6a1';ctx.fillRect(0,0,512,512);
      for(let i=0;i<22000;i++) {
        const light=100+Math.floor(random()*105);
        ctx.fillStyle=`rgba(${light},${light},${light},0.24)`;
        ctx.fillRect(random()*512,random()*512,1+random()*3,1);
      }
      for(let i=0;i<170;i++) {
        const y=random()*512;
        ctx.strokeStyle=`rgba(78,65,57,${0.015+random()*0.06})`;
        ctx.lineWidth=1+random()*3;ctx.beginPath();
        ctx.moveTo(0,y);ctx.bezierCurveTo(140,y-8,310,y+12,512,y);ctx.stroke();
      }
      const sand=new THREE.CanvasTexture(canvas);sand.wrapS=sand.wrapT=THREE.RepeatWrapping;sand.repeat.set(18,18);
      sand.anisotropy=Math.min(4,this.el.sceneEl.renderer?.capabilities.getMaxAnisotropy() || 1);
      this.resources.push(sand);
      const groundGeo=new THREE.PlaneGeometry(340,340,80,80);groundGeo.rotateX(-Math.PI/2);
      const position=groundGeo.attributes.position;
      const colors:number[]=[];
      for(let i=0;i<position.count;i++) {
        const x=position.getX(i),z=position.getZ(i);
        const outside=Math.max(0,Math.max(Math.abs(x)-28,Math.abs(z+10)-43));
        position.setY(i,-0.11+Math.min(1,outside/12)*(Math.sin(x*.12)*Math.cos(z*.14)*1.1));
        const variation=0.91+Math.sin(x*.08+Math.cos(z*.07))*0.07+random()*0.045;
        const color=new THREE.Color('#a9674a').convertSRGBToLinear().multiplyScalar(variation);colors.push(color.r,color.g,color.b);
      }
      groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();
      mesh(groundGeo,new THREE.MeshStandardMaterial({map:sand,vertexColors:true,roughness:1,metalness:0}));
      // Three continuous rings of eroded ridges, with height/color strata and distant haze.
      for(let layer=0;layer<3;layer++) {
        const vertices:number[]=[], shades:number[]=[];
        const segments=96, rings=8;
        const points:THREE.Vector3[][]=[];
        for(let row=0;row<=rings;row++) {
          points[row]=[];
          for(let col=0;col<=segments;col++) {
            const angle=col/segments*Math.PI*2;
            const crest=10+Math.sin(angle*7+layer)*6+Math.sin(angle*13)*2+layer*7;
            const radial=51+layer*32+row*3.1+Math.sin(angle*11)*2.1;
            const cross=Math.sin(row/rings*Math.PI);
            const h=Math.pow(Math.max(0,cross),0.7)*crest+(row>0 && row<rings ? random()*1.8 : -1);
            points[row][col]=new THREE.Vector3(Math.cos(angle)*radial,h,Math.sin(angle)*radial*1.2-10);
          }
        }
        const base=new THREE.Color(layer===0?'#a86e53':layer===1?'#97645b':'#825b60').convertSRGBToLinear();
        const emit=(p:THREE.Vector3)=>{
          vertices.push(p.x,p.y,p.z);
          const stratum=0.78+Math.floor(p.y/2.4)%3*0.055+Math.max(0,p.y)*0.01;
          const c=base.clone().multiplyScalar(stratum);shades.push(c.r,c.g,c.b);
        };
        for(let row=0;row<rings;row++)for(let col=0;col<segments;col++) {
          const a=points[row][col],b=points[row][col+1],c=points[row+1][col],d=points[row+1][col+1];
          // Counterclockwise winding viewed from above.
          [a,c,b,b,c,d].forEach(emit);
        }
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(shades,3));geometry.computeVertexNormals();
        mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide}));
      }
      // Rock clusters are a single instanced draw, kept outside the flight corridor.
      const rockGeometry=new THREE.IcosahedronGeometry(1,0);
      const rockMaterial=new THREE.MeshStandardMaterial({color:new THREE.Color('#80523f').convertSRGBToLinear(),roughness:1,flatShading:true});
      const rocks=new THREE.InstancedMesh(rockGeometry,rockMaterial,160);
      const dummy=new THREE.Object3D();
      for(let i=0;i<160;i++) {
        const side=i%2 ? 1 : -1;
        dummy.position.set(side*(29+random()*18),0,random()*110-66);
        const scale=.18+Math.pow(random(),2)*2.1;
        dummy.scale.set(scale*(1+random()),scale*.7,scale);
        dummy.position.y=scale*.18;dummy.rotation.set(random(),random()*6.28,random());dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
      }
      group.add(rocks);this.resources.push(rockGeometry,rockMaterial);
      // A soft horizon gradient replaces black sky and rectangular sky bands.
      const skyMaterial=new THREE.ShaderMaterial({
        side:THREE.BackSide,depthWrite:false,
        vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:`varying vec3 vDirection;
          void main(){
            float h=normalize(vDirection).y;
            vec3 horizon=vec3(0.46,0.205,0.12);
            vec3 zenith=vec3(0.018,0.025,0.065);
            vec3 sky=mix(horizon,zenith,smoothstep(-0.03,0.7,h));
            sky+=vec3(0.1,0.034,0.006)*exp(-abs(h-0.04)*15.0);
            gl_FragColor=vec4(sky,1.0);
            #include <tonemapping_fragment>
            #include <encodings_fragment>
          }`
      });
      const sky=mesh(new THREE.SphereGeometry(450,32,16),skyMaterial);sky.renderOrder=-10;
      // Atmosphere remains visible when authored GLB terrain replaces fallback ground.
      this.sky = sky;
      this.el.sceneEl.object3D.add(sky);
      // Baked contact shading gives the bike altitude cues without realtime shadow maps.
      const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
      const sc=shadowCanvas.getContext('2d')!,gradient=sc.createRadialGradient(32,32,1,32,32,31);
      gradient.addColorStop(0,'rgba(17,9,15,0.5)');gradient.addColorStop(1,'rgba(17,9,15,0)');sc.fillStyle=gradient;sc.fillRect(0,0,64,64);
      const shadowMap=new THREE.CanvasTexture(shadowCanvas);this.resources.push(shadowMap);
      this.shadow=mesh(new THREE.PlaneGeometry(4.5,5.5),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;
      this.player=document.getElementById('player');
      this.el.setObject3D('mesh',group);
    },
    tick:function(this:any) {
      this.player ||= document.getElementById('player');
      const pos=this.player?.object3D?.position;
      if(pos){this.shadow.position.set(pos.x,0.01,pos.z);this.shadow.scale.setScalar(1+pos.y*.06);this.shadow.material.opacity=Math.max(.12,.8-pos.y*.025);}
    },
    remove:function(this:any){this.sky?.parent?.remove(this.sky);this.el.removeObject3D('mesh');this.resources.forEach((r:any)=>r.dispose());}
  });
}
initializeMarsEnvironment();
