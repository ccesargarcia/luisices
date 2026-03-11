#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// Source image path - drop your original here before running the script
const SRC = path.resolve(process.cwd(), 'assets', 'login-bg.png');
const OUT_DIR = path.resolve(process.cwd(), 'public', 'images');

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function build() {
  try {
    await ensureOutDir();

    // generate full-size (max width 1920) versions
    const img = sharp(SRC);
    const metadata = await img.metadata();
    const width = Math.min(metadata.width || 1920, 1920);

    await Promise.all([
      img
        .resize({ width })
        .avif({ quality: 70 })
        .toFile(path.join(OUT_DIR, 'login-bg.avif')),

      img
        .resize({ width })
        .webp({ quality: 75 })
        .toFile(path.join(OUT_DIR, 'login-bg.webp')),

      img
        .resize({ width })
        .png({ quality: 80, compressionLevel: 9 })
        .toFile(path.join(OUT_DIR, 'login-bg.png')),
    ]);

    // smaller variant for mobile
    const mobileWidth = 800;
    await Promise.all([
      img
        .resize({ width: mobileWidth })
        .avif({ quality: 60 })
        .toFile(path.join(OUT_DIR, 'login-bg-800.avif')),
      img
        .resize({ width: mobileWidth })
        .webp({ quality: 65 })
        .toFile(path.join(OUT_DIR, 'login-bg-800.webp')),
      img
        .resize({ width: mobileWidth })
        .png({ quality: 80, compressionLevel: 9 })
        .toFile(path.join(OUT_DIR, 'login-bg-800.png')),
    ]);

    console.log('Optimized images written to', OUT_DIR);
    process.exit(0);
  } catch (err) {
    console.error('Error while optimizing images:', err);
    process.exit(1);
  }
}

build();
