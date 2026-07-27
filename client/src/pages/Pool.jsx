import { useMemo, useState } from "react";
import CardDetailModal from "../components/CardDetailModal";

export default function Pool({ deckState, cardDb, collectionState, formatState }) {
  const { decks } = deckState;
  const { byId } = cardDb;
  const { ownedCounts } = collectionState;
  const format = formatState?.format;
  const [selectedCard, setSelectedCard] = useState(null);

  const formatDecks = useMemo(
    () => decks.filter((d) => !d.format || d.format === format?.id),
    [decks, format]
  );

  // Sum total copies of each card needed across all format decks
  const poolCards = useMemo(() => {
    const totals = {}; // cardId -> { card, total }
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

      <div>
        <h1 className="text-2xl font-bold text-black">Card Pool</h1>
        {format && <p className="text-gray-400 text-sm mt-0.5">{format.label}</p>}
      </div>

      <p className="text-gray-400 text-xs">
        {poolCards.length} unique cards across {formatDecks.length} deck{formatDecks.length !== 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(102px,1fr))] gap-2">
        {poolCards.map(({ card, total }) => (
          <div
            key={card.id}
            className="relative cursor-pointer group"
            onClick={() => setSelectedCard(card)}
          >
            <div className="rounded overflow-hidden border border-gray-200 group-hover:border-black transition-colors">
              <img
                src={`/images/${card.id}`}
                alt={card.name}
                className="w-full block"
                style={{ aspectRatio: "421/614", objectFit: "cover" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
            <span className="absolute bottom-1 right-1 bg-black text-white text-sm font-bold px-2.5 py-1 rounded leading-none">
              ×{total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
