#!/usr/bin/env node
// Downloads card images for all cards in cards.json.
// Skips already-downloaded files. Safe to re-run incrementally.
// Run: node server/scripts/downloadImages.js

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARDS_PATH = path.join(__dirname, '../data/cards.json');
const IMAGES_DIR = path.join(__dirname, '../data/images');

const DELAY_MS = 50; // ms between requests to avoid rate limiting
const CONCURRENCY = 5;

fs.mkdirSync(IMAGES_DIR, { recursive: true });

const cards = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
console.log(`Downloading images for ${cards.length} cards to ${IMAGES_DIR}`);

let done = 0, skipped = 0, failed = 0;

async function downloadOne(card) {
  const url = card.card_images?.[0]?.image_url_small;
  if (!url) return;
  const dest = path.join(IMAGES_DIR, `${card.id}.jpg`);
  if (fs.existsSync(dest)) { skipped++; return; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    done++;
  } catch (err) {
    failed++;
    console.error(`Failed ${card.id} (${card.name}): ${err.message}`);
  }
}

async function runPool(items, concurrency) {
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const card = items[i++];
      await downloadOne(card);
      if ((done + skipped + failed) % 100 === 0) {
        process.stdout.write(`\r${done} downloaded, ${skipped} skipped, ${failed} failed / ${cards.length} total`);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  });
  await Promise.all(workers);
}

await runPool(cards, CONCURRENCY);
console.log(`\nDone. ${done} downloaded, ${skipped} skipped, ${failed} failed.`);
