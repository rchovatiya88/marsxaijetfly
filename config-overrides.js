/* config-overrides.js */
const path = require('path');

module.exports = function override(config, env) {
  // Add aliases for Three.js addons
  config.resolve.alias = {
    ...config.resolve.alias,
    'three/addons/loaders/ColladaLoader.js': path.resolve(__dirname, 'node_modules/three/examples/jsm/loaders/ColladaLoader.js'),
    'three/addons/loaders/FBXLoader.js': path.resolve(__dirname, 'node_modules/three/examples/jsm/loaders/FBXLoader.js'),
    // Skip the parsing of aframe module
    'aframe': path.resolve(__dirname, 'node_modules/aframe/dist/aframe-v1.4.0.min.js'),
    // Add aliases for Node.js modules
    'url': path.resolve(__dirname, 'node_modules/url/url.js'),
    'util': path.resolve(__dirname, 'node_modules/util/util.js'),
    'path': path.resolve(__dirname, 'node_modules/path-browserify/index.js'),
    'stream': path.resolve(__dirname, 'node_modules/stream-browserify/index.js'),
    'zlib': path.resolve(__dirname, 'node_modules/browserify-zlib/lib/index.js'),
    'assert': path.resolve(__dirname, 'node_modules/assert/assert.js'),
    'buffer': path.resolve(__dirname, 'node_modules/buffer/index.js'),
    'querystring': path.resolve(__dirname, 'node_modules/querystring-es3/index.js')
  };
  
  return config;
}
