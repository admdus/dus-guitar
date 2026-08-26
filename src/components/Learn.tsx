import { LEARN_PATH, getSong } from "../data/songs";
import { Stars } from "./Icons";

interface Props {
  onPlay: (id: string) => void;
  scores: Record<string, { stars: number }>;
}

export function Learn({ onPlay, scores }: Props) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Path</p>
          <h1>Learn the fretboard</h1>
          <p className="lede">
            Follow the path from open strings to pentatonic licks, metal hammer-ons, and arpeggio sweeps. Each step is a real play-along with the scrolling neck.
          </p>
        </div>
      </header>
      <ol className="learn-path">
        {LEARN_PATH.map((step, index) => {
          const song = getSong(step.songId);
          if (!song) return null;
          const stars = scores[song.id]?.stars ?? 0;
          return (
            <li key={step.songId}>
              <span className="step-num">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.blurb}</p>
                <small>
                  {song.title} · {song.bpm} BPM
                </small>
              </div>
              <Stars value={stars} />
              <button className="btn primary" onClick={() => onPlay(song.id)}>
                Start
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
