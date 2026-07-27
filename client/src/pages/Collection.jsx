import { useState, useEffect, useMemo } from "react";
import LegalityBadge from "../components/LegalityBadge";
import CardTile from "../components/CardTile";
import CardDetailModal from "../components/CardDetailModal";
import { FORMATS_BY_ID, DEFAULT_FORMAT_ID } from "../data/formats";

const EDITIONS = ["", "1st", "LIMITED"];

const ADD_RARITIES = ["Common", "Rare", "Super Rare", "Ultra Rare", "Secret Rare", "Ultimate Rare", "Ghost Rare", "Starfoil Rare", "Mosaic Rare", "Gold Rare", "Premium Gold Rare", "Collector's Rare"];

function AddCardModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ Name: "", Code: "", Set: "", Rarity: "Common", Edition: "" });
  const [suggestions, setSuggestions] = useState([]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const searchName = async (q) => {
    if (q.length < 3) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/cards/search?fname=${encodeURIComponent(q)}&num=8`);
      const data = await res.json();
      setSuggestions(data.data?.map((c) => c.name) || []);
    } catch { setSuggestions([]); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-lg space-y-4">
        <h2 className="text-black font-bold text-lg">Add Card</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!form.Name.trim()) return; onAdd(form); onClose(); }}
          className="space-y-3"
        >
          <div className="relative">
            <label className="text-xs text-gray-500 block mb-1">Card Name *</label>
            <input
              type="text"
              value={form.Name}
              onChange={(e) => { set("Name", e.target.value); searchName(e.target.value); }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
              placeholder="e.g. Dark Armed Dragon"
              required
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 max-h-40 overflow-y-auto shadow-sm">
                {suggestions.map((s) => (
                  <li
                    key={s}
                    className="px-3 py-2 text-sm text-black hover:bg-gray-50 cursor-pointer"
                    onClick={() => { set("Name", s); setSuggestions([]); }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Set Code</label>
              <input
                type="text"
                value={form.Code}
                onChange={(e) => set("Code", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                placeholder="e.g. TSHD-EN040"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Set Name</label>
              <input
                type="text"
                value={form.Set}
                onChange={(e) => set("Set", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                placeholder="e.g. The Shining Darkness"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Rarity</label>
              <select
                value={form.Rarity}
                onChange={(e) => set("Rarity", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black bg-white"
              >
                {ADD_RARITIES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Edition</label>
              <select
                value={form.Edition}
                onChange={(e) => set("Edition", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black bg-white"
              >
                {EDITIONS.map((ed) => <option key={ed} value={ed}>{ed || "Unlimited"}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-black hover:bg-gray-800 text-white py-2 rounded-md text-sm font-medium transition-colors">
              Add
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 hover:border-black text-black py-2 rounded-md text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Collection({ collectionState, formatState, cardDb }) {
  const { collection, loading, error, fetchCollection, addCard, deleteCard, ownedCounts } = collectionState;
  const format = formatState?.format || FORMATS_BY_ID[DEFAULT_FORMAT_ID];
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "list" | "grid"
  const [selectedCard, setSelectedCard] = useState(null);
  const [page, setPage] = useState(0);
  const [gridPage, setGridPage] = useState(0);
  const PAGE_SIZE = 100;
  const GRID_PAGE_SIZE = 48;

  const rarities = useMemo(() => {
    const vals = new Set(collection.map((c) => c.Rarity).filter(Boolean));
    return [...vals].sort();
  }, [collection]);

  useEffect(() => { fetchCollection(); }, [fetchCollection]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedFilter(filter); setPage(0); setGridPage(0); }, 200);
    return () => clearTimeout(t);
  }, [filter]);

  const filtered = useMemo(() => {
    let rows = collection;
    if (debouncedFilter.trim()) {
      const q = debouncedFilter.toLowerCase();
      rows = rows.filter((c) => c.Name?.toLowerCase().includes(q));
    }
    if (rarityFilter) rows = rows.filter((c) => c.Rarity === rarityFilter);
    rows = rows.filter((c) => {
      const s = format.getStatus(c.Name, c["Earliest Date"]
        ? (() => { const [d, m, y] = c["Earliest Date"].split("/"); return `${y}-${m}-${d}`; })()
        : null);
      return s !== "not-legal";
    });
    return rows;
  }, [collection, debouncedFilter, rarityFilter, format]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const ownedPrintsMap = useMemo(() => {
    const map = {};
    collection.forEach((entry) => {
      if (!entry.Name) return;
      const key = `${entry.Code || ""}|${entry.Rarity || ""}`;
      if (!map[entry.Name]) map[entry.Name] = {};
      if (!map[entry.Name][key]) map[entry.Name][key] = { code: entry.Code || "", rarity: entry.Rarity || "", count: 0 };
      map[entry.Name][key].count++;
    });
    return Object.fromEntries(Object.entries(map).map(([name, prints]) => [name, Object.values(prints)]));
  }, [collection]);

  const gridCards = useMemo(() => {
    setGridPage(0);
    if (!cardDb?.cards) return [];
    let list = cardDb.cards.filter((c) => (ownedCounts[c.name] || 0) > 0);
    if (debouncedFilter.trim()) {
      const q = debouncedFilter.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.desc?.toLowerCase().includes(q)
      );
    }
    if (rarityFilter) {
      const namesWithRarity = new Set(
        collection.filter((c) => c.Rarity === rarityFilter).map((c) => c.Name)
      );
      list = list.filter((c) => namesWithRarity.has(c.name));
    }
    list = list.filter((c) => format.getStatus(c.name, c.tcg_date) !== "not-legal");
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [cardDb?.cards, ownedCounts, collection, debouncedFilter, rarityFilter, format]);

  const gridTotalPages = Math.ceil(gridCards.length / GRID_PAGE_SIZE);
  const gridPagedCards = gridCards.slice(gridPage * GRID_PAGE_SIZE, (gridPage + 1) * GRID_PAGE_SIZE);

  const handleAdd = async (entry) => {
    try { await addCard(entry); }
    catch (err) { alert(err.message); }
  };

  const handleDelete = async (card) => {
    if (!confirm(`Remove "${card.Name}" (${card.Code || "no code"}) from your collection?`)) return;
    try { await deleteCard(card.Name, card.Code); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
      {showModal && <AddCardModal onAdd={handleAdd} onClose={() => setShowModal(false)} />}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          ownedCount={ownedCounts[selectedCard.name] || 0}
          ownedPrints={ownedPrintsMap[selectedCard.name]}
          format={format}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">
          Collection{" "}
          <span className="text-gray-400 font-normal text-base">({collection.length.toLocaleString()} copies)</span>
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs">
            {[["list", "List"], ["grid", "Grid"]].map(([mode, label]) => (
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
            onClick={() => setShowModal(true)}
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Add Card
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Filter by name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black flex-1 min-w-48 bg-white"
        />
        <select
          value={rarityFilter}
          onChange={(e) => { setRarityFilter(e.target.value); setPage(0); }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-black bg-white"
        >
          <option value="">All Rarities</option>
          {rarities.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!loading && (
        <p className="text-gray-400 text-xs">
          {viewMode === "grid" ? gridCards.length.toLocaleString() : filtered.length.toLocaleString()} results
        </p>
      )}

      {viewMode === "grid" ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {gridPagedCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                ownedCount={ownedCounts[card.name] || 0}
                ownedPrints={ownedPrintsMap[card.name]}
                onClick={() => setSelectedCard(card)}
                format={format}
              />
            ))}
          </div>
          {gridTotalPages > 1 && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setGridPage((p) => Math.max(0, p - 1))}
                disabled={gridPage === 0}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:border-black hover:text-black disabled:opacity-30 transition-colors text-xs"
              >
                Previous
              </button>
              <span className="text-gray-400 text-xs">Page {gridPage + 1} of {gridTotalPages}</span>
              <button
                onClick={() => setGridPage((p) => Math.min(gridTotalPages - 1, p + 1))}
                disabled={gridPage === gridTotalPages - 1}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:border-black hover:text-black disabled:opacity-30 transition-colors text-xs"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  {["Name", "Code", "Set", "Rarity", "Ed.", "Edison"].map((h) => (
                    <th key={h} className="pb-3 text-gray-400 font-medium text-xs pr-4">{h}</th>
                  ))}
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((card, i) => {
                  const status = format.getStatus(
                    card.Name,
                    card["Earliest Date"]
                      ? (() => { const [d, m, y] = card["Earliest Date"].split("/"); return `${y}-${m}-${d}`; })()
                      : null
                  );
                  return (
                    <tr key={i} className="group hover:bg-gray-50">
                      <td className="py-2.5 pr-4 text-black font-medium">{card.Name}</td>
                      <td className="py-2.5 pr-4 text-gray-400 font-mono text-xs">{card.Code}</td>
                      <td className="py-2.5 pr-4 text-gray-500 text-xs max-w-48 truncate">{card.Set}</td>
                      <td className="py-2.5 pr-4 text-gray-600 text-xs">{card.Rarity}</td>
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">{card.Edition || "Unl"}</td>
                      <td className="py-2.5 pr-4"><LegalityBadge status={status} /></td>
                      <td className="py-2.5">
                        <button
                          onClick={() => handleDelete(card)}
                          className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-3 text-sm pt-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:border-black hover:text-black disabled:opacity-30 transition-colors text-xs"
              >
                Previous
              </button>
              <span className="text-gray-400 text-xs">Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:border-black hover:text-black disabled:opacity-30 transition-colors text-xs"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
