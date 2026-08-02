import { NavLink, useNavigate } from "react-router-dom";
import { FORMATS } from "../data/formats";

const links = [
  { to: "/decks", label: "Decks" },
  { to: "/buylist", label: "Buylist" },
  { to: "/pool", label: "Cardpool" },
  { to: "/collection", label: "Collection" },
  { to: "/search", label: "Card Search" },
];

export default function NavBar({ formatState }) {
  const { format, formatId, setFormat } = formatState;
  const navigate = useNavigate();

  const handleFormatChange = (id) => {
    setFormat(id);
    navigate("/decks");
  };

  return (
    <nav className="w-48 shrink-0 border-r border-gray-200 flex flex-col py-8 px-4 gap-1 bg-white">
      <div className="mb-6 px-2">
        <p className="text-xs text-gray-400 mb-1">Format</p>
        <select
          value={formatId}
          onChange={(e) => handleFormatChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black focus:outline-none focus:border-black bg-white font-medium"
        >
          {FORMATS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `px-2 py-2 rounded text-sm transition-colors ${
              isActive
                ? "bg-black text-white font-medium"
                : "text-gray-500 hover:text-black hover:bg-gray-100"
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
