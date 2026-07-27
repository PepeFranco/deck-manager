import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import Search from "./pages/Search";
import Decks from "./pages/Decks";
import DeckBuilder from "./pages/DeckBuilder";
import Collection from "./pages/Collection";
import Buylist from "./pages/Buylist";
import { useCollection } from "./hooks/useCollection";
import { useDecks } from "./hooks/useDecks";
import { useCardDb } from "./hooks/useCardDb";
import { useFormat } from "./hooks/useFormat";

export default function App() {
  const cardDb = useCardDb();
  const collectionState = useCollection();
  const deckState = useDecks();
  const formatState = useFormat();

  useEffect(() => {
    cardDb.fetchCards();
    deckState.fetchDecks();
    collectionState.fetchCollection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <NavBar formatState={formatState} />
      <main className="flex-1 overflow-y-auto p-8">
        <Routes>
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route path="/search" element={<Search cardDb={cardDb} collectionState={collectionState} formatState={formatState} />} />
          <Route path="/decks" element={<Decks deckState={deckState} collectionState={collectionState} cardDb={cardDb} formatState={formatState} />} />
          <Route path="/decks/:name" element={<DeckBuilder deckState={deckState} collectionState={collectionState} cardDb={cardDb} formatState={formatState} />} />
          <Route path="/decks/:format/:name" element={<DeckBuilder deckState={deckState} collectionState={collectionState} cardDb={cardDb} formatState={formatState} />} />
          <Route path="/collection" element={<Collection collectionState={collectionState} formatState={formatState} cardDb={cardDb} />} />
          <Route path="/buylist" element={<Buylist deckState={deckState} collectionState={collectionState} cardDb={cardDb} formatState={formatState} />} />
        </Routes>
      </main>
    </div>
  );
}
