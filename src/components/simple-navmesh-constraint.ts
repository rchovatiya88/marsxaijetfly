/* global THREE */

// THREE is already globally available through A-Frame
import AFRAME_EXPORT from './aframe-export';

const AFRAME = AFRAME_EXPORT;

// Interface for the navmesh constraint schema
interface NavMeshConstraintSchema {
  enabled: boolean;
  navmesh: string;
  fall: number;
  height: number;
  exclude: string;
  allowFlying: boolean; // Allow flying above the navmesh
  minFlyingHeight: number; // Minimum flying height
}

// Type for scan pattern items
type ScanPatternItem = [number, number];

/* Constrain an object to a navmesh, for example place this element after wasd-controls like so:
`wasd-controls navmesh-physics="#navmesh-el"`
*/
AFRAME.registerComponent('simple-navmesh-constraint', {
  schema: {
    enabled: {
      default: true
    },
    navmesh: {
      default: ''
    },
    fall: {
      default: 0.5
    },
    height: {
      default: 1.6
    },
    exclude: {
      default: ''
    },
    allowFlying: {
      default: true // Enable flying when appropriate
    },
    minFlyingHeight: {
      default: 1.6 // Minimum height to consider entity as flying
    }
  },
  
  init: function(this: any): void {
    // Initialize component
  },
  
  update: function(this: any): void {
    this.lastPosition = null;
    this.excludes = this.data.exclude ? Array.from(document.querySelectorAll(this.data.exclude)) : [];
    const els = Array.from(document.querySelectorAll(this.data.navmesh));
    if (els === null) {
      console.warn('navmesh-physics: Did not match any elements');
      this.objects = [];
    } else {
      this.objects = els.map(el => (el as any).object3D).concat(this.excludes.map(el => (el as any).object3D));
    }
  },

  tick: (function(this: any) {
    const nextPosition = new THREE.Vector3();
    const tempVec = new THREE.Vector3();
    const scanPattern: ScanPatternItem[] = [
      [0, 1],      // Default the next location
      [0, 0.5],    // Check that the path to that location was fine
      [30, 0.4],   // A little to the side shorter range
      [-30, 0.4],  // A little to the side shorter range
      [60, 0.2],   // Moderately to the side short range
      [-60, 0.2],  // Moderately to the side short range
      [80, 0.06],  // Perpendicular very short range
      [-80, 0.06], // Perpendicular very short range
    ];
    const down = new THREE.Vector3(0, -1, 0);
    const raycaster = new THREE.Raycaster();
    const gravity = -1;
    const maxYVelocity = 0.5;
    const results: THREE.Intersection[] = [];
    let yVel = 0;
    let firstTry = true;
    
    return function tick(this: any, time: number, delta: number): void {
      if (this.data.enabled === false) return;
      if (this.lastPosition === null) {
        firstTry = true;
        this.lastPosition = new THREE.Vector3();
        this.el.object3D.getWorldPosition(this.lastPosition);
      }
      
      const el = this.el;
      if (this.objects.length === 0) return;

      this.el.object3D.getWorldPosition(nextPosition);
      if (nextPosition.distanceTo(this.lastPosition) === 0) return;
      
      // Check if entity is flying - get player component if available
      let isFlying = false;
      if (this.data.allowFlying && el.components['player-component']) {
        isFlying = el.components['player-component'].isFlying;
      } else if (this.data.allowFlying) {
        // If no player component, determine flying state based on height
        isFlying = nextPosition.y > this.data.minFlyingHeight + 0.1;
      }
      
      // Allow free movement when flying
      if (isFlying) {
        this.lastPosition.copy(nextPosition);
        return;
      }
      
      let didHit = false;
      // So that it does not get stuck it takes as few samples around the user and finds the most appropriate
      scanPatternLoop:
      for (const [angle, distance] of scanPattern) {
        tempVec.subVectors(nextPosition, this.lastPosition);
        tempVec.applyAxisAngle(down, angle * Math.PI / 180);
        tempVec.multiplyScalar(distance);
        tempVec.add(this.lastPosition);
        tempVec.y += maxYVelocity;
        tempVec.y -= this.data.height;
        raycaster.set(tempVec, down);
        raycaster.far = this.data.fall > 0 ? this.data.fall + maxYVelocity : Infinity;
        raycaster.intersectObjects(this.objects, true, results);
        
        if (results.length) {
          // If it hit something we want to avoid then ignore it and stop looking
          for (const result of results) {
            if (this.excludes.includes((result.object as any).el)) {
              results.splice(0);
              continue scanPatternLoop;
            }
          }
          const hitPos = results[0].point;
          results.splice(0);
          hitPos.y += this.data.height;
          if (nextPosition.y - (hitPos.y - yVel * 2) > 0.01) {
            yVel += Math.max(gravity * delta * 0.001, -maxYVelocity);
            hitPos.y = nextPosition.y + yVel;
          } else {
            yVel = 0;
          }
          el.object3D.position.copy(hitPos);
          this.el.object3D.parent.worldToLocal(this.el.object3D.position);
          this.lastPosition.copy(hitPos);
          didHit = true;
          break;
        }
      }
      
      if (didHit) {
        firstTry = false;
      }
      
      if (!firstTry && !didHit) {
        this.el.object3D.position.copy(this.lastPosition);
        this.el.object3D.parent.worldToLocal(this.el.object3D.position);
      }
    }
  }())
});

// Export for React/ES modules
export default function initializeNavMeshConstraint(): void {
  // The component is registered directly in the code above
  // This function exists just to allow importing in the React app
}