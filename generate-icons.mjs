import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = fs.readFileSync('./public/ghost.svg');

// Create a white background with the ghost icon centered
async function generateIcons() {
  // Apple Touch Icon (180x180)
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{ input: await sharp(svgBuffer).resize(120, 120).toBuffer() }])
  .png()
  .toFile('./public/apple-touch-icon.png');

  // PWA Icon 192
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{ input: await sharp(svgBuffer).resize(128, 128).toBuffer() }])
  .png()
  .toFile('./public/icon-192.png');

  // PWA Icon 512
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{ input: await sharp(svgBuffer).resize(340, 340).toBuffer() }])
  .png()
  .toFile('./public/icon-512.png');

  console.log('Icons generated successfully!');
}

generateIcons().catch(console.error);
