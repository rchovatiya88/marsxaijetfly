// Import THREE.js - A-Frame is imported globally in App.js
import * as THREE from 'three';

// Interface for particle system schema
interface ParticleSystemSchema {
  preset: string;
  particleCount: number;
  color: string;
  size: number;
  duration: number;
  direction: string;
  velocity: number;
  directionVector: {
    x: number;
    y: number;
    z: number;
  };
  spread: number;
}

// Interface for game utilities
interface GameUtils {
  randomVector: (min: THREE.Vector3, max: THREE.Vector3) => THREE.Vector3;
  distanceBetween: (entity1: any, entity2: any) => number;
  formatNumber: (num: number) => string;
  isInView: (camera: any, object: any, fov: number) => boolean;
  randomNormal: (min: number, max: number) => number;
  randomUniform: (min: number, max: number) => number;
}

// Declare the GAME_UTILS on the window object
declare global {
  interface Window {
    GAME_UTILS: GameUtils;
  }
}

/* eslint-disable no-undef */
// Export a function to initialize the particle system and utility functions
export default function initializeUtils(): void {
    // Check if the component is already registered
    // eslint-disable-next-line
    if (!AFRAME.components['particle-system']) {
        AFRAME.registerComponent('particle-system', {
            schema: {
                preset: { type: 'string', default: 'dust' },
                particleCount: { type: 'number', default: 20 },
                color: { type: 'string', default: '#fff' },
                size: { type: 'number', default: 0.1 },
                duration: { type: 'number', default: 1 },
                direction: { type: 'string', default: 'random' },
                velocity: { type: 'number', default: 1 },
                directionVector: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
                spread: { type: 'number', default: 1 }
            },
            init: function(this: any): void {
                try {
                    const system = this.createParticles.call(this); // Call createParticles with correct context
                    this.el.setObject3D('particle-system', system);
                    setTimeout(() => {
                        if (this.el && this.el.parentNode) {
                            this.el.parentNode.removeChild(this.el);
                        }
                    }, this.data.duration * 1000 + 100);
                } catch (error) {
                    console.error('Error initializing particle system:', error);
                }
            },
            createParticles: function(this: any): THREE.Group {
                const group = new THREE.Group();
                const count = this.data.particleCount;
                const size = typeof this.data.size === 'number' ? this.data.size : parseFloat(this.data.size);
                
                // Handle color as either a single color or a comma-separated list
                let colors: string[] = [];
                if (typeof this.data.color === 'string') {
                    if (this.data.color.includes(',')) {
                        colors = this.data.color.split(',').map((c: string) => c.trim());
                    } else {
                        colors = [this.data.color.trim()];
                    }
                } else {
                    colors = ['#fff']; // Default fallback
                }
                
                const directionVector = new THREE.Vector3(this.data.directionVector.x, this.data.directionVector.y, this.data.directionVector.z);
                const spread = this.data.spread;
                for (let i = 0; i < count; i++) {
                    const geometry = new THREE.SphereGeometry(size * Math.random() * 0.5, 4, 4);
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const material = new THREE.MeshBasicMaterial({ 
                        color: color, 
                        transparent: true, 
                        opacity: Math.random() * 0.5 + 0.5 
                    });
                    const particle = new THREE.Mesh(geometry, material);
                    particle.position.set(
                        (Math.random() - 0.5) * size * 2, 
                        (Math.random() - 0.5) * size * 2, 
                        (Math.random() - 0.5) * size * 2
                    );
                    
                    let vx = 0, vy = 0, vz = 0;
                    if (this.data.direction === 'random') {
                        vx = directionVector.x + (Math.random() - 0.5) * this.data.velocity;
                        vy = directionVector.y + (Math.random() - 0.5) * this.data.velocity;
                        vz = directionVector.z + (Math.random() - 0.5) * this.data.velocity;
                    } else if (this.data.direction === 'normal') {
                        vx = directionVector.x + (Math.random() - 0.5) * this.data.velocity * 0.3;
                        vy = directionVector.y + (Math.random() - 0.5) * this.data.velocity * 0.3;
                        vz = directionVector.z + Math.random() * this.data.velocity;
                    }
                    
                    vx += (Math.random() - 0.5) * spread;
                    vy += (Math.random() - 0.5) * spread;
                    vz += (Math.random() - 0.5) * spread;
                    
                    (particle as any).userData.velocity = new THREE.Vector3(vx, vy, vz);
                    (particle as any).userData.initialOpacity = material.opacity;
                    (particle as any).userData.initialScale = particle.scale.x;
                    group.add(particle);
                }
                
                const duration = this.data.duration;
                const startTime = performance.now();
                
                const animateParticles = (): void => {
                    try {
                        const elapsedTime = (performance.now() - startTime) / 1000;
                        const progress = Math.min(elapsedTime / duration, 1);
                        
                        group.children.forEach((particle) => {
                            particle.position.x += (particle as any).userData.velocity.x * 0.016;
                            particle.position.y += (particle as any).userData.velocity.y * 0.016;
                            particle.position.z += (particle as any).userData.velocity.z * 0.016;
                            
                            ((particle as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 
                                (particle as any).userData.initialOpacity * (1 - progress);
                                
                            const scale = (particle as any).userData.initialScale * (1 - progress * 0.5);
                            particle.scale.set(scale, scale, scale);
                        });
                        
                        if (progress < 1 && this.el && this.el.parentNode) {
                            requestAnimationFrame(animateParticles);
                        }
                    } catch (error) {
                        console.error('Error animating particles:', error);
                    }
                };
                
                requestAnimationFrame(animateParticles);
                return group;
            },
            remove: function(this: any): void {
                try {
                    if (this.el) {
                        this.el.removeObject3D('particle-system');
                    }
                } catch (error) {
                    console.error('Error removing particle system:', error);
                }
            }
        });
    }
    
    window.GAME_UTILS = {
        randomVector: function(min: THREE.Vector3, max: THREE.Vector3): THREE.Vector3 {
            return new THREE.Vector3(
                min.x + Math.random() * (max.x - min.x),
                min.y + Math.random() * (max.y - min.y),
                min.z + Math.random() * (max.z - min.z)
            );
        },
        distanceBetween: function(entity1: any, entity2: any): number {
            if (!entity1 || !entity2 || !entity1.object3D || !entity2.object3D) {
                return Infinity;
            }
            const pos1 = entity1.object3D.position;
            const pos2 = entity2.object3D.position;
            return pos1.distanceTo(pos2);
        },
        formatNumber: function(num: number): string {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        isInView: function(camera: any, object: any, fov: number): boolean {
            if (!camera || !object) return false;
            const cameraPos = camera.object3D.position;
            const objPos = object.object3D.position;
            const dirToObj = new THREE.Vector3().subVectors(objPos, cameraPos).normalize();
            const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.object3D.quaternion).normalize();
            const dot = dirToObj.dot(camForward);
            return dot > Math.cos(fov * Math.PI / 180);
        },
        randomNormal: function(min: number, max: number): number {
            let rand = 0;
            for (let n = 0; n < 6; n++) {
                rand += Math.random();
            }
            return min + (max - min) * (rand / 6);
        },
        randomUniform: function(min: number, max: number): number {
            return min + (max - min) * Math.random();
        }
    };
}

// Call the initialization function
initializeUtils();
