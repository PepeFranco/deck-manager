const CONFIG = {
  forbidden:     { label: "Forbidden",   cls: "bg-red-600 text-white" },
  limited:       { label: "Limited",     cls: "bg-orange-500 text-white" },
  "semi-limited":{ label: "Semi",        cls: "bg-yellow-500 text-white" },
  unlimited:     { label: "Unlimited",   cls: "bg-gray-100 text-gray-500 border border-gray-200" },
  "not-legal":   { label: "Not Legal",   cls: "bg-gray-100 text-gray-400 border border-gray-200" },
};

export default function LegalityBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG["unlimited"];
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
