import { useMemo, useState } from "react";
import { SONGS } from "../data/songs";
import { deleteImportedSong, loadImportedSongs } from "../data/library";
import { SongCard } from "./SongCard";
import { ImportSong } from "./ImportSong";
import { TuningPicker } from "./TuningPicker";
import type { Tuning } from "../engine/tuning";
import type { Song } from "../types";

interface Props {
  onPlay: (id: string) => void;
  scores: Record<string, { stars: number }>;
  tuning: Tuning;
  onTuning: (tuning: Tuning) => void;
}

const FILTERS = ["All", "Imported", "Beginner", "Rock", "Metal", "Folk", "Classical", "Exercise"] as const;

export function Songs({ onPlay, scores, tuning, onTuning }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [imported, setImported] = useState<Song[]>(() => loadImportedSongs());

  const catalog = useMemo(() => [...imported, ...SONGS], [imported]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((song) => {
      const matchesQuery =
        !q ||
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.genre.toLowerCase().includes(q);
      const matchesFilter =
        filter === "All" ||
        song.genre === filter ||
        (filter === "Imported" && Boolean(song.imported)) ||
        (filter === "Beginner" && song.category === "beginner") ||
        (filter === "Exercise" && song.category === "exercise") ||
        (filter === "Rock" && song.category === "rock") ||
        (filter === "Metal" && song.genre === "Metal") ||
        (filter === "Folk" && song.category === "folk") ||
        (filter === "Classical" && song.category === "classical");
      return matchesQuery && matchesFilter;
    });
  }, [query, filter, catalog]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Songs</h1>
        </div>
        <div className="page-head-actions">
          <ImportSong onImported={() => setImported(loadImportedSongs())} />
          <input
            className="search"
            name="song-search"
            placeholder="Search title or artist"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>
      <div className="filters">
        {FILTERS.map((item) => (
          <button key={item} className={filter === item ? "chip on" : "chip"} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="tuning-bar">
        <TuningPicker value={tuning} onChange={onTuning} />
        {tuning.id === "drop-d" && (
          <p className="tuning-hint">
            Songs keep their concert pitches. Low-string notes move up 2 frets; power chords become one-finger
            shapes.
          </p>
        )}
      </div>
      <div className="song-grid">
        {list.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            stars={scores[song.id]?.stars ?? 0}
            onPlay={onPlay}
            onRemove={
              song.imported
                ? (id) => {
                    deleteImportedSong(id);
                    setImported(loadImportedSongs());
                  }
                : undefined
            }
          />
        ))}
      </div>
      {list.length === 0 && (
        <p className="empty">
          {filter === "Imported"
            ? "No imported tracks yet. Drop an MP3 of isolated guitar — or a .dus.json from npm run import-mp3."
            : "No songs match that search."}
        </p>
      )}
    </div>
  );
}
