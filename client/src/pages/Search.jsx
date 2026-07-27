import { useState, useEffect, useMemo } from "react";
import CardTile from "../components/CardTile";
import CardDetailModal from "../components/CardDetailModal";

const PAGE_SIZE = 48;

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:border-black hover:text-black disabled:opacity-30 transition-colors text-xs"
      >
        Previous
      </button>
      <span className="text-gray-400 text-xs">Page {page + 1} of {totalPages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages - 1}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:border-black hover:text-black disabled:opacity-30 transition-colors text-xs"
      >
        Next
      </button>
    </div>
  );
}

export default function Search({ cardDb, collectionState, formatState }) {
  const { cards, loading: dbLoading } = cardDb;
  const { ownedCounts } = collectionState;
  const { format } = formatState;

  const [query, setQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [page, setPage] = useState(0);

  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Reset page when query or format changes
  useEffect(() => { setPage(0); }, [debouncedQuery, format]);

  const allResults = useMemo(() => {
    let list = cards.filter((c) => format.getStatus(c.name, c.tcg_date) !== "not-legal");
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.desc?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [cards, format, debouncedQuery]);

  const totalPages = Math.ceil(allResults.length / PAGE_SIZE);
  const results = allResults.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
      <h1 className="text-2xl font-bold text-black">Card Search</h1>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Filter by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-black flex-1 min-w-48 bg-white"
        />
      </div>

      {dbLoading && <p className="text-gray-400 text-sm">Loading card database...</p>}

      {!dbLoading && (
        <>
          <p className="text-gray-400 text-xs">{allResults.length.toLocaleString()} cards</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
            {results.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                ownedCount={ownedCounts[card.name] || 0}
                onClick={() => setSelectedCard(card)}
                format={format}
              />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
