import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LegalityBadge from "../components/LegalityBadge";
import CardDetailModal from "../components/CardDetailModal";
import { exportDeckRecords } from "../utils/exportCsv";
import { FORMATS_BY_ID, DEFAULT_FORMAT_ID } from "../data/formats";

const SECTIONS = ["main", "extra", "side"];
const SECTION_LABELS = { main: "DECK", extra: "EXTRA DECK", side: "SIDE" };

function typeOrder(card) {
  if (!card) return 3;
  if (card.type.includes("Spell")) return 1;
  if (card.type.includes("Trap")) return 2;
  return 0;
}

function sortIds(ids, byId) {
  return [...ids].sort((a, b) => {
    const ca = byId.get(a), cb = byId.get(b);
    const td = typeOrder(ca) - typeOrder(cb);
    if (td !== 0) return td;
    return (ca?.name || "").localeCompare(cb?.name || "");
  });
}

function tcgToCollectionDate(tcgDate) {
  if (!tcgDate) return undefined;
  const d = new Date(tcgDate);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getLegalityWarnings(deck, byId, format) {
  const warnings = [];
  if (deck.main.length < 40) warnings.push(`Main deck: ${deck.main.length}/40 minimum`);
  if (deck.main.length > 60) warnings.push(`Main deck: ${deck.main.length}/60 maximum`);
  if (deck.extra.length > 15) warnings.push(`Extra: ${deck.extra.length}/15 maximum`);
  if (deck.side.length > 15) warnings.push(`Side: ${deck.side.length}/15 maximum`);
  const idCounts = {};
  [...deck.main, ...deck.extra, ...deck.side].forEach((id) => { idCounts[id] = (idCounts[id] || 0) + 1; });
  Object.entries(idCounts).forEach(([id, count]) => {
    const card = byId.get(Number(id));
    if (!card) return;
    const max = format.maxCopies(card.name);
    if (max === 0) warnings.push(`${card.name} is Forbidden`);
    else if (count > max) warnings.push(`${card.name}: ${count} copies (max ${max})`);
  });
  return warnings;
}

// Returns [{id, count, grayscale}] splitting owned vs missing copies
function splitByOwnership(ids, byId, ownedCounts) {
  const totals = new Map();
  ids.forEach((id) => totals.set(id, (totals.get(id) || 0) + 1));
  const result = [];
  const added = new Set();
  ids.forEach((id) => {
    if (added.has(id)) return;
    added.add(id);
    const count = totals.get(id);
    const card = byId.get(id);
    const owned = card ? Math.min(ownedCounts[card.name] || 0, count) : 0;
    const missing = count - owned;
    if (owned > 0) result.push({ id, count: owned, grayscale: false });
    if (missing > 0) result.push({ id, count: missing, grayscale: true });
  });
  return result;
}

function DeckStats({ deck, byId, format }) {
  const mainCards = deck.main.map((id) => byId.get(id)).filter(Boolean);
  const monsters = mainCards.filter((c) => !c.type.includes("Spell") && !c.type.includes("Trap"));
  const spells = mainCards.filter((c) => c.type.includes("Spell"));
  const traps = mainCards.filter((c) => c.type.includes("Trap"));

  const leveled = monsters.filter((c) => c.level != null && !c.type.includes("XYZ") && !c.type.includes("Link"));
  const avgLevel = leveled.length > 0
    ? (leveled.reduce((s, c) => s + c.level, 0) / leveled.length).toFixed(1)
    : null;

  const allIds = [...deck.main, ...deck.extra, ...deck.side];
  const idCounts = {};
  allIds.forEach((id) => { idCounts[id] = (idCounts[id] || 0) + 1; });

  let forbidden = 0, limited = 0, semiLimited = 0;
  Object.entries(idCounts).forEach(([id, copies]) => {
    const card = byId.get(Number(id));
    if (!card) return;
    const status = format.getStatus(card.name, card.tcg_date);
    if (status === "forbidden") forbidden++;
    else if (status === "limited" && copies > 1) limited++;
    else if (status === "semi-limited" && copies > 2) semiLimited++;
  });

  const mainCount = deck.main.length;
  const progress = Math.min(100, (mainCount / 60) * 100);
  const progressColor = mainCount < 40 ? "bg-yellow-500" : mainCount > 60 ? "bg-red-500" : "bg-green-500";

  return (
    <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-3 space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${progress}%` }} />
        </div>
        <span className={`text-xs font-mono font-bold shrink-0 ${mainCount < 40 || mainCount > 60 ? "text-amber-600" : "text-gray-400"}`}>
          {mainCount}/40–60
        </span>
      </div>
    </div>
  );
}

function DeckSection({ label, ids, count, byId, ownedCounts, onRemove, format }) {
  const entries = useMemo(() => splitByOwnership(ids, byId, ownedCounts), [ids, byId, ownedCounts]);

  if (ids.length === 0) return null;

  return (
    <div>
      <h2 className="text-xs font-bold text-gray-400 tracking-widest mb-3 uppercase">
        {label} ({count})
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(({ id, count: copies, grayscale }, i) => {
          const card = byId.get(id);
          if (!card) return null;
          const status = format.getStatus(card.name, card.tcg_date);

          return (
            <div
              key={`${id}-${i}`}
              className="relative group cursor-pointer"
              style={{ width: 102 }}
              onClick={() => onRemove(id)}
              title={`${card.name}${copies > 1 ? ` ×${copies}` : ""}${grayscale ? " (missing)" : ""}\nClick to remove one copy`}
            >
              <div className={`rounded overflow-hidden border-2 transition-colors ${grayscale ? "border-transparent" : "border-transparent group-hover:border-black"}`}>
                <img
                  src={`/images/${card.id}`}
                  alt={card.name}
                  className={`w-full block transition-all ${grayscale ? "grayscale opacity-70" : ""}`}
                  style={{ aspectRatio: "421/614" }}
                />
              </div>

              {/* Copy count badge */}
              {copies > 1 && (
                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs font-bold px-1 py-0.5 rounded leading-none">
                  ×{copies}
                </span>
              )}

              {/* Legality indicator */}
              {!grayscale && (status === "limited" || status === "semi-limited" || status === "forbidden") && (
                <span className="absolute top-1 left-1 w-7 h-7 rounded-full bg-red-600 border-[3px] border-black flex items-center justify-center text-white text-sm font-black leading-none shadow-md">
                  {status === "forbidden" ? "0" : status === "limited" ? "1" : "2"}
                </span>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded flex items-center justify-center">
                <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity text-center px-1 leading-tight">
                  ✕ Remove
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlphaView({ main, side, extra, byId, ownedCounts, onRemoveMain, onRemoveSide, onRemoveExtra, format }) {
  const alphaSorted = (ids) => [...ids].sort((a, b) => {
    const ca = byId.get(a), cb = byId.get(b);
    return (ca?.name || "").localeCompare(cb?.name || "");
  });

  const combined = useMemo(() => alphaSorted([...main, ...side]), [main, side, byId]);
  const sortedExtra = useMemo(() => alphaSorted([...extra]), [extra, byId]);

  const onRemove = (id) => {
    if (main.includes(id)) onRemoveMain(id);
    else onRemoveSide(id);
  };

  return (
    <div className="flex flex-col gap-8">
      <DeckSection
        label={`ALL (${main.length + side.length})`}
        ids={combined}
        count={main.length + side.length}
        byId={byId}
        ownedCounts={ownedCounts}
        onRemove={onRemove}
        format={format}
      />
      {extra.length > 0 && (
        <DeckSection
          label={SECTION_LABELS.extra}
          ids={sortedExtra}
          count={extra.length}
          byId={byId}
          ownedCounts={ownedCounts}
          onRemove={(id) => onRemoveExtra(id)}
          format={format}
        />
      )}
    </div>
  );
}

export default function DeckBuilder({ deckState, collectionState, cardDb, formatState }) {
  const { name: encodedName } = useParams();
  const name = decodeURIComponent(encodedName);
  const navigate = useNavigate();
  const { getDeck, updateDeck, addCard } = deckState;
  const { ownedCounts } = collectionState;
  const { byId, cards } = cardDb;
  const format = formatState?.format || FORMATS_BY_ID[DEFAULT_FORMAT_ID];

  const [query, setQuery] = useState("");
  const [addSection, setAddSection] = useState("main");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState("search"); // "search" | "records"
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "alpha"
  const [recordForm, setRecordForm] = useState({ date: new Date().toISOString().slice(0, 10), wins: "", losses: "", note: "" });
  const [addingRecord, setAddingRecord] = useState(false);

  const deck = getDeck(name);

  // Live search — restricted to cards legal in the active format
  useEffect(() => {
    if (!query.trim() || cards.length === 0) { setSearchResults([]); return; }
    const q = query.toLowerCase();
    setSearchResults(
      cards
        .filter((c) => format.getStatus(c.name, c.tcg_date) !== "not-legal")
        .filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, 24)
    );
  }, [query, cards, format]);

  const handleRemoveOne = useCallback((section, id) => {
    if (!deck) return;
    const idx = deck[section].indexOf(id);
    if (idx === -1) return;
    const updated = [...deck[section]];
    updated.splice(idx, 1);
    updateDeck(name, { ...deck, [section]: updated });
  }, [deck, name, updateDeck]);

  const handleAddCard = useCallback((card) => {
    addCard(name, addSection, card.id);
  }, [name, addSection, addCard]);

  const handleAddRecord = useCallback(async (e) => {
    e.preventDefault();
    if (!deck) return;
    const record = {
      date: recordForm.date,
      wins: parseInt(recordForm.wins, 10) || 0,
      losses: parseInt(recordForm.losses, 10) || 0,
      note: recordForm.note.trim(),
    };
    const records = [...(deck.records || []), record];
    await updateDeck(name, { ...deck, records });
    setRecordForm({ date: new Date().toISOString().slice(0, 10), wins: "", losses: "", note: "" });
    setAddingRecord(false);
  }, [deck, name, updateDeck, recordForm]);

  const handleDeleteRecord = useCallback(async (idx) => {
    if (!deck) return;
    const records = (deck.records || []).filter((_, i) => i !== idx);
    await updateDeck(name, { ...deck, records });
  }, [deck, name, updateDeck]);

  if (!deck) {
    return (
      <p className="text-gray-500 text-sm">
        Deck not found.{" "}
        <button onClick={() => navigate("/decks")} className="underline text-black">Back</button>
      </p>
    );
  }

  const warnings = getLegalityWarnings(deck, byId, format);

  return (
    <div className="flex h-full gap-0 -m-8">
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          ownedCount={ownedCounts[selectedCard.name] || 0}
          format={format}
        />
      )}
      {/* Deck view area */}
      <div className="flex-1 bg-white flex flex-col min-w-0">
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/decks")} className="text-gray-400 hover:text-black text-sm transition-colors">
              ← Decks
            </button>
            <h1
              className="font-bold text-black text-lg cursor-pointer hover:underline"
              onClick={() => {
                const newName = prompt("New deck name:", name);
                if (newName?.trim() && newName.trim() !== name) {
                  updateDeck(name, { ...deck, newName: newName.trim() })
                    .then((u) => u && navigate(u.format
                      ? `/decks/${u.format}/${encodeURIComponent(u.name)}`
                      : `/decks/${encodeURIComponent(u.name)}`));
                }
              }}
            >
              {name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {warnings.length > 0 && (
              <span className="text-amber-600 text-xs">{warnings.length} warning{warnings.length > 1 ? "s" : ""}</span>
            )}
            <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs">
              {[["grid", "Sections"], ["alpha", "A–Z"]].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 transition-colors ${viewMode === mode ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPanelOpen((o) => !o)}
              className="text-xs border border-gray-300 text-gray-500 hover:border-black hover:text-black px-3 py-1.5 rounded-md transition-colors"
            >
              {panelOpen ? "Hide Search" : "Add Cards"}
            </button>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {warnings.map((w, i) => (
              <span key={i} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-1 rounded">{w}</span>
            ))}
          </div>
        )}

        {/* Deck sections */}
        {viewMode === "grid" ? (
          <>
            <DeckSection
              label={SECTION_LABELS.main}
              ids={sortIds(deck.main, byId)}
              count={deck.main.length}
              byId={byId}
              ownedCounts={ownedCounts}
              onRemove={(id) => handleRemoveOne("main", id)}
              format={format}
            />
            <DeckSection
              label={SECTION_LABELS.extra}
              ids={sortIds(deck.extra, byId)}
              count={deck.extra.length}
              byId={byId}
              ownedCounts={ownedCounts}
              onRemove={(id) => handleRemoveOne("extra", id)}
              format={format}
            />
            <DeckSection
              label={SECTION_LABELS.side}
              ids={sortIds(deck.side, byId)}
              count={deck.side.length}
              byId={byId}
              ownedCounts={ownedCounts}
              onRemove={(id) => handleRemoveOne("side", id)}
              format={format}
            />
          </>
        ) : (
          <AlphaView
            main={deck.main}
            side={deck.side}
            extra={deck.extra}
            byId={byId}
            ownedCounts={ownedCounts}
            onRemoveMain={(id) => handleRemoveOne("main", id)}
            onRemoveSide={(id) => handleRemoveOne("side", id)}
            onRemoveExtra={(id) => handleRemoveOne("extra", id)}
            format={format}
          />
        )}

        {deck.main.length === 0 && deck.extra.length === 0 && deck.side.length === 0 && (
          <p className="text-gray-400 text-sm">Search for cards on the right to add them to your deck.</p>
        )}
      </div>
      </div>

      {/* Search panel */}
      {panelOpen && (
        <div className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col">
          {/* Panel tabs */}
          <div className="flex border-b border-gray-100">
            {["search", "records"].map((tab) => (
              <button
                key={tab}
                onClick={() => setPanelTab(tab)}
                className={`flex-1 py-3 text-xs font-medium capitalize transition-colors ${
                  panelTab === tab ? "text-black border-b-2 border-black" : "text-gray-400 hover:text-black"
                }`}
              >
                {tab === "records"
                  ? `Records (${deck.records?.length || 0})`
                  : "Add Cards"}
              </button>
            ))}
          </div>

          {panelTab === "search" && (
            <>
              <div className="p-4 border-b border-gray-100 space-y-2">
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black"
                  autoFocus
                />
                <div className="flex gap-1">
                  {SECTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setAddSection(s)}
                      className={`flex-1 text-xs py-1.5 rounded-md capitalize transition-colors ${
                        addSection === s ? "bg-black text-white" : "border border-gray-200 text-gray-500 hover:border-black hover:text-black"
                      }`}
                    >
                      {s} ({deck[s].length})
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {searchResults.map((card) => {
                  const allIds = [...deck.main, ...deck.extra, ...deck.side];
                  const copiesInDeck = allIds.filter((id) => id === card.id).length;
                  const max = format.maxCopies(card.name);
                  const atLimit = copiesInDeck >= 3;
                  const owned = ownedCounts[card.name] || 0;
                  const status = format.getStatus(card.name, card.tcg_date);
                  const imageUrl = `/images/${card.id}`;
                  return (
                    <div key={card.id} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 hover:bg-gray-50 group">
                      <div className="w-10 shrink-0 cursor-pointer" onClick={() => setSelectedCard(card)}>
                        {imageUrl ? (
                          <img src={imageUrl} alt={card.name} className="w-full rounded hover:opacity-80 transition-opacity" style={{ aspectRatio: "421/614" }} />
                        ) : (
                          <div className="bg-gray-100 rounded" style={{ aspectRatio: "421/614" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-black font-medium leading-tight truncate">{card.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <LegalityBadge status={status} />
                          {owned > 0 && <span className="text-xs text-gray-400">Own {owned}</span>}
                          {copiesInDeck > 0 && <span className="text-xs text-gray-400">In: {copiesInDeck}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => !atLimit && handleAddCard(card)}
                        disabled={atLimit}
                        className={`text-xs px-2 py-1 rounded-md shrink-0 transition-colors ${
                          atLimit ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800 text-white"
                        }`}
                      >
                        {atLimit ? "Max" : "+"}
                      </button>
                    </div>
                  );
                })}
                {query && searchResults.length === 0 && <p className="text-gray-400 text-xs text-center py-8">No results</p>}
                {!query && <p className="text-gray-300 text-xs text-center py-8">Type to search cards</p>}
              </div>
            </>
          )}

          {panelTab === "records" && (() => {
            const records = deck.records || [];
            const totalWins = records.reduce((s, r) => s + r.wins, 0);
            const totalLosses = records.reduce((s, r) => s + r.losses, 0);
            const totalGames = totalWins + totalLosses;
            const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : null;

            return (
              <>
                {/* Aggregate stats */}
                {records.length > 0 && (
                  <div className="p-4 border-b border-gray-100 flex gap-4 items-center">
                    <div className="text-center">
                      <p className="text-lg font-bold text-black">{totalWins}-{totalLosses}</p>
                      <p className="text-xs text-gray-400">Record</p>
                    </div>
                    {winRate !== null && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-black">{winRate}%</p>
                        <p className="text-xs text-gray-400">Win rate</p>
                      </div>
                    )}
                    <button
                      onClick={() => exportDeckRecords(name, records)}
                      className="ml-auto text-xs border border-gray-300 hover:border-black text-gray-500 hover:text-black px-2 py-1 rounded-md transition-colors"
                    >
                      Export CSV
                    </button>
                  </div>
                )}

                {/* Add record form */}
                <div className="p-4 border-b border-gray-100">
                  {!addingRecord ? (
                    <button
                      onClick={() => setAddingRecord(true)}
                      className="w-full text-xs bg-black hover:bg-gray-800 text-white py-2 rounded-md transition-colors"
                    >
                      + Add Result
                    </button>
                  ) : (
                    <form onSubmit={handleAddRecord} className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Wins</label>
                          <input
                            type="number" min="0" value={recordForm.wins}
                            onChange={(e) => setRecordForm((f) => ({ ...f, wins: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:border-black"
                            placeholder="0" required
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Losses</label>
                          <input
                            type="number" min="0" value={recordForm.losses}
                            onChange={(e) => setRecordForm((f) => ({ ...f, losses: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:border-black"
                            placeholder="0" required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Date</label>
                        <input
                          type="date" value={recordForm.date}
                          onChange={(e) => setRecordForm((f) => ({ ...f, date: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:border-black"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Event / Note</label>
                        <input
                          type="text" value={recordForm.note}
                          onChange={(e) => setRecordForm((f) => ({ ...f, note: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:border-black"
                          placeholder="e.g. Local tournament"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-black hover:bg-gray-800 text-white py-1.5 rounded-md text-xs transition-colors">Save</button>
                        <button type="button" onClick={() => setAddingRecord(false)} className="flex-1 border border-gray-300 hover:border-black text-black py-1.5 rounded-md text-xs transition-colors">Cancel</button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Record history */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                  {records.length === 0 && (
                    <p className="text-gray-300 text-xs text-center py-8">No results yet</p>
                  )}
                  {[...records].reverse().map((r, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-gray-50 group flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-black">{r.wins}W – {r.losses}L</p>
                        <p className="text-xs text-gray-400">{r.date}{r.note ? ` · ${r.note}` : ""}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteRecord(records.length - 1 - i)}
                        className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
