import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { exportAllDecks } from "../utils/exportCsv";

// Returns { cardName -> totalCopiesConsumedByBuiltDecks }
function buildConsumedPool(decks, byId) {
  const consumed = {};
  decks.filter((d) => d.built).forEach((d) => {
    [...d.main, ...d.extra, ...d.side].forEach((id) => {
      const card = byId.get(id);
      if (!card) return;
      consumed[card.name] = (consumed[card.name] || 0) + 1;
    });
  });
  return consumed;
}

// Pick up to 3 monsters that appear in the fewest other decks (most unique across all decks)
function getPreviewCards(deck, byId, allDecks) {
  // Count how many decks each card ID appears in
  const deckFreq = {};
  allDecks.forEach((d) => {
    const seen = new Set([...d.main, ...d.extra]);
    seen.forEach((id) => { deckFreq[id] = (deckFreq[id] || 0) + 1; });
  });

  // Deduplicate this deck's monsters and sort by cross-deck frequency ascending
  const seen = new Set();
  return [...deck.main, ...deck.extra]
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      const card = byId.get(id);
      return card && !card.type?.includes("Spell") && !card.type?.includes("Trap");
    })
    .sort((a, b) => (deckFreq[a] || 0) - (deckFreq[b] || 0))
    .slice(0, 3)
    .map((id) => byId.get(id));
}

// Returns number of cards missing from a deck given available pool
function countMissing(deck, byId, ownedCounts, consumed) {
  if (!byId.size) return null;
  const needed = {};
  [...deck.main, ...deck.extra, ...deck.side].forEach((id) => {
    needed[id] = (needed[id] || 0) + 1;
  });
  let missing = 0;
  Object.entries(needed).forEach(([id, count]) => {
    const card = byId.get(Number(id));
    if (!card) return;
    const owned = ownedCounts[card.name] || 0;
    const usedByBuilt = consumed[card.name] || 0;
    const available = Math.max(0, owned - usedByBuilt);
    if (available < count) missing += count - available;
  });
  return missing;
}

