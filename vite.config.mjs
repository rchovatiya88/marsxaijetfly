import { defineConfig } from 'vite';
import * as THREE from 'three';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';

function installInspectionCapture(server) {
  // Local QA only: same origin, loopback, fixed paths and a bounded image body.
  server.middlewares.use('/__inspection-capture', async (req,res) => {
    const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    if(req.method!=='POST' || !local || (req.headers.origin && req.headers.origin!==`http://${req.headers.host}`)){res.statusCode=403;res.end();return;}
    try {
      let body='';for await(const chunk of req){body+=chunk;if(body.length>12000000)throw Error('Capture too large');}
      const value=JSON.parse(body);
      if(!/^(launch|fork|high-bridge|low-bridge|court|extraction|current)$/.test(value.view) || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value.png))throw Error('Invalid capture');
      const folder='evidence/runtime-inspection';mkdirSync(folder,{recursive:true});
      const name=`${value.view}-${Date.now()}`;
      writeFileSync(`${folder}/${name}.png`,Buffer.from(value.png.split(',')[1],'base64'));
      writeFileSync(`${folder}/${name}.json`,JSON.stringify(value.metadata,null,2)+'\n');
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({path:`${folder}/${name}.png`}));
    }catch(error){res.statusCode=400;res.end(String(error));}
  });
}

// A-Frame owns the renderer. Gameplay uses that same Three runtime.
export default defineConfig(({ command }) => ({
  // Preserve source assets; the playable build only needs the vendored runtime.
  publicDir: command === 'build' ? false : 'public',
  base: './',
  plugins: [{
    name: 'local-inspection-capture',
    configureServer:installInspectionCapture,
    configurePreviewServer:installInspectionCapture
  },{
    name: 'playable-assets-only',
    closeBundle() {
      if (command === 'build') {
        cpSync('public/vendor', 'dist/vendor', { recursive: true });
        cpSync('public/models/enemy.glb', 'dist/models/enemy.glb', { recursive: true });
        cpSync('public/models/avi-jetbike.glb', 'dist/models/avi-jetbike.glb');
        cpSync('public/models/bridgehead-route.glb', 'dist/models/bridgehead-route.glb');
        cpSync('public/models/ridge-run-shell.glb', 'dist/models/ridge-run-shell.glb');
        cpSync('public/models/level1-stream', 'dist/models/level1-stream', { recursive: true });
        cpSync('public/mission', 'dist/mission', { recursive: true });
      }
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
