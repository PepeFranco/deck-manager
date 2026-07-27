import { useState, useCallback } from "react";

// Decks are stored as .ydk files on disk via the Express server.
// main/extra/side contain card IDs (integers).
// The local card DB (ALL_CARDS) is used to resolve IDs to names.

export function useDecks(cardDb) {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/decks');
      if (!res.ok) throw new Error('Failed to load decks');
      const data = await res.json();
      setDecks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createDeck = useCallback(async (name, format) => {
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, main: [], extra: [], side: [], ...(format && { format }) }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create deck');
    }
    const deck = await res.json();
    setDecks((prev) => [...prev, deck]);
    return deck.name;
  }, []);

  const updateDeck = useCallback(async (name, changes) => {
    const deck = decks.find((d) => d.name === name);
    if (!deck) return;
    const body = { ...deck, ...changes };
    const fmt = deck.format;
    const endpoint = fmt
      ? `/api/decks/${fmt}/${encodeURIComponent(name)}`
      : `/api/decks/${encodeURIComponent(name)}`;
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to update deck');
    const updated = await res.json();
    setDecks((prev) =>
      prev.map((d) => (d.name === name ? updated : d)).filter((d) =>
        // handle rename: remove old name if newName changed
        changes.newName ? d.name !== name : true
      ).concat(changes.newName && updated.name !== name ? [updated] : [])
        .filter((d, i, arr) => arr.findIndex((x) => x.name === d.name) === i)
    );
    return updated;
  }, [decks]);

  const deleteDeck = useCallback(async (name) => {
    const deck = decks.find((d) => d.name === name);
    const fmt = deck?.format;
    const endpoint = fmt
      ? `/api/decks/${fmt}/${encodeURIComponent(name)}`
      : `/api/decks/${encodeURIComponent(name)}`;
    await fetch(endpoint, { method: 'DELETE' });
    setDecks((prev) => prev.filter((d) => d.name !== name));
  }, [decks]);

  const getDeck = useCallback((name) => decks.find((d) => d.name === name), [decks]);

  // Add a card ID to a section. Enforces max 3 copies across all sections.
  const addCard = useCallback(async (deckName, section, cardId) => {
    const deck = decks.find((d) => d.name === deckName);
    if (!deck) return;
    const allIds = [...deck.main, ...deck.extra, ...deck.side];
    const count = allIds.filter((id) => id === cardId).length;
    if (count >= 3) return;
    const updated = { ...deck, [section]: [...deck[section], cardId] };
    await updateDeck(deckName, updated);
  }, [decks, updateDeck]);

  const removeCard = useCallback(async (deckName, section, index) => {
    const deck = decks.find((d) => d.name === deckName);
    if (!deck) return;
    const updated = { ...deck, [section]: deck[section].filter((_, i) => i !== index) };
    await updateDeck(deckName, updated);
  }, [decks, updateDeck]);

  return { decks, loading, error, fetchDecks, createDeck, updateDeck, deleteDeck, getDeck, addCard, removeCard };
}
