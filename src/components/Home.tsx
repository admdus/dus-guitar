import { SONGS, songsByCategory } from "../data/songs";
import { SongRow } from "./SongCard";
import { Stars } from "./Icons";
import { TuningPicker } from "./TuningPicker";
import type { GuitarStatus } from "../hooks/useGuitar";
import type { Tuning } from "../engine/tuning";
import type { Song } from "../types";

interface Props {
  onPlay: (id: string) => void;
  onSetup: () => void;
  guitarStatus: GuitarStatus;
  scores: Record<string, { stars: number; accuracy: number }>;
  tuning: Tuning;
  onTuning: (tuning: Tuning) => void;
}

export function Home({ onPlay, onSetup, guitarStatus, scores, tuning, onTuning }: Props) {
  const featured = SONGS.find((s) => s.id === "power-pulse") ?? SONGS[0];
  const continueSong = bestContinue(scores) ?? featured;

  return (
    <div className="page home-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Today's session</p>
          <h1>Ready when you are.</h1>
          <p className="lede">Tune the app to match the guitar — Standard or Drop D — then play any song.</p>
        </div>
        <div className="hero-actions">
          <TuningPicker value={tuning} onChange={onTuning} />
          {guitarStatus !== "live" && (
            <button className="btn primary" onClick={onSetup}>
              Connect guitar
            </button>
          )}
        </div>
      </header>

      <div className="hero" style={{ ["--from" as string]: continueSong.cover.from, ["--to" as string]: continueSong.cover.to }}>
        <div className="hero-copy">
          <p className="eyebrow">{scores[continueSong.id] ? "Continue playing" : "Featured riff"}</p>
          <h2>{continueSong.title}</h2>
          <p>{continueSong.artist} · {continueSong.genre}</p>
          <p className="hero-desc">{continueSong.description}</p>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => onPlay(continueSong.id)}>
              Play song
            </button>
            <Stars value={scores[continueSong.id]?.stars ?? 0} />
          </div>
        </div>
        <div className={`hero-art motif-${continueSong.cover.motif}`} />
      </div>

      <SongRow title="Beginner tracks" songs={songsByCategory("beginner")} scores={scores} onPlay={onPlay} />
      <SongRow title="Metal" songs={SONGS.filter((s) => s.genre === "Metal")} scores={scores} onPlay={onPlay} />
      <SongRow
        title="Rock & blues"
        songs={songsByCategory("rock").filter((s) => s.genre !== "Metal")}
        scores={scores}
        onPlay={onPlay}
      />
      <SongRow title="Folk & campfire" songs={songsByCategory("folk")} scores={scores} onPlay={onPlay} />
    </div>
  );
}

function bestContinue(scores: Record<string, { stars: number; accuracy: number }>): Song | undefined {
  const ids = Object.keys(scores);
  if (ids.length === 0) return undefined;
  const last = ids[ids.length - 1];
  return SONGS.find((s) => s.id === last);
}
