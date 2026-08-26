import { useMemo, useState } from "react";
import { SONGS } from "../data/songs";
import { SongCard } from "./SongCard";

interface Props {
  onPlay: (id: string) => void;
  scores: Record<string, { stars: number }>;
}

const FILTERS = ["All", "Beginner", "Rock", "Folk", "Classical", "Exercise"] as const;

export function Songs({ onPlay, scores }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SONGS.filter((song) => {
      const matchesQuery =
        !q ||
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.genre.toLowerCase().includes(q);
      const matchesFilter =
        filter === "All" ||
        song.genre === filter ||
        (filter === "Beginner" && song.category === "beginner") ||
        (filter === "Exercise" && song.category === "exercise") ||
        (filter === "Rock" && song.category === "rock") ||
        (filter === "Folk" && song.category === "folk") ||
        (filter === "Classical" && song.category === "classical");
      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Songs</h1>
        </div>
        <input
          className="search"
          placeholder="Search title or artist"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>
      <div className="filters">
        {FILTERS.map((item) => (
          <button key={item} className={filter === item ? "chip on" : "chip"} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="song-grid">
        {list.map((song) => (
          <SongCard key={song.id} song={song} stars={scores[song.id]?.stars ?? 0} onPlay={onPlay} />
        ))}
      </div>
      {list.length === 0 && <p className="empty">No songs match that search.</p>}
    </div>
  );
}
