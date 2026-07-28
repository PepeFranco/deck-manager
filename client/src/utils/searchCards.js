import ALIASES from "../data/aliases";

const isExtraType = (c) => c.type?.includes("Fusion") || c.type?.includes("Synchro") || c.type?.includes("XYZ");

/**
 * Shared card search used across all search boxes.
 * Applies aliases, format legality, optional section filter, name match.
 */
export function searchCards(query, cards, format, { limit = 24, section = null } = {}) {
  if (!query.trim() || !cards?.length) return [];
  const raw = query.toLowerCase();
  const q = ALIASES[raw] ? ALIASES[raw].toLowerCase() : raw;
  let results = cards;
  if (format) {
    results = results.filter((c) => format.getStatus(c.name, c.tcg_date) !== "not-legal");
  }
  if (section === "extra") {
    results = results.filter((c) => isExtraType(c));
  } else if (section === "main" || section === "side") {
    results = results.filter((c) => !isExtraType(c));
  }
  return results.filter((c) => c.name.toLowerCase().includes(q)).slice(0, limit);
}
