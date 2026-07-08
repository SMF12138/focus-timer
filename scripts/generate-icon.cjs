const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.svg'));
const sizes = [16, 32, 48, 64, 128, 256, 512];

async function generate() {
  for (const size of sizes) {
    const out = path.join(__dirname, '..', 'build', `icon-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`Generated ${size}x${size} icon`);
  }
  // Copy 256x256 as the default icon.png
  fs.copyFileSync(
    path.join(__dirname, '..', 'build', 'icon-256.png'),
    path.join(__dirname, '..', 'build', 'icon.png')
  );
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
