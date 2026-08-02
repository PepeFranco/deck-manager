import { useMemo, useState } from "react";
import CardDetailModal from "../components/CardDetailModal";
import RarityTag from "../components/RarityTag";


export default function Pool({ deckState, cardDb, collectionState, formatState }) {
  const { decks } = deckState;
  const { byId } = cardDb;
  const { ownedCounts, collection } = collectionState;
  const format = formatState?.format;
  const isAll = format?.id === "all";
  const [selectedCard, setSelectedCard] = useState(null);
  const [mode, setMode] = useState("all"); // "all" | "any2" | "performat"

  const formatDecks = useMemo(
    () => isAll ? decks : decks.filter((d) => !d.format || d.format === format?.id),
    [decks, format, isAll]
  );

  // Normalize raw deck IDs to canonical card.id, counting copies per card
  const deckCounts = (ids) => {
    const counts = {};
    ids.forEach((id) => {
      const card = byId.get(id);
      if (!card) return;
      counts[card.id] = (counts[card.id] || 0) + 1;
    });
    return counts;
  };

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
      const needed = deckCounts([...deck.main, ...deck.extra, ...deck.side]);
      return Object.entries(needed).every(([cid, count]) => {
        const card = byId.get(Number(cid));
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
      const counts = deckCounts([...deck.main, ...deck.extra, ...deck.side]);
      Object.entries(counts).forEach(([cid, count]) => {
        const card = byId.get(Number(cid));
        if (!totals[cid]) totals[cid] = { card, total: 0 };
        totals[cid].total += count;
      });
    });
    return Object.values(totals).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [formatDecks, byId]);

  // Max copies per card across any single deck
  const any1Cards = useMemo(() => {
    const maxByCard = {};
    formatDecks.forEach((deck) => {
      const counts = deckCounts([...deck.main, ...deck.extra, ...deck.side]);
      Object.entries(counts).forEach(([cid, count]) => {
        const card = byId.get(Number(cid));
        if (!maxByCard[cid] || count > maxByCard[cid].total) maxByCard[cid] = { card, total: count };
      });
    });
    return Object.values(maxByCard).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [formatDecks, byId]);

  // Max copies per card across any single complete deck
  const any1CompleteCards = useMemo(() => {
    const maxByCard = {};
    completeDecks.forEach((deck) => {
      const counts = deckCounts([...deck.main, ...deck.extra, ...deck.side]);
      Object.entries(counts).forEach(([cid, count]) => {
        const card = byId.get(Number(cid));
        if (!maxByCard[cid] || count > maxByCard[cid].total) maxByCard[cid] = { card, total: count };
      });
    });
    return Object.values(maxByCard).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [completeDecks, byId]);

  // Top-2 copies per card (worst-case pair across all decks)
  const any2Cards = useMemo(() => {
    const countsByCard = {};
    formatDecks.forEach((deck) => {
      const counts = deckCounts([...deck.main, ...deck.extra, ...deck.side]);
      Object.entries(counts).forEach(([cid, count]) => {
        const card = byId.get(Number(cid));
        if (!countsByCard[cid]) countsByCard[cid] = { card, counts: [] };
        countsByCard[cid].counts.push(count);
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
        const combined = deckCounts([...d1.main, ...d1.extra, ...d1.side, ...d2.main, ...d2.extra, ...d2.side]);
        const canBuild = Object.entries(combined).every(([cid, count]) => {
          const card = byId.get(Number(cid));
          if (!card) return true;
          return (ownedCounts[card.name] || 0) >= count;
        });
        if (!canBuild) continue;
        Object.entries(combined).forEach(([cid, count]) => {
          const card = byId.get(Number(cid));
          if (!card) return;
          if (!worstCase[cid] || count > worstCase[cid].total) worstCase[cid] = { card, total: count };
        });
      }
    }
    return Object.values(worstCase).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [completeDecks, byId, ownedCounts]);

  // Worst-case pool across all triples of complete decks that can be sleeved simultaneously
  const any3CompleteCards = useMemo(() => {
    if (completeDecks.length < 3) return [];
    const worstCase = {};
    for (let i = 0; i < completeDecks.length; i++) {
      for (let j = i + 1; j < completeDecks.length; j++) {
        for (let k = j + 1; k < completeDecks.length; k++) {
          const d1 = completeDecks[i], d2 = completeDecks[j], d3 = completeDecks[k];
          const combined = deckCounts([...d1.main, ...d1.extra, ...d1.side, ...d2.main, ...d2.extra, ...d2.side, ...d3.main, ...d3.extra, ...d3.side]);
          const canBuild = Object.entries(combined).every(([cid, count]) => {
            const card = byId.get(Number(cid));
            if (!card) return true;
            return (ownedCounts[card.name] || 0) >= count;
          });
          if (!canBuild) continue;
          Object.entries(combined).forEach(([cid, count]) => {
            const card = byId.get(Number(cid));
            if (!card) return;
            if (!worstCase[cid] || count > worstCase[cid].total) worstCase[cid] = { card, total: count };
          });
        }
      }
    }
    return Object.values(worstCase).sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [completeDecks, byId, ownedCounts]);

  const poolCards =
    mode === "any1" ? any1Cards :
    mode === "any1complete" ? any1CompleteCards :
    mode === "any2" ? any2Cards :
    mode === "any2complete" ? any2CompleteCards :
    mode === "any3complete" ? any3CompleteCards :
    allDecksCards;

  const ownedPrintsByName = useMemo(() => {
    const map = {};
    collection.forEach((entry) => {
      if (!map[entry.Name]) map[entry.Name] = [];
      map[entry.Name].push(entry);
    });
    return map;
  }, [collection]);

  const completeCount = completeDecks.length;

  const EXTRA_FRAME_TYPES = new Set(["fusion", "synchro", "xyz", "link", "synchro_pendulum", "xyz_pendulum", "fusion_pendulum"]);
  const cardKind = (card) => {
    if (EXTRA_FRAME_TYPES.has(card.frameType)) return "extra";
    if (card.type === "Spell Card") return "spell";
    if (card.type === "Trap Card") return "trap";
    return "monster";
  };

  const byLetter = useMemo(() => {
    const groups = {};
    poolCards.forEach((entry) => {
      const letter = entry.card.name[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(entry);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [poolCards]);

  const totalCounts = useMemo(() => {
    const c = { monster: 0, spell: 0, trap: 0, extra: 0 };
    poolCards.forEach(({ card }) => c[cardKind(card)]++);
    return c;
  }, [poolCards]);

  const tabs = isAll
    ? [["all", "All decks"], ["any1", "Any 1 deck"], ["any2", "Any 2 decks"], ["any1complete", "Any 1 complete deck"], ["any2complete", "Any 2 complete decks"], ["any3complete", "Any 3 complete decks"]]
    : [["all", "All decks"], ["any1", "Any 1 deck"], ["any2", "Any 2 decks"], ["any1complete", "Any 1 complete deck"], ["any2complete", "Any 2 complete decks"]];

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
        <div className="flex border border-gray-200 rounded-md overflow-hidden">
          {tabs.map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-2 text-sm transition-colors ${mode === m ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-0.5">
        <p className="text-gray-400 text-xs">
          {poolCards.length} unique cards ({poolCards.reduce((s, c) => s + c.total, 0)} total) across{" "}
          {(mode === "any1complete" || mode === "any2complete" || mode === "any3complete")
            ? `${completeCount} complete deck${completeCount !== 1 ? "s" : ""}`
            : `${formatDecks.length} deck${formatDecks.length !== 1 ? "s" : ""}`}
        </p>
        <p className="text-gray-400 text-xs">
          {[
            totalCounts.monster && `${totalCounts.monster} monsters`,
            totalCounts.spell && `${totalCounts.spell} spells`,
            totalCounts.trap && `${totalCounts.trap} traps`,
            totalCounts.extra && `${totalCounts.extra} extra`,
          ].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="space-y-8">
        {byLetter.map(([letter, entries]) => {
          const counts = { monster: 0, spell: 0, trap: 0, extra: 0 };
          entries.forEach(({ card }) => counts[cardKind(card)]++);
          const countStr = [
            counts.monster && `${counts.monster} monsters`,
            counts.spell && `${counts.spell} spells`,
            counts.trap && `${counts.trap} traps`,
            counts.extra && `${counts.extra} extra`,
          ].filter(Boolean).join(" · ");
          return (
            <div key={letter}>
              <div className="flex items-baseline gap-2 mb-2 border-b border-gray-100 pb-1">
                <span className="text-sm font-bold text-black">{letter}</span>
                <span className="text-xs text-gray-400">{countStr}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
                {entries.flatMap(({ card, total }) => {
                  const owned = Math.min(ownedCounts[card.name] || 0, total);
                  const missing = total - owned;
                  const tiles = [];
                  if (owned > 0) tiles.push({ count: owned, grayscale: false });
                  if (missing > 0) tiles.push({ count: missing, grayscale: true });
                  return tiles.map(({ count, grayscale }) => {
                    const prints = !grayscale ? (ownedPrintsByName[card.name] || []) : [];
                    return (
                      <div
                        key={`${card.id}-${grayscale ? "m" : "o"}`}
                        className="cursor-pointer group"
                        onClick={() => setSelectedCard(card)}
                      >
                        <div className="relative rounded overflow-hidden border border-gray-200 group-hover:border-black transition-colors">
                          <img
                            src={`/images/${card.id}`}
                            alt={card.name}
                            className={`w-full block${grayscale ? " grayscale opacity-70" : ""}`}
                            style={{ aspectRatio: "421/614", objectFit: "cover" }}
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-sm font-bold px-2.5 py-1 rounded leading-none">
                            ×{count}
                          </span>
                        </div>
                        {prints.length > 0 && (
                          <div className="mt-1 space-y-0.5 px-0.5">
                            {prints.map((p, i) => (
                              <div key={i} className="flex items-center gap-1 min-w-0">
                                <span className="text-[9px] text-gray-500 leading-none truncate flex-1">{p.Code}</span>
                                <RarityTag rarity={p.Rarity} short={true} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
