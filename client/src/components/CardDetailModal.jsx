import { useEffect } from "react";
import LegalityBadge from "./LegalityBadge";
import RarityTag from "./RarityTag";
import { FORMATS_BY_ID, DEFAULT_FORMAT_ID } from "../data/formats";

export default function CardDetailModal({ card, onClose, ownedCount = 0, format, ownedPrints }) {
  const fmt = format || FORMATS_BY_ID[DEFAULT_FORMAT_ID];
  const status = fmt.getStatus(card.name, card.tcg_date);
  const imageUrl = `/images/${card.id}`;

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isMonster = card.type && !card.type.includes("Spell") && !card.type.includes("Trap");

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full flex gap-6 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card image */}
        <div className="shrink-0 w-48">
          <img
            src={imageUrl}
            alt={card.name}
            className="w-full rounded-lg"
            style={{ aspectRatio: "421/614" }}
          />
        </div>

        {/* Card details */}
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-black leading-tight">{card.name}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-black text-xl leading-none shrink-0 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <LegalityBadge status={status} />
              {ownedCount > 0 && (
                <span className="text-xs text-gray-500">You own {ownedCount} {ownedCount === 1 ? "copy" : "copies"}</span>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p><span className="font-medium text-gray-700">Type:</span> {card.type}</p>
            {card.race && <p><span className="font-medium text-gray-700">Sub-type:</span> {card.race}</p>}
            {card.attribute && <p><span className="font-medium text-gray-700">Attribute:</span> {card.attribute}</p>}
            {card.archetype && <p><span className="font-medium text-gray-700">Archetype:</span> {card.archetype}</p>}
            {isMonster && (
              <>
                {card.level != null && <p><span className="font-medium text-gray-700">Level:</span> ★{card.level}</p>}
                {card.linkval != null && <p><span className="font-medium text-gray-700">Link Rating:</span> {card.linkval}</p>}
                {card.scale != null && <p><span className="font-medium text-gray-700">Pendulum Scale:</span> {card.scale}</p>}
                <p>
                  <span className="font-medium text-gray-700">ATK:</span>{" "}
                  {card.atk != null ? card.atk : "?"}
                  {card.def != null && <> / <span className="font-medium text-gray-700">DEF:</span> {card.def}</>}
                </p>
              </>
            )}
            {card.tcg_date && (
              <p><span className="font-medium text-gray-700">TCG Release:</span> {card.tcg_date}</p>
            )}
          </div>

          {card.desc && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Card Text</p>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line border border-gray-100 rounded-md p-3 bg-gray-50">
                {card.desc}
              </p>
            </div>
          )}

          {ownedPrints ? (
            card.sets?.length > 0 && (() => {
              const countByCode = Object.fromEntries(ownedPrints.map((s) => [s.code, s.count]));
              const sorted = [...card.sets].sort((a, b) =>
                (a.date || "9999").localeCompare(b.date || "9999")
              );
              const totalOwned = ownedPrints.reduce((s, p) => s + p.count, 0);
              return (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">
                    Prints ({card.sets.length}){totalOwned > 0 && <span className="text-gray-400 font-normal"> · {totalOwned} owned</span>}
                  </p>
                  <div className="border border-gray-100 rounded-md divide-y divide-gray-50 max-h-40 overflow-y-auto">
                    {sorted.map((s, i) => {
                      const count = countByCode[s.code] ?? 0;
                      return (
                        <div key={i} className={`flex items-center justify-between px-3 py-1 text-xs gap-2 ${count === 0 ? "opacity-40" : ""}`}>
                          <div className="min-w-0">
                            <span className="font-mono text-gray-600">{s.code}</span>
                            {s.name && <span className="text-gray-400 ml-1.5">{s.name}</span>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <RarityTag rarity={s.rarity} />
                            <span className={`font-medium ${count === 0 ? "text-gray-400" : "text-gray-600"}`}>×{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            card.sets?.length > 0 && (() => {
              const sorted = [...card.sets].sort((a, b) =>
                (a.date || "9999").localeCompare(b.date || "9999")
              );
              return (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Prints ({card.sets.length})</p>
                  <div className="border border-gray-100 rounded-md divide-y divide-gray-50 max-h-40 overflow-y-auto">
                    {sorted.map((s, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1 text-xs gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-gray-600">{s.code}</span>
                          {s.name && <span className="text-gray-400 ml-1.5">{s.name}</span>}
                        </div>
                        <RarityTag rarity={s.rarity} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
