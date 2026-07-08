const fs = require('fs');
const path = require('path');

const distElectron = path.join(__dirname, '..', 'dist-electron');
const electronNative = path.join(__dirname, '..', 'electron', 'native');
const targetNative = path.join(distElectron, 'native');

// Ensure dist-electron exists
if (!fs.existsSync(distElectron)) {
  fs.mkdirSync(distElectron, { recursive: true });
}

// Rename main.js -> main.cjs
const mainJs = path.join(distElectron, 'main.js');
const mainCjs = path.join(distElectron, 'main.cjs');
if (fs.existsSync(mainJs)) {
  fs.renameSync(mainJs, mainCjs);
}

// Rename preload.js -> preload.cjs
const preloadJs = path.join(distElectron, 'preload.js');
const preloadCjs = path.join(distElectron, 'preload.cjs');
if (fs.existsSync(preloadJs)) {
  fs.renameSync(preloadJs, preloadCjs);
}

// Ensure target native dir exists
if (!fs.existsSync(targetNative)) {
  fs.mkdirSync(targetNative, { recursive: true });
}

// Copy the compiled native wrapper .js files
const indexJs = path.join(electronNative, 'index.js');
const indexMap = path.join(electronNative, 'index.js.map');
if (fs.existsSync(indexJs)) {
  fs.copyFileSync(indexJs, path.join(targetNative, 'index.js'));
}
if (fs.existsSync(indexMap)) {
  fs.copyFileSync(indexMap, path.join(targetNative, 'index.js.map'));
}

// Copy the actual .node binary from build output
const nodeBinary = path.join(electronNative, 'build', 'Release', 'keyHook.node');
if (fs.existsSync(nodeBinary)) {
  fs.copyFileSync(nodeBinary, path.join(targetNative, 'keyHook.node'));
}

console.log('Electron post-build done.');
