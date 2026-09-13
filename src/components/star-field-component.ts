import * as THREE from 'three';
import AFRAME from './aframe-export';

export default function initializeStarFieldComponent(): void {
  if (AFRAME.components['star-field']) return;
  AFRAME.registerComponent('star-field', {
    schema: {
      starCount: {default:200}, starSize:{default:0.2}, width:{default:500},
      height:{default:50}, depth:{default:200}, color:{default:'#ffffff'}, speed:{default:0.05}
    },
    init: function(this:any) {
      const count=Math.max(0,Math.min(3000,Math.floor(this.data.starCount)));
      const positions=new Float32Array(count*3);
      for(let i=0;i<count;i++) {
        positions[i*3]=(Math.random()-0.5)*this.data.width;
        positions[i*3+1]=(Math.random()-0.5)*this.data.height;
        positions[i*3+2]=(Math.random()-0.5)*this.data.depth;
      }
      this.geometry=new THREE.BufferGeometry();
      this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
      this.material=new THREE.PointsMaterial({color:this.data.color,size:this.data.starSize*2,sizeAttenuation:true});
      this.points=new THREE.Points(this.geometry,this.material);
      this.el.setObject3D('mesh',this.points);
    },
    tick:function(this:any,time:number,delta:number) {
      const position=this.geometry.attributes.position;
      const travel=this.data.speed*Math.min(delta,100)*0.06;
      for(let i=0;i<position.count;i++) {
        let z=position.getZ(i)+travel;
        if(z>this.data.depth/2)z-=this.data.depth;
        position.setZ(i,z);
      }
      position.needsUpdate=true;
    },
    remove:function(this:any) {this.el.removeObject3D('mesh');this.geometry.dispose();this.material.dispose();}
  });
}
initializeStarFieldComponent();
