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

  // Cards consumed by built decks (for accurate missing calculation)
  const consumed = useMemo(() => {
    const map = {};
    decks.filter((d) => d.built).forEach((d) => {
      [...d.main, ...d.extra, ...d.side].forEach((id) => {
        const card = byId.get(id);
        if (card) map[card.name] = (map[card.name] || 0) + 1;
      });
    });
    return map;
  }, [decks, byId]);

  // Decks where all cards are owned
  const completeDecks = useMemo(() => {
    if (!byId.size) return [];
    return formatDecks.filter((deck) => {
      if (!deck.main.length) return false;
      const needed = {};
      [...deck.main, ...deck.extra, ...deck.side].forEach((id) => {
        needed[id] = (needed[id] || 0) + 1;
      });
      return Object.entries(needed).every(([id, count]) => {
        const card = byId.get(Number(id));
        if (!card) return true;
        const available = Math.max(0, (ownedCounts[card.name] || 0) - (consumed[card.name] || 0));
        return available >= count;
      });
    });
  }, [formatDecks, byId, ownedCounts, consumed]);

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
    return Object.values(totals).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [formatDecks, byId]);

  // Max copies per card across any single deck
  const any1Cards = useMemo(() => {
    const maxByCard = {};
    formatDecks.forEach((deck) => {
      const idCounts = {};
      [...deck.main, ...deck.extra, ...deck.side].forEach((id) => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      Object.entries(idCounts).forEach(([id, count]) => {
        const card = byId.get(Number(id));
        if (!card) return;
        if (!maxByCard[id] || count > maxByCard[id].total) maxByCard[id] = { card, total: count };
      });
    });
    return Object.values(maxByCard).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [formatDecks, byId]);

  // Max copies per card across any single complete deck
  const any1CompleteCards = useMemo(() => {
    const maxByCard = {};
    completeDecks.forEach((deck) => {
      const idCounts = {};
      [...deck.main, ...deck.extra, ...deck.side].forEach((id) => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      Object.entries(idCounts).forEach(([id, count]) => {
        const card = byId.get(Number(id));
        if (!card) return;
        if (!maxByCard[id] || count > maxByCard[id].total) maxByCard[id] = { card, total: count };
      });
    });
    return Object.values(maxByCard).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [completeDecks, byId]);

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
      .sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [formatDecks, byId]);

  // Worst-case pool across all pairs of complete decks that can be sleeved simultaneously
  const any2CompleteCards = useMemo(() => {
    if (completeDecks.length < 2) return [];
    const worstCase = {};
    for (let i = 0; i < completeDecks.length; i++) {
      for (let j = i + 1; j < completeDecks.length; j++) {
        const d1 = completeDecks[i];
        const d2 = completeDecks[j];
        const combined = {};
        [...d1.main, ...d1.extra, ...d1.side, ...d2.main, ...d2.extra, ...d2.side].forEach((id) => {
          combined[id] = (combined[id] || 0) + 1;
        });
        const canBuild = Object.entries(combined).every(([id, count]) => {
          const card = byId.get(Number(id));
          if (!card) return true;
          return (ownedCounts[card.name] || 0) >= count;
        });
        if (!canBuild) continue;
        Object.entries(combined).forEach(([id, count]) => {
          const card = byId.get(Number(id));
          if (!card) return;
          if (!worstCase[id] || count > worstCase[id].total) worstCase[id] = { card, total: count };
        });
      }
    }
    return Object.values(worstCase).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [completeDecks, byId, ownedCounts]);

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
    return Object.values(totalByCard).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [decks, byId]);

  const poolCards =
    mode === "any1" ? any1Cards :
    mode === "any1complete" ? any1CompleteCards :
    mode === "any2" ? any2Cards :
    mode === "any2complete" ? any2CompleteCards :
    mode === "performat" ? perFormatCards :
    allDecksCards;

  const completeCount = completeDecks.length;

  const tabs = isAll
    ? [["all", "All decks"], ["any1", "Any 1 deck"], ["any1complete", "Any 1 complete deck"], ["any2", "Any 2 decks"], ["any2complete", "Any 2 complete decks"], ["performat", "1 per format"]]
    : [["all", "All decks"], ["any1", "Any 1 deck"], ["any1complete", "Any 1 complete deck"], ["any2", "Any 2 decks"], ["any2complete", "Any 2 complete decks"]];

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
        {poolCards.length} unique cards across{" "}
        {(mode === "any1complete" || mode === "any2complete")
          ? `${completeCount} complete deck${completeCount !== 1 ? "s" : ""}`
          : `${formatDecks.length} deck${formatDecks.length !== 1 ? "s" : ""}`}
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
