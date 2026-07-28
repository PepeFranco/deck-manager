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
  const [viewMode, setViewMode] = useState("grid");
  const [showSimultaneous, setShowSimultaneous] = useState(false);

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
          {pending.length > 0 && (
            <button
              onClick={() => {
                const text = pending.map((c) => `${c.needed}x ${c.name}`).join("\n");
                navigator.clipboard.writeText(text).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className="border border-gray-300 hover:border-black text-gray-600 hover:text-black px-3 py-2 rounded-md text-sm transition-colors"
            >
              {copied ? "Copied!" : "Copy list"}
            </button>
          )}
          <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs">
            {[["grid", "Grid"], ["list", "List"]].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 transition-colors ${viewMode === mode ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-black">{pending.length}</p>
            <p className="text-xs text-gray-400">cards to buy</p>
          </div>
        </div>
      </div>

      {pending.length === 0 && boughtList.length === 0 && (
        <p className="text-gray-400 text-sm">
          {unbuiltDecks.length === 0
            ? "All decks are marked as built."
            : "Your collection covers all cards in your unbuilt decks."}
        </p>
      )}

      {groupedByPriority.map(({ priority, cards: groupCards }) => (
        <div key={priority} className="space-y-3">
          <div className="flex items-baseline gap-2 pb-2 border-b border-gray-100">
            <h2 className="font-semibold text-black text-sm">
              {priority === 1 ? "Completes a deck" : `${priority} missing from nearest deck`}
            </h2>
            <span className="text-xs text-gray-400">{groupCards.length} card{groupCards.length !== 1 ? "s" : ""}</span>
          </div>

          {viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-3 text-gray-400 font-medium text-xs pr-4">Card</th>
                    <th className="pb-3 text-gray-400 font-medium text-xs pr-4">Need</th>
                    <th className="pb-3 text-gray-400 font-medium text-xs pr-4">Decks</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupCards.map((item) => (
                    <tr key={item.name} className="group hover:bg-gray-50">
                      <td className="py-2.5 pr-4 text-black font-medium">{item.name}</td>
                      <td className="py-2.5 pr-4 text-gray-600 text-xs">×{item.needed}</td>
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">{item.decks.join(", ")}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setAddingCard(item.name)}
                            className="text-xs bg-black hover:bg-gray-800 text-white px-2 py-1 rounded-md transition-colors"
                          >
                            Bought
                          </button>
                          <button
                            onClick={() => markBought(item.name)}
                            className="text-xs border border-gray-300 hover:border-black text-gray-600 hover:text-black px-2 py-1 rounded-md transition-colors"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => navigate(`/decks?missing=${encodeURIComponent(item.name)}&incomplete=1`)}
                            className="text-xs border border-gray-300 hover:border-black text-gray-600 hover:text-black px-2 py-1 rounded-md transition-colors"
                          >
                            Decks
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(153px,1fr))] gap-2">
              {groupCards.map((item) => {
                const card = byName.get(item.name);
                return (
                  <div key={item.name} className="relative group cursor-pointer" onClick={() => card && setSelectedCard(card)}>
                    <div className="relative aspect-[421/614] bg-gray-100 rounded overflow-hidden border border-gray-200">
                      {card ? (
                        <img
                          src={`/images/${card.id}`}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] p-1 text-center leading-tight">
                          {item.name}
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 bg-red-600 text-white text-sm font-bold px-2.5 py-1 rounded leading-none">
                        ×{item.needed}
                      </span>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setAddingCard(item.name); }}
                          className="w-full text-[11px] bg-white hover:bg-gray-100 text-black font-medium py-1 rounded transition-colors"
                        >
                          Bought
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); markBought(item.name); }}
                          className="w-full text-[11px] border border-white/60 hover:border-white text-white py-1 rounded transition-colors"
                        >
                          Skip
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/decks?missing=${encodeURIComponent(item.name)}&incomplete=1`); }}
                          className="w-full text-[11px] border border-white/60 hover:border-white text-white py-1 rounded transition-colors"
                        >
                          Decks
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5 leading-tight line-clamp-2 px-0.5">{item.name}</p>
                  </div>
                );
              })}
            </div>
          )}
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

      {unbuiltDecks.length > 1 && (
        <div className="border-t border-gray-100 pt-6">
          <button
            onClick={() => setShowSimultaneous((v) => !v)}
            className="flex items-center justify-between w-full text-left group"
          >
            <div>
              <h2 className="text-sm font-semibold text-black">Build any 2 decks simultaneously</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {simultaneousCards.length} additional card{simultaneousCards.length !== 1 ? "s" : ""} needed to sleeve any pair of decks
              </p>
            </div>
            <span className="text-gray-400 text-sm">{showSimultaneous ? "▲" : "▼"}</span>
          </button>

          {showSimultaneous && (
            <div className="mt-4 overflow-x-auto">
              {simultaneousCards.length === 0 ? (
                <p className="text-gray-400 text-sm">You already own enough copies to sleeve any 2 decks at once.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="pb-3 text-gray-400 font-medium text-xs pr-4">Card</th>
                      <th className="pb-3 text-gray-400 font-medium text-xs pr-4">Need total</th>
                      <th className="pb-3 text-gray-400 font-medium text-xs pr-4">Own</th>
                      <th className="pb-3 text-gray-400 font-medium text-xs pr-4">Still need</th>
                      <th className="pb-3 text-gray-400 font-medium text-xs">Decks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {simultaneousCards.map((item) => (
                      <tr key={item.name} className="hover:bg-gray-50">
                        <td className="py-2.5 pr-4 text-black font-medium">{item.name}</td>
                        <td className="py-2.5 pr-4 text-gray-600 text-xs">×{item.needed}</td>
                        <td className="py-2.5 pr-4 text-gray-400 text-xs">×{item.owned}</td>
                        <td className="py-2.5 pr-4 text-red-500 text-xs font-medium">×{item.short}</td>
                        <td className="py-2.5 text-gray-400 text-xs">{item.decks.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
