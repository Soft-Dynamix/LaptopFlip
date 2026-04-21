#!/usr/bin/env node
/**
 * Regenerate Android icons and splash screens from source assets.
 * Run: node scripts/generate-android-assets.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICON_SOURCE = 'public/icon-1024.png';
const PROJECT_ROOT = path.resolve(__dirname, '..');

const iconSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const splashSizes = {
  'drawable-port-mdpi': { w: 480, h: 800 },
  'drawable-port-hdpi': { w: 720, h: 1280 },
  'drawable-port-xhdpi': { w: 960, h: 1600 },
  'drawable-port-xxhdpi': { w: 1440, h: 2560 },
  'drawable-port-xxxhdpi': { w: 1920, h: 3200 },
  'drawable-land-mdpi': { w: 800, h: 480 },
  'drawable-land-hdpi': { w: 1280, h: 720 },
  'drawable-land-xhdpi': { w: 1600, h: 960 },
  'drawable-land-xxhdpi': { w: 2560, h: 1440 },
  'drawable-land-xxxhdpi': { w: 3200, h: 1920 },
};

async function generateIcons() {
  console.log('Generating app icons...');
  for (const [folder, size] of Object.entries(iconSizes)) {
    const dir = path.join(PROJECT_ROOT, 'android/app/src/main/res', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await sharp(path.join(PROJECT_ROOT, ICON_SOURCE))
      .resize(size, size)
      .toFile(path.join(dir, 'ic_launcher.png'));

    await sharp(path.join(PROJECT_ROOT, ICON_SOURCE))
      .resize(size, size)
      .composite([{
        input: Buffer.from(
          `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
        ),
        blend: 'dest-in',
      }])
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    console.log(`  [OK] ${folder} (${size}px)`);
  }
}

async function generateSplash() {
  console.log('Generating splash screens...');
  for (const [folder, { w, h }] of Object.entries(splashSizes)) {
    const dir = path.join(PROJECT_ROOT, 'android/app/src/main/res', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#0d9488"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <g transform="translate(${w/2}, ${h/2 - 40}) scale(${Math.max(1, w * 0.08 / 48)})">
        <rect x="-36" y="-24" width="72" height="48" rx="6" fill="white" opacity="0.95"/>
        <rect x="-30" y="-20" width="60" height="34" rx="3" fill="#10b981"/>
        <rect x="-14" y="24" width="28" height="4" rx="2" fill="white" opacity="0.95"/>
        <path d="M-10 34 L10 34 L6 42 L-6 42 Z" fill="white" opacity="0.95"/>
      </g>
    </svg>`;

    await sharp(Buffer.from(svg))
      .resize(w, h)
      .png()
      .toFile(path.join(dir, 'splash.png'));

    console.log(`  [OK] ${folder} (${w}x${h})`);
  }
}

async function main() {
  const iconPath = path.join(PROJECT_ROOT, ICON_SOURCE);
  if (!fs.existsSync(iconPath)) {
    console.error('Source icon not found at', ICON_SOURCE);
    process.exit(1);
  }
  await generateIcons();
  await generateSplash();
  console.log('\nAll Android assets generated!');
}

main().catch(err => { console.error(err); process.exit(1); });
