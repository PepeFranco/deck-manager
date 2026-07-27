import { useMemo, useState } from "react";
import CardDetailModal from "../components/CardDetailModal";
import { RETRO_FORMAT_IDS } from "../data/formats";

export default function Pool({ deckState, cardDb, collectionState, formatState }) {
  const { decks } = deckState;
  const { byId } = cardDb;
  const { ownedCounts } = collectionState;
  const format = formatState?.format;
  const isAll = format?.id === "all";
  const [selectedCard, setSelectedCard] = useState(null);
  const [mode, setMode] = useState("all"); // "all" | "any2" | "performat"

  const formatDecks = useMemo(
    () => isAll ? decks : decks.filter((d) => !d.format || d.format === format?.id),
    [decks, format, isAll]
  );

  // Sum total copies across all decks
  const allDecksCards = useMemo(() => {
    const totals = {};
    formatDecks.forEach((deck) => {
      const idCounts = {};
      [...deck.main, ...deck.extra, ...deck.side].forEach((id) => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      Object.entries(idCounts).forEach(([id, count]) => {
        const card = byId.get(Number(id));
        if (!card) return;
        if (!totals[id]) totals[id] = { card, total: 0 };
        totals[id].total += count;
      });
    });
    return Object.values(totals).sort((a, b) => b.total - a.total || a.card.name.localeCompare(b.card.name));
  }, [formatDecks, byId]);

  // Top-2 copies per card (worst-case pair across all decks)
  const any2Cards = useMemo(() => {
    const countsByCard = {};
    formatDecks.forEach((deck) => {
      const idCounts = {};
      [...deck.main, ...deck.extra, ...deck.side].forEach((id) => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      Object.entries(idCounts).forEach(([id, count]) => {
        const card = byId.get(Number(id));
        if (!card) return;
        if (!countsByCard[id]) countsByCard[id] = { card, counts: [] };
        countsByCard[id].counts.push(count);
      });
    });
    return Object.values(countsByCard)
      .map(({ card, counts }) => {
        const sorted = [...counts].sort((a, b) => b - a);
        return { card, total: sorted[0] + (sorted[1] || 0) };
      })
      .sort((a, b) => b.total - a.total || a.card.name.localeCompare(b.card.name));
  }, [formatDecks, byId]);

  // Max copies per format, summed — worst case for building 1 deck from each format
  const perFormatCards = useMemo(() => {
    const totalByCard = {};
    RETRO_FORMAT_IDS.forEach((fmtId) => {
      const fmtDecks = decks.filter((d) => d.format === fmtId);
      if (fmtDecks.length === 0) return;
      const maxByCard = {};
      fmtDecks.forEach((deck) => {
        const idCounts = {};
        [...deck.main, ...deck.extra, ...deck.side].forEach((id) => {
          idCounts[id] = (idCounts[id] || 0) + 1;
        });
        Object.entries(idCounts).forEach(([id, count]) => {
          maxByCard[id] = Math.max(maxByCard[id] || 0, count);
        });
      });
      Object.entries(maxByCard).forEach(([id, max]) => {
        const card = byId.get(Number(id));
        if (!card) return;
        if (!totalByCard[id]) totalByCard[id] = { card, total: 0 };
        totalByCard[id].total += max;
      });
    });
    return Object.values(totalByCard).sort((a, b) => b.total - a.total || a.card.name.localeCompare(b.card.name));
  }, [decks, byId]);

  const poolCards = mode === "any2" ? any2Cards : mode === "performat" ? perFormatCards : allDecksCards;

  const tabs = isAll
    ? [["all", "All decks"], ["any2", "Any 2 decks"], ["performat", "1 per format"]]
    : [["all", "All decks"], ["any2", "Any 2 decks"]];

  return (
    <div className="space-y-6">
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          ownedCount={ownedCounts[selectedCard.name] || 0}
          format={format}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Card Pool</h1>
          {format && <p className="text-gray-400 text-sm mt-0.5">{format.label}</p>}
        </div>
        <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs">
          {tabs.map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 transition-colors ${mode === m ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-gray-400 text-xs">
        {poolCards.length} unique cards across {formatDecks.length} deck{formatDecks.length !== 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(102px,1fr))] gap-2">
        {poolCards.flatMap(({ card, total }) => {
          const owned = Math.min(ownedCounts[card.name] || 0, total);
          const missing = total - owned;
          const tiles = [];
          if (owned > 0) tiles.push({ count: owned, grayscale: false });
          if (missing > 0) tiles.push({ count: missing, grayscale: true });
          return tiles.map(({ count, grayscale }) => (
            <div
              key={`${card.id}-${grayscale ? "m" : "o"}`}
              className="relative cursor-pointer group"
              onClick={() => setSelectedCard(card)}
            >
              <div className="rounded overflow-hidden border border-gray-200 group-hover:border-black transition-colors">
                <img
                  src={`/images/${card.id}`}
                  alt={card.name}
                  className={`w-full block${grayscale ? " grayscale opacity-70" : ""}`}
                  style={{ aspectRatio: "421/614", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-sm font-bold px-2.5 py-1 rounded leading-none">
                ×{count}
              </span>
            </div>
          ));
        })}
      </div>
    </div>
  );
}
