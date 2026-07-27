import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COLLECTION_PATH = path.resolve(__dirname, '../../ygo-collection/data/collection.json');
const CARDS_PATH = path.join(__dirname, 'data/cards.json');
const IMAGES_DIR = path.join(__dirname, 'data/images');
const DECKS_DIR = path.resolve(__dirname, '../decks');

if (!fs.existsSync(DECKS_DIR)) fs.mkdirSync(DECKS_DIR, { recursive: true });

const FORMAT_IDS = ['edison', 'dino-rabbit', 'redu', 'hat'];
FORMAT_IDS.forEach((f) => {
  const dir = path.join(DECKS_DIR, f);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── Load local card DB ──────────────────────────────────────────────────────
if (!fs.existsSync(CARDS_PATH)) {
  console.error('Card database not found. Run: npm run db:update --prefix server');
  process.exit(1);
}

const ALL_CARDS = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf-8'));
console.log(`Loaded ${ALL_CARDS.length} cards from local DB.`);

// Build name index for fast exact lookups
const CARDS_BY_NAME = new Map(ALL_CARDS.map((c) => [c.name.toLowerCase(), c]));
const CARDS_BY_ID = new Map(ALL_CARDS.map((c) => [String(c.id), c]));

// ── Card search (local) ─────────────────────────────────────────────────────
app.get('/api/cards/search', (req, res) => {
  const { fname, type, attribute, race, level, num = 20, offset = 0 } = req.query;

  let results = ALL_CARDS;

  if (fname) {
    const q = fname.toLowerCase();
    results = results.filter((c) => c.name.toLowerCase().includes(q));
  }
  if (type) results = results.filter((c) => c.type === type);
  if (attribute) results = results.filter((c) => c.attribute === attribute);
  if (race) results = results.filter((c) => c.race === race);
  if (level) results = results.filter((c) => String(c.level) === String(level));

  const page = results.slice(Number(offset), Number(offset) + Number(num));
  res.json({ data: page, total: results.length });
});

// Return all cards (for client-side live filtering)
app.get('/api/cards/all', (req, res) => {
  const slim = ALL_CARDS.map(({ id, name, type, frameType, desc, race, attribute, archetype, level, atk, def, scale, linkval, tcg_date, sets, card_images }) => ({
    id, name, type, frameType, desc, race, attribute, archetype, level, atk, def, scale, linkval, tcg_date, sets,
    card_images: card_images.slice(0, 1),
  }));
  res.json(slim);
});

app.get('/api/cards/:id', (req, res) => {
  const card = CARDS_BY_ID.get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json({ data: [card] });
});

// ── Local card images ────────────────────────────────────────────────────────
app.get('/images/:id', (req, res) => {
  const filePath = path.join(IMAGES_DIR, `${req.params.id}.jpg`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Fall back to CDN redirect when image not downloaded yet
    const card = CARDS_BY_ID.get(req.params.id);
    const url = card?.card_images?.[0]?.image_url_small;
    if (url) res.redirect(url);
    else res.status(404).end();
  }
});

// ── Collection helpers ──────────────────────────────────────────────────────
function readCollection() {
  return JSON.parse(fs.readFileSync(COLLECTION_PATH, 'utf-8'));
}

function writeCollection(data) {
  fs.writeFileSync(COLLECTION_PATH, JSON.stringify(data, null, 3));
}

// ── Collection routes ───────────────────────────────────────────────────────
app.get('/api/collection', (req, res) => {
  try {
    res.json(readCollection());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/collection', (req, res) => {
  try {
    const entry = req.body;
    if (!entry.Name) return res.status(400).json({ error: 'Name is required' });

    // Enrich with data from local DB
    const card = CARDS_BY_NAME.get(entry.Name.toLowerCase());
    if (card) {
      entry.ID = String(card.id);
      entry.Type = card.type || '';
      entry.ATK = card.atk != null ? String(card.atk) : '';
      entry.DEF = card.def != null ? String(card.def) : '';
      entry.Level = card.level != null ? String(card.level) : '';
      entry['Card Type'] = card.race || '';
      entry.Attribute = card.attribute || '';
      entry.Archetype = card.archetype || '';
      if (card.tcg_date) {
        const d = new Date(card.tcg_date);
        entry['Earliest Date'] =
          `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
    }

    entry['In Deck'] = entry['In Deck'] || '';
    entry['Is Speed Duel'] = entry['Is Speed Duel'] || 'No';
    entry['Is Speed Duel Legal'] = entry['Is Speed Duel Legal'] || '';
    entry.Keep = entry.Keep || '';
    entry.Price = entry.Price || '';
    entry.Scale = entry.Scale || '';
    entry['Link Scale'] = entry['Link Scale'] || '';
    entry.field23 = ''; entry.field24 = ''; entry.field25 = '';

    const collection = readCollection();
    collection.push(entry);
    writeCollection(collection);
    res.json(collection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete by stable identifier: Name + Code uniquely identifies a copy.
// Falls back to index if provided and Name/Code not in body.
app.delete('/api/collection', (req, res) => {
  try {
    const { Name, Code } = req.body;
    if (!Name) return res.status(400).json({ error: 'Name is required' });
    const collection = readCollection();
    const idx = collection.findIndex(
      (c) => c.Name === Name && (Code === undefined || c.Code === Code)
    );
    if (idx === -1) return res.status(404).json({ error: 'Card not found in collection' });
    collection.splice(idx, 1);
    writeCollection(collection);
    res.json(collection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── YDK helpers ────────────────────────────────────────────────────────────
function deckNameFromFile(filename) {
  return filename.replace(/\.ydk$/, '');
}

function parseYdk(content) {
  const sections = { main: [], extra: [], side: [] };
  let current = 'main';
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line === '#main') { current = 'main'; continue; }
    if (line === '#extra') { current = 'extra'; continue; }
    if (line === '!side') { current = 'side'; continue; }
    if (line.startsWith('#') || line.startsWith('!')) continue;
    const id = parseInt(line, 10);
    if (!isNaN(id)) sections[current].push(id);
  }
  return sections;
}

function buildYdk(main, extra, side) {
  return [
    '#main',
    ...main,
    '#extra',
    ...extra,
    '!side',
    ...side,
    '',
  ].join('\n');
}

function deckBaseDir(format) {
  return format ? path.join(DECKS_DIR, format) : DECKS_DIR;
}

function metaPath(format, name) {
  return path.join(deckBaseDir(format), `${name}.meta.json`);
}

function readMeta(format, name) {
  const p = metaPath(format, name);
  if (!fs.existsSync(p)) return { built: false, records: [] };
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return { built: false, records: [] }; }
}

function writeMeta(format, name, meta) {
  fs.writeFileSync(metaPath(format, name), JSON.stringify(meta, null, 2));
}

function listDecks() {
  const result = [];

  // Root — legacy decks shown in all formats (strip any stale format field from meta)
  fs.readdirSync(DECKS_DIR)
    .filter((f) => f.endsWith('.ydk'))
    .forEach((filename) => {
      const name = deckNameFromFile(filename);
      const content = fs.readFileSync(path.join(DECKS_DIR, filename), 'utf-8');
      const { main, extra, side } = parseYdk(content);
      const { format: _drop, ...meta } = readMeta(null, name);
      result.push({ name, main, extra, side, ...meta });
    });

  // Format subdirs
  FORMAT_IDS.forEach((format) => {
    const dir = path.join(DECKS_DIR, format);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir)
      .filter((f) => f.endsWith('.ydk'))
      .forEach((filename) => {
        const name = deckNameFromFile(filename);
        const content = fs.readFileSync(path.join(dir, filename), 'utf-8');
        const { main, extra, side } = parseYdk(content);
        const meta = readMeta(format, name);
        result.push({ name, main, extra, side, format, ...meta });
      });
  });

  return result;
}

// ── Deck routes ─────────────────────────────────────────────────────────────
app.get('/api/decks', (req, res) => {
  try { res.json(listDecks()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/decks/:name', (req, res) => {
  try {
    const name = req.params.name;
    const ydkPath = path.join(DECKS_DIR, `${name}.ydk`);
    if (!fs.existsSync(ydkPath)) return res.status(404).json({ error: 'Deck not found' });
    const content = fs.readFileSync(ydkPath, 'utf-8');
    const { main, extra, side } = parseYdk(content);
    const { format: _drop, ...meta } = readMeta(null, name);
    res.json({ name, main, extra, side, ...meta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/decks', (req, res) => {
  try {
    const { name, main = [], extra = [], side = [], format } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const safeName = name.trim().replace(/[^a-zA-Z0-9 _\-().]/g, '');
    const dir = deckBaseDir(format);
    const ydkPath = path.join(dir, `${safeName}.ydk`);
    if (fs.existsSync(ydkPath)) return res.status(409).json({ error: 'Deck already exists' });
    fs.writeFileSync(ydkPath, buildYdk(main, extra, side));
    const meta = { built: false, records: [] };
    writeMeta(format, safeName, meta);
    res.json({ name: safeName, main, extra, side, ...(format && { format }), ...meta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Format-aware deck routes (decks stored in subdirs) ──────────────────────

app.get('/api/decks/:format/:name', (req, res) => {
  try {
    const { format, name } = req.params;
    const ydkPath = path.join(deckBaseDir(format), `${name}.ydk`);
    if (!fs.existsSync(ydkPath)) return res.status(404).json({ error: 'Deck not found' });
    const content = fs.readFileSync(ydkPath, 'utf-8');
    const { main, extra, side } = parseYdk(content);
    const meta = readMeta(format, name);
    res.json({ name, main, extra, side, format, ...meta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/decks/:format/:name', (req, res) => {
  try {
    const { format, name } = req.params;
    const dir = deckBaseDir(format);
    const ydkPath = path.join(dir, `${name}.ydk`);
    if (!fs.existsSync(ydkPath)) return res.status(404).json({ error: 'Deck not found' });
    const { main = [], extra = [], side = [], newName, built, records, notes } = req.body;

    if (newName && newName !== name) {
      const safeName = newName.trim().replace(/[^a-zA-Z0-9 _\-().]/g, '');
      const newYdkPath = path.join(dir, `${safeName}.ydk`);
      fs.writeFileSync(newYdkPath, buildYdk(main, extra, side));
      fs.unlinkSync(ydkPath);
      const oldMeta = readMeta(format, name);
      const newMeta = { ...oldMeta, ...(built !== undefined && { built }), ...(records !== undefined && { records }), ...(notes !== undefined && { notes }) };
      writeMeta(format, safeName, newMeta);
      const oldMetaFilePath = metaPath(format, name);
      if (fs.existsSync(oldMetaFilePath)) fs.unlinkSync(oldMetaFilePath);
      return res.json({ name: safeName, main, extra, side, format, ...newMeta });
    }

    fs.writeFileSync(ydkPath, buildYdk(main, extra, side));
    const meta = readMeta(format, name);
    if (built !== undefined) meta.built = built;
    if (records !== undefined) meta.records = records;
    if (notes !== undefined) meta.notes = notes;
    writeMeta(format, name, meta);
    res.json({ name, main, extra, side, format, ...meta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/decks/:format/:name', (req, res) => {
  try {
    const { format, name } = req.params;
    const ydkPath = path.join(deckBaseDir(format), `${name}.ydk`);
    if (!fs.existsSync(ydkPath)) return res.status(404).json({ error: 'Deck not found' });
    fs.unlinkSync(ydkPath);
    const mp = metaPath(format, name);
    if (fs.existsSync(mp)) fs.unlinkSync(mp);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Legacy deck routes (decks in root, shown in all formats) ─────────────────

app.put('/api/decks/:name', (req, res) => {
  try {
    const name = req.params.name;
    const ydkPath = path.join(DECKS_DIR, `${name}.ydk`);
    if (!fs.existsSync(ydkPath)) return res.status(404).json({ error: 'Deck not found' });
    const { main = [], extra = [], side = [], newName, built, records, notes } = req.body;

    if (newName && newName !== name) {
      const safeName = newName.trim().replace(/[^a-zA-Z0-9 _\-().]/g, '');
      const newYdkPath = path.join(DECKS_DIR, `${safeName}.ydk`);
      fs.writeFileSync(newYdkPath, buildYdk(main, extra, side));
      fs.unlinkSync(ydkPath);
      const oldMeta = readMeta(null, name);
      const newMeta = { ...oldMeta, ...(built !== undefined && { built }), ...(records !== undefined && { records }), ...(notes !== undefined && { notes }) };
      writeMeta(null, safeName, newMeta);
      const oldMetaFilePath = metaPath(null, name);
      if (fs.existsSync(oldMetaFilePath)) fs.unlinkSync(oldMetaFilePath);
      return res.json({ name: safeName, main, extra, side, ...newMeta });
    }

    fs.writeFileSync(ydkPath, buildYdk(main, extra, side));
    const meta = readMeta(null, name);
    if (built !== undefined) meta.built = built;
    if (records !== undefined) meta.records = records;
    if (notes !== undefined) meta.notes = notes;
    writeMeta(null, name, meta);
    res.json({ name, main, extra, side, ...meta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/decks/:name', (req, res) => {
  try {
    const name = req.params.name;
    const ydkPath = path.join(DECKS_DIR, `${name}.ydk`);
    if (!fs.existsSync(ydkPath)) return res.status(404).json({ error: 'Deck not found' });
    fs.unlinkSync(ydkPath);
    const mp = metaPath(null, name);
    if (fs.existsSync(mp)) fs.unlinkSync(mp);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`Server on http://localhost:${PORT}`)
);
