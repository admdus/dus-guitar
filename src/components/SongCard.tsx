import { Stars } from "./Icons";
import type { Song } from "../types";

interface Props {
  song: Song;
  stars?: number;
  onPlay: (id: string) => void;
}

export function SongCard({ song, stars = 0, onPlay }: Props) {
  return (
    <button className="song-card" onClick={() => onPlay(song.id)} style={{ ["--from" as string]: song.cover.from, ["--to" as string]: song.cover.to }}>
      <div className={`cover motif-${song.cover.motif}`}>
        <span className="cover-genre">{song.genre}</span>
        <strong>{song.difficulty}/5</strong>
      </div>
      <div className="song-meta">
        <h3>{song.title}</h3>
        <p>{song.artist}</p>
        <Stars value={stars} size="sm" />
      </div>
    </button>
  );
}

export function SongRow({
  title,
  songs,
  scores,
  onPlay,
}: {
  title: string;
  songs: Song[];
  scores: Record<string, { stars: number }>;
  onPlay: (id: string) => void;
}) {
  if (songs.length === 0) return null;
  return (
    <section className="song-row">
      <header>
        <h2>{title}</h2>
      </header>
      <div className="row-scroller">
        {songs.map((song) => (
          <SongCard key={song.id} song={song} stars={scores[song.id]?.stars ?? 0} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}
