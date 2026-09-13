import { defineConfig } from 'vite';
import * as THREE from 'three';
import { cpSync } from 'node:fs';

// A-Frame owns the renderer. Gameplay uses that same Three runtime.
export default defineConfig(({ command }) => ({
  // Preserve source assets; the playable build only needs the vendored runtime.
  publicDir: command === 'build' ? false : 'public',
  base: './',
  plugins: [{
    name: 'playable-assets-only',
    closeBundle() {
      if (command === 'build') cpSync('public/vendor', 'dist/vendor', { recursive: true });
    }
  }, {
    name: 'aframe-three-runtime',
    enforce: 'pre',
    resolveId(id) { if (id === 'three') return '\0aframe-three'; },
    load(id) {
      if (id === '\0aframe-three') return Object.keys(THREE)
        .filter(key => /^[A-Za-z_$][\w$]*$/.test(key))
        .map(key => `export const ${key} = window.AFRAME.THREE.${key};`).join('\n');
    }
  }],
  server: { host: '127.0.0.1', port: 5173 },
  build: { outDir: 'dist' }
}));
