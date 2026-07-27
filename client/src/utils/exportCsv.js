export function downloadCsv(filename, rows) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = String(r[h] ?? "").replace(/"/g, '""');
        return v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v}"` : v;
      }).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportDeckRecords(deckName, records) {
  let running = { wins: 0, losses: 0 };
  const rows = records.map((r) => {
    running.wins += r.wins;
    running.losses += r.losses;
    const total = running.wins + running.losses;
    return {
      Date: r.date,
      Wins: r.wins,
      Losses: r.losses,
      Note: r.note || "",
      "Running Wins": running.wins,
      "Running Losses": running.losses,
      "Win Rate %": total > 0 ? Math.round((running.wins / total) * 100) : 0,
    };
  });
  downloadCsv(`${deckName}-records.csv`, rows);
}

export function exportAllDecks(decks) {
  const rows = decks.map((d) => {
    const records = d.records || [];
    const totalW = records.reduce((s, r) => s + r.wins, 0);
    const totalL = records.reduce((s, r) => s + r.losses, 0);
    const total = totalW + totalL;
    return {
      Deck: d.name,
      Built: d.built ? "Yes" : "No",
      "Main Cards": d.main.length,
      "Total Wins": totalW,
      "Total Losses": totalL,
      "Win Rate %": total > 0 ? Math.round((totalW / total) * 100) : 0,
      "Events Played": records.length,
    };
  });
  downloadCsv("all-decks-records.csv", rows);
}
