#!/usr/bin/env node
// Downloads the full YGOPro card database and saves it locally.
// Run: node server/scripts/downloadCards.js

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '../data/cards.json');

console.log('Fetching set release dates...');
const setsRes = await fetch('https://db.ygoprodeck.com/api/v7/cardsets.php');
if (!setsRes.ok) throw new Error(`Sets API error: ${setsRes.status}`);
const setsData = await setsRes.json();

// Map set_name -> tcg_date
const setDateByName = new Map();
for (const s of setsData) {
  if (s.set_name && s.tcg_date) setDateByName.set(s.set_name, s.tcg_date);
}
console.log(`Loaded dates for ${setDateByName.size} sets.`);

console.log('Downloading card database from YGOProDeck...');
const res = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes');
if (!res.ok) throw new Error(`API error: ${res.status}`);

const raw = await res.json();
const cards = raw.data || [];
console.log(`Downloaded ${cards.length} cards.`);

const HAT_CUTOFF = '2014-07-08';

// Strip fields we don't need and filter to HAT cutoff date
const stripped = cards
  .map((c) => {
    const misc = c.misc_info?.[0] || {};
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      frameType: c.frameType,
      desc: c.desc,
      race: c.race,
      attribute: c.attribute,
      archetype: c.archetype,
      level: c.level,
      atk: c.atk,
      def: c.def,
      scale: c.scale,
      linkval: c.linkval,
      tcg_date: misc.tcg_date || null,
      sets: c.card_sets?.map((s) => ({
        code: s.set_code,
        name: s.set_name,
        date: setDateByName.get(s.set_name) || null,
        rarity: s.set_rarity,
      })) || [],
      card_images: c.card_images?.map((img) => ({
        image_url: img.image_url,
        image_url_small: img.image_url_small,
      })) || [],
    };
  })
  .filter((c) => c.tcg_date && c.tcg_date <= HAT_CUTOFF);

console.log(`Filtered to ${stripped.length} cards (released on or before ${HAT_CUTOFF}).`);
fs.writeFileSync(OUT_PATH, JSON.stringify(stripped));
const sizeKB = Math.round(fs.statSync(OUT_PATH).size / 1024);
console.log(`Saved to ${OUT_PATH} (${sizeKB} KB, ${stripped.length} cards).`);