export default function Decks({ deckState, collectionState, cardDb, formatState }) {
  const { decks, createDeck, deleteDeck, updateDeck } = deckState;
  const { ownedCounts } = collectionState;
  const { byId } = cardDb;
  const format = formatState?.format;
  const navigate = useNavigate();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [showComplete, setShowComplete] = useState(false);

  const consumed = useMemo(() => buildConsumedPool(decks, byId), [decks, byId]);

  const formatDecks = useMemo(
    () => format?.id === "all" ? decks : decks.filter((d) => !d.format || d.format === format?.id),
    [decks, format]
  );

  const visibleDecks = useMemo(() => {
    let result = formatDecks;
    if (showComplete) {
      result = result.filter((d) => {
        const missing = countMissing(d, byId, ownedCounts, d.built ? {} : consumed);
        return missing === 0 && d.main.length > 0;
      });
    }
    return [...result].sort((a, b) => {
      const ma = countMissing(a, byId, ownedCounts, a.built ? {} : consumed) ?? 0;
      const mb = countMissing(b, byId, ownedCounts, b.built ? {} : consumed) ?? 0;
      return ma - mb;
    });
  }, [formatDecks, showComplete, byId, ownedCounts, consumed]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreateError("");
    try {
      const deckName = await createDeck(newName.trim(), format?.id === "all" ? undefined : format?.id);
      setNewName("");
      setCreating(false);
      navigate(format?.id
        ? `/decks/${format.id}/${encodeURIComponent(deckName)}`
        : `/decks/${encodeURIComponent(deckName)}`);
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const toggleBuild = async (e, deck) => {
    e.stopPropagation();
    await updateDeck(deck.name, {
      main: deck.main,
      extra: deck.extra,
      side: deck.side,
      built: !deck.built,
      records: deck.records,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">My Decks</h1>
          {format && <p className="text-gray-400 text-sm mt-0.5">{format.label}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowComplete((v) => !v)}
            className={`px-3 py-2 rounded-md text-sm transition-colors border ${showComplete ? "bg-black text-white border-black" : "border-gray-300 text-gray-600 hover:border-black hover:text-black"}`}
          >
            Complete only
          </button>
          {visibleDecks.some((d) => (d.records || []).length > 0) && (
            <button
              onClick={() => exportAllDecks(decks)}
              className="border border-gray-300 hover:border-black text-gray-600 hover:text-black px-3 py-2 rounded-md text-sm transition-colors"
            >
              Export CSV
            </button>
          )}
          <button
            onClick={() => { setCreating(true); setCreateError(""); }}
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            New Deck
          </button>
        </div>
      </div>

      {creating && (
        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Deck name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black flex-1 bg-white"
            />
            <button onClick={handleCreate} className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm transition-colors">Create</button>
            <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-black px-3 py-2 text-sm transition-colors">Cancel</button>
          </div>
          {createError && <p className="text-red-500 text-xs">{createError}</p>}
        </div>
      )}

      {visibleDecks.length === 0 && !creating && (
        <p className="text-gray-400 text-sm">
          {showComplete
            ? "No complete decks in this format."
            : decks.length > 0
              ? `No decks for ${format?.label ?? "this format"}.`
              : <>No decks yet. Drop a .ydk file into the <code className="bg-gray-100 px-1 rounded">decks/</code> folder or create one here.</>}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleDecks.map((deck) => {
          const missing = countMissing(deck, byId, ownedCounts, deck.built ? {} : consumed);
          const previewCards = getPreviewCards(deck, byId, decks);
          const records = deck.records || [];
          const totalW = records.reduce((s, r) => s + r.wins, 0);
          const totalL = records.reduce((s, r) => s + r.losses, 0);
          const totalGames = totalW + totalL;
          const winRate = totalGames > 0 ? Math.round((totalW / totalGames) * 100) : null;
          return (
            <a
              key={deck.name}
              href={deck.format
                ? `/decks/${deck.format}/${encodeURIComponent(deck.name)}`
                : `/decks/${encodeURIComponent(deck.name)}`}
              onClick={(e) => { e.preventDefault(); navigate(deck.format
                ? `/decks/${deck.format}/${encodeURIComponent(deck.name)}`
                : `/decks/${encodeURIComponent(deck.name)}`); }}
              className={`block border rounded-lg p-5 hover:border-black transition-colors cursor-pointer group bg-white no-underline ${deck.built ? "border-black" : "border-gray-200"}`}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-black group-hover:underline truncate">{deck.name}</h2>
                    {deck.built && (
                      <span className="text-xs bg-black text-white px-1.5 py-0.5 rounded shrink-0">Built</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Main: {deck.main.length} · Extra: {deck.extra.length} · Side: {deck.side.length}
                  </p>
                  {totalGames > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {totalW}W–{totalL}L
                      {winRate !== null && <span className="ml-1 text-gray-300">({winRate}%)</span>}
                    </p>
                  )}
                  {missing !== null && missing > 0 && (
                    <p className="text-xs text-red-500 font-medium mt-1">{missing} missing</p>
                  )}
                  {missing === 0 && deck.main.length > 0 && (
                    <p className="text-xs text-green-600 font-medium mt-1">Complete</p>
                  )}
                </div>
                {previewCards.length > 0 && (
                  <div className="flex items-end shrink-0">
                    {previewCards.map((card, i) => (
                      <div
                        key={card.id}
                        className="rounded overflow-hidden border border-white shadow-sm shrink-0"
                        style={{ marginLeft: i === 0 ? 0 : -10, zIndex: i, width: 67 }}
                      >
                        <img
                          src={`/images/${card.id}`}
                          alt={card.name}
                          className="w-full block"
                          style={{ aspectRatio: "421/614", objectFit: "cover" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => toggleBuild(e, deck)}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                      deck.built
                        ? "border-black bg-black text-white hover:bg-gray-800"
                        : "border-gray-300 text-gray-600 hover:border-black hover:text-black"
                    }`}
                  >
                    {deck.built ? "Unbuild" : "Build"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${deck.name}"?`)) deleteDeck(deck.name); }}
                    className="text-gray-300 hover:text-red-500 text-xs transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
