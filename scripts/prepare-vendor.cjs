const fs = require('node:fs');
fs.mkdirSync('public/vendor', { recursive: true });
fs.copyFileSync('node_modules/aframe/dist/aframe-v1.4.0.min.js', 'public/vendor/aframe.min.js');
fs.copyFileSync('node_modules/aframe/LICENSE', 'public/vendor/AFRAME-LICENSE');
fs.mkdirSync('public/vendor/draco', { recursive: true });
for (const name of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
  fs.copyFileSync(`node_modules/three/examples/jsm/libs/draco/gltf/${name}`, `public/vendor/draco/${name}`);
}
fs.copyFileSync('node_modules/three/LICENSE', 'public/vendor/THREE-LICENSE');
