# Task List

Dependencies: arrows show blocked-by relationships (→ means "blocked by")

---

## In Progress

### #8 — Redesign UI to clean white/black minimal style
Replace the dark purple theme with a clean, minimal light UI:
- White background, light gray surfaces
- Black filled buttons (rounded), black borders on inputs/selects
- Dark gray body text, black headings
- Thin light gray dividers
- No color accents except legality badges
- Clean sans-serif typography with generous whitespace

---

## Pending

### #1 — Run app and verify all pages work end-to-end
Start the dev server and test all four features in the browser:
- Card Search: search returns results, legality badges show, owned count shows, add-to-deck works
- Deck Builder: create a deck, search and add cards, warnings appear for illegal cards
- Collection: table loads, filter works, add card modal works, delete works
- Confirm no console errors

### #2 — Fix collection delete — use stable identifier instead of page index
Currently DELETE /api/collection/:index uses the row's position in the filtered+paginated view, which is unreliable (off-by-one if page > 0, or if filter is active). Should pass a stable identifier — either the absolute index in the raw collection array or a unique field combo (Name + Code) — to the server so the right entry is deleted.

### #3 — Verify Edison banlist against the ygo-collection spreadsheet
The banlist in client/src/data/edisonBanlist.js was reconstructed from memory. The authoritative source is the user's Google Sheets (banlist1/2/3 URLs in ygo-collection/secret/collectionread.json). Need to compare the hardcoded list against the actual spreadsheet data and fix any discrepancies.

### #4 — Add card detail modal with full card text
Clicking a card image/name should open a modal showing: full-size card image, card description/effect text, ATK/DEF/Level, type/attribute/race, Edison legality status, and how many copies are in the collection. Useful in Search and DeckBuilder pages.

### #6 — Add deck stats panel to deck builder
Show a stats summary panel in the deck builder:
- Monster / Spell / Trap counts
- Average level of monsters
- Count of each Edison legality status (how many limited, semi-limited, etc.)
- Main deck size progress bar (40–60 legal range)

### #7 — Add "owned only" filter to collection page
Add a toggle/filter to the Collection page that groups cards by name (unique cards view) rather than showing every individual copy. Also add a filter to show only Edison-legal cards, so you can quickly see your Edison-playable pool.

### #9 — Add local card database to avoid YGOPro API dependency
Download the full YGOPro card database locally so the app works offline and doesn't hit rate limits.
- Fetch all cards from the YGOPro API once and store as a local JSON file (served by Express)
- Add a script to refresh the local DB on demand
- Update card search and lookup routes to query the local file instead of proxying to the API
- Keep images loading from the YGOPro CDN (image URLs are embedded in the card data)

### #10 — Store decks as YDK files on disk instead of localStorage
Replace localStorage deck storage with a server-managed directory of .ydk files:
- Decks live in a configurable directory (e.g. /Users/pepe/deck-manager/decks/)
- Express exposes CRUD routes for listing, reading, creating, updating, and deleting .ydk files
- Any .ydk file dropped into that directory shows up automatically in the Decks page
- YDK format: card IDs in #main, #extra, !side sections (standard YGOPro format)
- Deck name comes from the filename (without .ydk extension)
- Remove the useDecks localStorage hook and replace with API calls

### #11 — Show missing card count per deck on the decks list
On the Decks page, each deck card should show how many cards in that deck you don't own (or don't have enough copies of) based on the collection.json.
- Cross-reference each card in the deck (by name) against owned copies in the collection
- A card is "missing" if the deck requires more copies than you own
- Show a "X missing" indicator on the deck card — prominently if > 0, greyed out if complete

### #12 — Add "Build" button that locks a deck and updates missing counters across all others
→ blocked by #11

On the Decks page, each deck gets a "Build" button. When pressed:
- That deck is marked as "built" (persist state alongside the .ydk file)
- The cards in that deck are subtracted from the available pool
- All other decks' missing card counters recalculate assuming built-deck cards are no longer available
- Multiple decks can be built simultaneously
- Pressing "Build" again un-builds it and restores those cards to the pool

### #13 — Add Buylist page showing cards needed to complete all decks
→ blocked by #11, #12

A dedicated Buylist page that aggregates all missing cards across all unbuilt decks:
- Lists every card that is missing from any deck, with how many copies are needed in total
- Indicates which deck(s) each card is needed for
- Each card row has a "Bought" button — adds that card to collection.json (prompts for set/code/rarity)
- Bought-but-not-yet-added cards tracked in a local buylist.json
- Respects built/unbuilt deck state

### #14 — Add HAT, Dino Rabbit, and REDU formats with their banlists
→ blocked by #9

Extend the app to support multiple retro formats:
- HAT (Hand-Artifact-Traptrix) — July 2014 banlist/cardpool cutoff
- Dino Rabbit — March 2012 banlist/cardpool cutoff
- REDU (Return of the Duelist) — September 2012 banlist/cardpool cutoff

For each format: hardcode the banlist, apply the correct card pool cutoff date. Refactor edisonBanlist.js into a shared format system. Local card DB must cover all cards up to HAT cutoff.

### #15 — Redesign deck view to show cards as a visual grid with full card images
Redesign the DeckBuilder page to match the reference image:
- Cards displayed as a flowing grid of full card images
- Duplicate copies collapsed into one image with copy count badge (e.g. "2x", "3x")
- Sections with headers: "DECK (40)", "EXTRA (0)", "SIDE (15)"
- Cards wrap naturally across rows
- Hovering a card shows name and remove button
- Search panel stays accessible as a sidebar or toggle
- Dark background for the deck area to make card art pop

### #16 — Card search filters live as you type — no search button
→ blocked by #9

- On page load, show all cards from the local DB by default
- Results update automatically as user types or changes any filter (debounced ~200ms)
- Remove the Search button entirely
- Pagination or virtual scrolling needed for the full card list

### #17 — Add match record tracking per deck
Each deck can have a match history log:
- Record entry: date, wins (int), losses (int), optional note/event name
- Decks list shows aggregate record (e.g. "9-0")
- Deck view shows full record history as a table
- Button to add a new record entry
- Records stored as a sidecar JSON file alongside the .ydk file
- Aggregate stats: total wins, total losses, win rate %

### #18 — Export deck win rates and match records to CSV
→ blocked by #17

- "Export CSV" button on Deck view exports that deck's full record history
- Global "Export All" exports a summary CSV: one row per deck with total wins, losses, win rate %
- CSV download handled client-side (Blob + download trigger)

### #19 — Add global format selector that filters all views accordingly
→ blocked by #14

Add a prominent format dropdown in the nav (replacing the "Edison Deck Manager" label):
- Options: Edison, Dino Rabbit, REDU, HAT
- Selected format persisted to localStorage
- All views update: legality badges, deck warnings, collection filter, buylist — all reflect active format


### 20 - Task: Store card images locally
Download and store card images on disk so the app works fully
offline without depending on the YGOProDeck CDN. The download
script (server/scripts/downloadCards.js) should fetch each card's
image and save it to a local directory (e.g.
server/data/images/<cardId>.jpg). The Express server should serve
them via a /images/:id route. All references to image_url_small in
the client should point to this local route instead of the CDN
URL.

### 21 Task - Trim card database to HAT cutoff date
The local card DB (server/data/cards.json) currently contains all
14,476 cards including post-2014 cards that are irrelevant to any
supported format. Filter the download script to only include cards
with a tcg_date on or before the HAT cutoff (July 8, 2014). This reduces DB
size and noise in search results. Cards with no dates stay.
