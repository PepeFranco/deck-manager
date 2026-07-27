const RARITY_CONFIG = {
  "Common": {
    abbr: "C",
    cls: "bg-gray-100 text-gray-400 border border-gray-200 tracking-wide",
  },
  "Rare": {
    abbr: "R",
    cls: "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-700 font-semibold tracking-wide shadow-sm",
  },
  "Super Rare": {
    abbr: "SR",
    cls: "bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold tracking-wide shadow-[0_0_6px_rgba(59,130,246,0.55)]",
  },
  "Ultra Rare": {
    abbr: "UR",
    cls: "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-amber-900 font-bold tracking-wide shadow-[0_0_8px_rgba(251,191,36,0.65)]",
  },
  "Secret Rare": {
    abbr: "ScR",
    cls: "bg-gradient-to-r from-violet-500 via-purple-600 to-indigo-500 text-white font-bold tracking-wide shadow-[0_0_10px_rgba(139,92,246,0.7)]",
  },
  "Ultimate Rare": {
    abbr: "UtR",
    cls: "bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 text-white font-bold tracking-wide shadow-[0_0_8px_rgba(52,211,153,0.6)]",
  },
  "Ghost Rare": {
    abbr: "GhR",
    cls: "bg-gradient-to-br from-white via-slate-100 to-slate-200 text-slate-500 border border-slate-300 font-bold tracking-wide shadow-[0_0_12px_rgba(148,163,184,0.85)]",
  },
  "Starfoil Rare": {
    abbr: "Stf",
    cls: "bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-500 text-white font-bold tracking-wide shadow-[0_0_10px_rgba(236,72,153,0.65)]",
  },
  "Mosaic Rare": {
    abbr: "Mos",
    cls: "bg-gradient-to-r from-cyan-400 to-teal-500 text-white font-bold tracking-wide shadow-[0_0_8px_rgba(20,184,166,0.6)]",
  },
  "Shatterfoil Rare": {
    abbr: "Shat",
    cls: "bg-gradient-to-r from-sky-300 via-blue-400 to-cyan-400 text-white font-bold tracking-wide shadow-[0_0_8px_rgba(14,165,233,0.6)]",
  },
  "Gold Rare": {
    abbr: "GR",
    cls: "bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-amber-950 font-bold tracking-wide shadow-[0_0_8px_rgba(234,179,8,0.65)]",
  },
  "Premium Gold Rare": {
    abbr: "PGR",
    cls: "bg-gradient-to-r from-yellow-200 via-amber-300 to-amber-500 text-amber-900 font-extrabold tracking-wider shadow-[0_0_12px_rgba(251,191,36,0.85)]",
  },
  "Collector's Rare": {
    abbr: "CR",
    cls: "bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 text-white font-bold tracking-wide shadow-[0_0_12px_rgba(217,70,239,0.75)]",
  },
  "Prismatic Secret Rare": {
    abbr: "PScR",
    cls: "bg-[linear-gradient(90deg,#f87171,#facc15,#4ade80,#60a5fa,#c084fc)] text-white font-extrabold tracking-wider shadow-[0_0_14px_rgba(168,85,247,0.8)]",
  },
  "Platinum Secret Rare": {
    abbr: "PlScR",
    cls: "bg-gradient-to-br from-slate-200 via-white to-slate-300 text-slate-600 border border-slate-300 font-extrabold tracking-wider shadow-[0_0_12px_rgba(148,163,184,0.9)]",
  },
};

export default function RarityTag({ rarity, short = false }) {
  const cfg = RARITY_CONFIG[rarity] ?? { abbr: rarity, cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] leading-none whitespace-nowrap uppercase ${cfg.cls}`}>
      {short ? cfg.abbr : rarity}
    </span>
  );
}
