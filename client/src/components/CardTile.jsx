import { useState } from "react";
import LegalityBadge from "./LegalityBadge";
import RarityTag from "./RarityTag";
import { FORMATS_BY_ID, DEFAULT_FORMAT_ID } from "../data/formats";

function setPrefix(code) { return code.split("-")[0]; }

export default function CardTile({ card, ownedCount = 0, onAdd, addLabel = "Add", format, onClick, ownedPrints }) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = `/images/${card.id}`;
  const fmt = format || FORMATS_BY_ID[DEFAULT_FORMAT_ID];
  const status = fmt.getStatus(card.name, card.tcg_date);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:border-black transition-colors bg-white">
      <div
        className={`relative aspect-[421/614] bg-gray-50${onClick ? " cursor-pointer" : ""}`}
        onClick={onClick}
      >
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={card.name}
            className="w-full h-full object-cover card-img-hover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs p-2 text-center">
            {card.name}
          </div>
        )}
        {ownedCount > 0 && (
          <span className="absolute bottom-1 right-1 bg-black text-white text-sm font-bold px-2.5 py-1 rounded leading-none">
            ×{ownedCount}
          </span>
        )}
      </div>
      <div className="p-2 flex flex-col gap-1.5 flex-1">
        <p className="text-xs font-medium leading-tight text-black line-clamp-2">
          {card.name}
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          <LegalityBadge status={status} />
        </div>
        {ownedPrints ? (
          ownedPrints.length > 0 && (
            <div className="text-[10px] text-gray-400 leading-tight space-y-0.5">
              {ownedPrints.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="font-medium text-gray-500">{setPrefix(s.code) || "—"}</span>
                  {s.rarity && <RarityTag rarity={s.rarity} short />}
                  {s.count > 1 && <span className="text-gray-400">×{s.count}</span>}
                </div>
              ))}
              {ownedPrints.length > 4 && (
                <div className="text-gray-300">+{ownedPrints.length - 4} more</div>
              )}
            </div>
          )
        ) : (
          card.sets?.length > 0 && (() => {
            const seen = new Set();
            const deduped = card.sets.filter((s) => {
              const key = `${setPrefix(s.code)}|${s.rarity}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return (
              <div className="text-[10px] text-gray-400 leading-tight space-y-0.5">
                {deduped.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="font-medium text-gray-500">{setPrefix(s.code)}</span>
                    <RarityTag rarity={s.rarity} short />
                  </div>
                ))}
                {deduped.length > 4 && (
                  <div className="text-gray-300">+{deduped.length - 4} more</div>
                )}
              </div>
            );
          })()
        )}
        {onAdd && (
          <button
            onClick={() => onAdd(card)}
            className="mt-auto text-xs bg-black hover:bg-gray-800 text-white px-2 py-1 rounded transition-colors"
          >
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
