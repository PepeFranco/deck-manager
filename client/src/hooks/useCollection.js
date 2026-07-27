import { useState, useCallback } from "react";

export function useCollection() {
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/collection");
      if (!res.ok) throw new Error("Failed to load collection");
      const data = await res.json();
      setCollection(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCard = useCallback(async (entry) => {
    const res = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error("Failed to add card");
    const updated = await res.json();
    setCollection(updated);
  }, []);

  const deleteCard = useCallback(async (Name, Code) => {
    const res = await fetch("/api/collection", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Name, Code }),
    });
    if (!res.ok) throw new Error("Failed to delete card");
    const updated = await res.json();
    setCollection(updated);
  }, []);

  // Returns a map of cardName -> count of owned copies
  const ownedCounts = collection.reduce((acc, card) => {
    const key = card.Name;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return { collection, loading, error, fetchCollection, addCard, deleteCard, ownedCounts };
}
