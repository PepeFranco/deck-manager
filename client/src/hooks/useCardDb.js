import { useState, useCallback, useMemo } from "react";

export function useCardDb() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchCards = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch('/api/cards/all');
      const data = await res.json();
      setCards(data);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loaded]);

  const byId = useMemo(() => {
    const map = new Map();
    cards.forEach((c) => {
      map.set(c.id, c);
      (c.altIds || []).forEach((altId) => map.set(altId, c));
    });
    return map;
  }, [cards]);

  const byName = useMemo(() => {
    const map = new Map();
    cards.forEach((c) => map.set(c.name.toLowerCase(), c));
    return map;
  }, [cards]);

  return { cards, loading, loaded, fetchCards, byId, byName };
}
