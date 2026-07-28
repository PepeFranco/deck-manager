import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CardDetailModal from "../components/CardDetailModal";
import LegalityBadge from "../components/LegalityBadge";

const BOUGHT_KEY = "buylist_bought";

function loadBought() {
  try { return new Set(JSON.parse(localStorage.getItem(BOUGHT_KEY)) || []); }
  catch { return new Set(); }
}
function saveBought(set) {
  localStorage.setItem(BOUGHT_KEY, JSON.stringify([...set]));
}

const RARITIES = ["Common", "Rare", "Super", "Ultra", "Secret", "Ultimate", "Ghost"];
const EDITIONS = ["", "1st", "LIMITED"];

function AddToCollectionModal({ cardName, onAdd, onClose }) {
  const [form, setForm] = useState({ Code: "", Set: "", Rarity: "Common", Edition: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-sm shadow-lg space-y-4">
        <h2 className="text-black font-bold text-base">Add "{cardName}" to collection</h2>
        <form onSubmit={(e) => { e.preventDefault(); onAdd({ Name: cardName, ...form }); onClose(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Set Code</label>
              <input type="text" value={form.Code} onChange={(e) => set("Code", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black" placeholder="e.g. LOB-001" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Set Name</label>
              <input type="text" value={form.Set} onChange={(e) => set("Set", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black" placeholder="Set name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Rarity</label>
              <select value={form.Rarity} onChange={(e) => set("Rarity", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black bg-white">
                {RARITIES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Edition</label>
              <select value={form.Edition} onChange={(e) => set("Edition", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black bg-white">
                {EDITIONS.map((ed) => <option key={ed} value={ed}>{ed || "Unlimited"}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-black hover:bg-gray-800 text-white py-2 rounded-md text-sm font-medium transition-colors">Add to Collection</button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 hover:border-black text-black py-2 rounded-md text-sm transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Buylist({ deckState, collectionState, cardDb, formatState }) {
  const { decks } = deckState;
  const { ownedCounts, addCard } = collectionState;
  const { byId, cards } = cardDb;
  const format = formatState?.format;
  const navigate = useNavigate();

  const byName = useMemo(() => {
    const m = new Map();
    (cards || []).forEach((c) => m.set(c.name, c));
    return m;
  }, [cards]);

  const [bought, setBought] = useState(loadBought);
  const [copied, setCopied] = useState(false);
  const [addingCard, setAddingCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [buyMode, setBuyMode] = useState("any1");

  const unbuiltDecks = decks.filter((d) => !d.built && (format?.id === "all" || !d.format || d.format === format?.id));

  // Cards consumed by built decks
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

  // Aggregate missing cards across all unbuilt decks
  const missingCards = useMemo(() => {
    const needed = {}; // cardName -> { needed: count, decks: Set }
    unbuiltDecks.forEach((deck) => {
      const idCounts = {};
      [...deck.main, ...deck.extra, ...deck.side].forEach((id) => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      Object.entries(idCounts).forEach(([id, count]) => {
        const card = byId.get(Number(id));
        if (!card) return;
        const owned = ownedCounts[card.name] || 0;
        const used = consumed[card.name] || 0;
        const available = Math.max(0, owned - used);
        const short = count - available;
        if (short > 0) {
          if (!needed[card.name]) needed[card.name] = { needed: 0, decks: new Set() };
          needed[card.name].needed = Math.max(needed[card.name].needed, short);
          needed[card.name].decks.add(deck.name);
        }
      });
    });
    return Object.entries(needed)
      .map(([name, info]) => ({ name, needed: info.needed, decks: [...info.decks] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [unbuiltDecks, byId, ownedCounts, consumed]);

  const pending = missingCards.filter((c) => !bought.has(c.name));
  const boughtList = missingCards.filter((c) => bought.has(c.name));

  // How many cards each deck is still short (for priority ordering)
  const deckMissingCounts = useMemo(() => {
    const result = {};
    unbuiltDecks.forEach((deck) => {
      let missing = 0;
      const idCounts = {};
      [...deck.main, ...deck.extra, ...deck.side].forEach((id) => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      Object.entries(idCounts).forEach(([id, count]) => {
        const card = byId.get(Number(id));
        if (!card) return;
        const owned = ownedCounts[card.name] || 0;
        const used = consumed[card.name] || 0;
        const available = Math.max(0, owned - used);
        if (available < count) missing += count - available;
      });
      result[deck.name] = missing;
    });
    return result;
  }, [unbuiltDecks, byId, ownedCounts, consumed]);

  // Group pending cards by how many cards their nearest deck is still missing
  // Priority 1 = buying this card completes a deck, 2 = one more needed after, etc.
  const groupedByPriority = useMemo(() => {
    const groups = new Map();
    pending.forEach((item) => {
      const priority = Math.min(...item.decks.map((d) => deckMissingCounts[d] ?? Infinity));
      if (!isFinite(priority)) return;
      if (!groups.has(priority)) groups.set(priority, []);
      groups.get(priority).push(item);
    });
    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([priority, cards]) => ({ priority, cards }));
  }, [pending, deckMissingCounts]);

  // Cards needed to sleeve any 2 unbuilt decks at the same time (worst-case pair per card)
  const simultaneousCards = useMemo(() => {
    const countsByCard = {}; // cardName -> [copies per deck]
    const decksByCard = {};
    unbuiltDecks.forEach((deck) => {
      const idCounts = {};
      [...deck.main, ...deck.extra, ...deck.side].forEach((id) => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      Object.entries(idCounts).forEach(([id, count]) => {
        const card = byId.get(Number(id));
        if (!card) return;
        if (!countsByCard[card.name]) countsByCard[card.name] = [];
        countsByCard[card.name].push(count);
        if (!decksByCard[card.name]) decksByCard[card.name] = new Set();
        decksByCard[card.name].add(deck.name);
      });
    });
    return Object.entries(countsByCard)
      .map(([name, counts]) => {
        const sorted = [...counts].sort((a, b) => b - a);
        const needed = sorted[0] + (sorted[1] || 0); // top 2 decks
        const owned = ownedCounts[name] || 0;
        const used = consumed[name] || 0;
        const available = Math.max(0, owned - used);
        const short = needed - available;
        return { name, needed, owned: available, short, decks: [...decksByCard[name]] };
      })
      .filter((c) => c.short > 0)
      .sort((a, b) => a.short - b.short || a.name.localeCompare(b.name));
  }, [unbuiltDecks, byId, ownedCounts, consumed]);

  // Group any2 pending cards by total cards missing from their nearest pair of decks
  const any2GroupedByPriority = useMemo(() => {
    const pairTotals = {}; // deckName -> { otherDeckName: totalMissing }
    for (let i = 0; i < unbuiltDecks.length; i++) {
      for (let j = i + 1; j < unbuiltDecks.length; j++) {
        const d1 = unbuiltDecks[i];
        const d2 = unbuiltDecks[j];
        const combined = {};
        [...d1.main, ...d1.extra, ...d1.side, ...d2.main, ...d2.extra, ...d2.side].forEach((id) => {
          combined[id] = (combined[id] || 0) + 1;
        });
        let total = 0;
        Object.entries(combined).forEach(([id, count]) => {
          const card = byId.get(Number(id));
          if (!card) return;
          const available = Math.max(0, (ownedCounts[card.name] || 0) - (consumed[card.name] || 0));
          total += Math.max(0, count - available);
        });
        if (!pairTotals[d1.name]) pairTotals[d1.name] = {};
        if (!pairTotals[d2.name]) pairTotals[d2.name] = {};
        pairTotals[d1.name][d2.name] = total;
        pairTotals[d2.name][d1.name] = total;
      }
    }
    const any2Pending = simultaneousCards.filter((c) => !bought.has(c.name));
    const groups = new Map();
    any2Pending.forEach((item) => {
      let minPairTotal = Infinity;
      item.decks.forEach((deckName) => {
        const pairs = pairTotals[deckName];
        if (pairs) Object.values(pairs).forEach((t) => { minPairTotal = Math.min(minPairTotal, t); });
      });
      if (!isFinite(minPairTotal)) return;
      if (!groups.has(minPairTotal)) groups.set(minPairTotal, []);
      groups.get(minPairTotal).push(item);
    });
    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([priority, cards]) => ({ priority, cards }));
  }, [simultaneousCards, unbuiltDecks, byId, ownedCounts, consumed, bought]);

  const markBought = (name) => {
    const next = new Set(bought);
    next.add(name);
    setBought(next);
    saveBought(next);
  };

  const unmarkBought = (name) => {
    const next = new Set(bought);
    next.delete(name);
    setBought(next);
    saveBought(next);
  };

  const handleAddToCollection = async (entry) => {
    try {
      await addCard(entry);
      markBought(entry.Name);
    } catch (err) {
      alert(err.message);
    }
  };

  if (!byId.size) {
    return <p className="text-gray-400 text-sm">Loading card database...</p>;
  }

  return (
    <div className="space-y-6">
      {addingCard && (
        <AddToCollectionModal
          cardName={addingCard}
          onAdd={handleAddToCollection}
          onClose={() => setAddingCard(null)}
        />
      )}
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
          <h1 className="text-2xl font-bold text-black">Buylist</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Missing cards across {unbuiltDecks.length} unbuilt deck{unbuiltDecks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {(() => {
            const any2Pending = simultaneousCards.filter((c) => !bought.has(c.name));
            const activePending = buyMode === "any2" ? any2Pending : pending;
            const copyText = buyMode === "any2"
              ? any2Pending.map((c) => `${c.short}x ${c.name}`).join("\n")
              : pending.map((c) => `${c.needed}x ${c.name}`).join("\n");
            return (
              <>
                {activePending.length > 0 && (
                  <button
                    onClick={() => navigator.clipboard.writeText(copyText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
                    className="border border-gray-300 hover:border-black text-gray-600 hover:text-black px-3 py-2 rounded-md text-sm transition-colors"
                  >
                    {copied ? "Copied!" : "Copy list"}
                  </button>
                )}
                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                  {[["any1", "Any 1 deck"], ["any2", "Any 2 decks"]].map(([m, label]) => (
                    <button
                      key={m}
                      onClick={() => setBuyMode(m)}
                      className={`px-3 py-2 text-sm transition-colors ${buyMode === m ? "bg-black text-white" : "text-gray-600 hover:text-black"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-black">{activePending.length}</p>
                  <p className="text-xs text-gray-400">cards to buy</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {pending.length === 0 && boughtList.length === 0 && (
        <p className="text-gray-400 text-sm">
          {unbuiltDecks.length === 0
            ? "All decks are marked as built."
            : "Your collection covers all cards in your unbuilt decks."}
        </p>
      )}

      {buyMode === "any1" && groupedByPriority.map(({ priority, cards: groupCards }) => (
        <div key={priority} className="space-y-3">
          <div className="flex items-baseline gap-2 pb-2 border-b border-gray-100">
            <h2 className="font-semibold text-black text-sm">
              {priority === 1 ? "Completes a deck" : `${priority} missing from nearest deck`}
            </h2>
            <span className="text-xs text-gray-400">{groupCards.length} card{groupCards.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
            {groupCards.map((item) => {
              const card = byName.get(item.name);
              return (
                <div key={item.name} className="relative group cursor-pointer" onClick={() => card && setSelectedCard(card)}>
                  <div className="relative aspect-[421/614] bg-gray-100 rounded overflow-hidden border border-gray-200">
                    {card ? (
                      <img src={`/images/${card.id}`} alt={card.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] p-1 text-center leading-tight">{item.name}</div>
                    )}
                    <span className="absolute bottom-1 right-1 bg-red-600 text-white text-sm font-bold px-2.5 py-1 rounded leading-none">×{item.needed}</span>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                      <button onClick={(e) => { e.stopPropagation(); setAddingCard(item.name); }} className="w-full text-[11px] bg-white hover:bg-gray-100 text-black font-medium py-1 rounded transition-colors">Bought</button>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/decks?missing=${encodeURIComponent(item.name)}&incomplete=1`); }} className="w-full text-[11px] border border-white/60 hover:border-white text-white py-1 rounded transition-colors">Decks</button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5 leading-tight line-clamp-2 px-0.5">{item.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {buyMode === "any2" && any2GroupedByPriority.map(({ priority, cards: groupCards }) => (
        <div key={priority} className="space-y-3">
          <div className="flex items-baseline gap-2 pb-2 border-b border-gray-100">
            <h2 className="font-semibold text-black text-sm">
              {priority === 1 ? "Completes a pair of decks" : `${priority} missing from nearest pair`}
            </h2>
            <span className="text-xs text-gray-400">{groupCards.length} card{groupCards.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
            {groupCards.map((item) => {
              const card = byName.get(item.name);
              return (
                <div key={item.name} className="relative group cursor-pointer" onClick={() => card && setSelectedCard(card)}>
                  <div className="relative aspect-[421/614] bg-gray-100 rounded overflow-hidden border border-gray-200">
                    {card ? (
                      <img src={`/images/${card.id}`} alt={card.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] p-1 text-center leading-tight">{item.name}</div>
                    )}
                    <span className="absolute bottom-1 right-1 bg-red-600 text-white text-sm font-bold px-2.5 py-1 rounded leading-none">×{item.short}</span>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                      <button onClick={(e) => { e.stopPropagation(); setAddingCard(item.name); }} className="w-full text-[11px] bg-white hover:bg-gray-100 text-black font-medium py-1 rounded transition-colors">Bought</button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5 leading-tight line-clamp-2 px-0.5">{item.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {boughtList.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-2">Marked as bought ({boughtList.length})</h2>
          <div className="space-y-1">
            {boughtList.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 group">
                <span className="text-sm text-gray-400 line-through">{item.name}</span>
                <button
                  onClick={() => unmarkBought(item.name)}
                  className="text-xs text-gray-300 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Undo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
