import { useEffect, useMemo, useRef, useState } from "react";
import { drawFretboard } from "./FretboardCanvas";
import { NeckBoard } from "./NeckBoard";
import { IconBack, Stars } from "./Icons";
import { TuningPicker } from "./TuningPicker";
import { clampSpeed, MAX_SPEED, MIN_SPEED, SongEngine } from "../engine/playback";
import { getSong, saveHighScore } from "../data/songs";
import { bestPositionForMidi } from "../engine/notes";
import { songForTuning, type Tuning } from "../engine/tuning";
import { click, pluckFret, resumeAudio } from "../audio/synth";
import { hitsForStep, loadDrumKit, playDrumHits, saveDrumKit, type DrumKitId } from "../audio/drums";
import { guitarInput } from "../audio/guitarInput";
import { DrumPicker } from "./DrumPicker";
import { AmpPicker } from "./AmpPicker";
import { getAmpTone, type AmpPrefs } from "../audio/ampPresets";
import type { DetectedPitch, EngineSnapshot, StringIndex } from "../types";

interface Props {
  songId: string;
  detected: DetectedPitch | null;
  guitarLive: boolean;
  latencyMs: number;
  tuning: Tuning;
  onTuning: (tuning: Tuning) => void;
  onBack: () => void;
  onConnect: () => void;
  amp: AmpPrefs;
  onAmp: (prefs: AmpPrefs) => void;
}

export function PlayView({
  songId,
  detected,
  guitarLive,
  latencyMs,
  tuning,
  onTuning,
  onBack,
  onConnect,
  amp,
  onAmp,
}: Props) {
  const song = useMemo(() => {
    const catalogSong = getSong(songId);
    return catalogSong ? songForTuning(catalogSong, tuning) : undefined;
  }, [songId, tuning]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SongEngine | null>(null);
  const snapRef = useRef<EngineSnapshot | null>(null);
  const detectedRef = useRef(detected);
  const lastStepRef = useRef(-99);
  const metronomeRef = useRef(true);
  const drumKitRef = useRef<DrumKitId>("off");
  const savedRef = useRef(false);
  const [hud, setHud] = useState<EngineSnapshot | null>(null);
  const [speed, setSpeed] = useState(1);
  const [metronome, setMetronome] = useState(true);
  const [drumKit, setDrumKit] = useState<DrumKitId>(loadDrumKit);
  const [spaceAssist, setSpaceAssist] = useState(!guitarLive);

  detectedRef.current = detected;
  metronomeRef.current = metronome;
  drumKitRef.current = drumKit;

  useEffect(() => {
    if (!song) return;
    const engine = new SongEngine(song, { latencyMs, tuning });
    engineRef.current = engine;
    snapRef.current = engine.snapshot();
    setHud(engine.snapshot());
    savedRef.current = false;
    lastStepRef.current = -99;
    setSpeed(1);
    let raf = 0;
    let lastHud = 0;
    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const eng = engineRef.current;
      if (canvas && eng) {
        const snap = eng.tick(now);
        snapRef.current = snap;
        const parent = canvas.parentElement;
        const w = parent?.clientWidth ?? 1200;
        const h = parent?.clientHeight ?? 420;
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawFretboard(ctx, w, h, snap, detectedRef.current, song.bpm, tuning);
        }
        const kit = drumKitRef.current;
        if ((metronomeRef.current || kit !== "off") && snap.playing) {
          const beatDur = 60 / song.bpm;
          const stepDur = beatDur / 4;
          const timeline = snap.currentTime + beatDur * 4;
          const step = Math.floor(timeline / stepDur);
          if (step !== lastStepRef.current && timeline >= 0) {
            lastStepRef.current = step;
            if (metronomeRef.current && step % 4 === 0) click(step % 16 === 0);
            playDrumHits(hitsForStep(kit, step));
          }
        }
        if (now - lastHud > 80) {
          lastHud = now;
          setHud(snap);
        }
        if (snap.finished && !savedRef.current) {
          savedRef.current = true;
          setHud(snap);
          saveHighScore(song.id, snap.accuracy, snap.stars, snap.score);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [songId, song, latencyMs, tuning]);

  useEffect(() => {
    engineRef.current?.setLatency(latencyMs);
  }, [latencyMs]);

  useEffect(() => {
    return guitarInput.subscribe((pitch) => {
      if (!pitch) return;
      engineRef.current?.feedPitch(pitch.midi, performance.now(), pitch.onset);
    });
  }, [songId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (!spaceAssist) return;
      e.preventDefault();
      const engine = engineRef.current;
      const snap = snapRef.current;
      if (!engine || !snap) return;
      const pending = snap.notes.find((n) => n.status === "pending" && Math.abs(n.time - snap.currentTime) < 0.2);
      const judge = engine.feedPractice(performance.now());
      if (judge && judge !== "miss" && pending) {
        pluckFret(pending.string, pending.fret, 0.16, tuning);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spaceAssist, tuning]);

  if (!song) {
    return (
      <div className="play-screen">
        <p className="empty">Song not found.</p>
        <button className="btn" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  const start = async () => {
    await resumeAudio();
    engineRef.current?.start(performance.now());
  };
  const pause = () => engineRef.current?.pause(performance.now());
  const restart = () => {
    savedRef.current = false;
    lastStepRef.current = -99;
    engineRef.current?.reset();
    void start();
  };
  const changeSpeed = (value: number) => {
    const next = clampSpeed(value);
    setSpeed(next);
    engineRef.current?.setSpeed(next);
  };
  const speedPercent = Math.round(speed * 100);
  const playFret = (string: StringIndex, fret: number) => {
    void resumeAudio();
    pluckFret(string, fret, 0.2, tuning);
    engineRef.current?.feedFret(string, fret, performance.now());
  };
  const changeDrums = (kit: DrumKitId) => {
    setDrumKit(kit);
    saveDrumKit(kit);
    if (kit === "off") return;
    void resumeAudio().then(() => playDrumHits(hitsForStep(kit, 0)));
  };

  const snap = hud ?? engineRef.current?.snapshot();
  const accuracy = snap?.accuracy ?? 0;
  const highlight = detected ? bestPositionForMidi(detected.midi, tuning) : null;

  return (
    <div className="play-screen">
      <header className="play-hud">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <IconBack />
        </button>
        <div className="play-title">
          <h1>{song.title}</h1>
          <p>
            {song.artist} · {song.bpm} BPM · {tuning.name}
            {song.notes.some((n) => n.technique) ? " · h hammer-on · p pull-off" : ""}
          </p>
        </div>
        <div className="play-stats">
          <div>
            <span>Score</span>
            <strong>{snap?.score ?? 0}</strong>
          </div>
          <div>
            <span>Combo</span>
            <strong>{snap?.combo ?? 0}x</strong>
          </div>
          <div>
            <span>Accuracy</span>
            <strong>{accuracy.toFixed(0)}%</strong>
          </div>
        </div>
        <div className="input-meter" title={detected ? detected.noteName : "No signal"}>
          <span style={{ height: `${Math.min(100, (detected?.amplitude ?? 0) * 800)}%` }} />
        </div>
      </header>

      <div className="progress-line">
        <span
          style={{
            width: `${Math.max(0, Math.min(100, ((snap?.currentTime ?? 0) / song.duration) * 100))}%`,
          }}
        />
      </div>

      <div className="play-controls">
        {!snap?.playing && !snap?.finished && (
          <button className="btn primary" onClick={start}>
            {snap && snap.currentTime > 0 ? "Resume" : "Start"}
          </button>
        )}
        {snap?.playing && (
          <button className="btn" onClick={pause}>
            Pause
          </button>
        )}
        <button className="btn" onClick={restart}>
          Restart
        </button>
        <label className="speed-slider">
          <span>Speed</span>
          <input
            id="song-speed"
            type="range"
            name="song-speed"
            min={Math.round(MIN_SPEED * 100)}
            max={Math.round(MAX_SPEED * 100)}
            step={1}
            value={speedPercent}
            aria-label="Song speed"
            aria-valuetext={`${speedPercent} percent`}
            onChange={(e) => changeSpeed(Number(e.target.value) / 100)}
          />
          <output htmlFor="song-speed">{speedPercent}%</output>
        </label>
        <TuningPicker value={tuning} onChange={onTuning} compact />
        <label className="check">
          <input type="checkbox" checked={metronome} onChange={(e) => setMetronome(e.target.checked)} />
          Click
        </label>
        <DrumPicker value={drumKit} onChange={changeDrums} />
        <AmpPicker value={amp} onChange={onAmp} compact />
        <label className="check">
          <input type="checkbox" checked={spaceAssist} onChange={(e) => setSpaceAssist(e.target.checked)} />
          Space to hit
        </label>
        {!guitarLive && (
          <button className="btn ghost" onClick={onConnect}>
            Connect guitar
          </button>
        )}
        {detected && (
          <span className="heard-note">
            Heard {detected.noteName}
            {highlight ? ` · ${tuning.stringNames[highlight.string]}${highlight.fret}` : ""}
          </span>
        )}
        {snap?.notes.find((n) => n.status === "pending")?.technique === "hammer" && (
          <span className="technique-callout hammer">Next: hammer-on</span>
        )}
        {snap?.notes.find((n) => n.status === "pending")?.technique === "pull" && (
          <span className="technique-callout pull">Next: pull-off</span>
        )}
      </div>

      <div className="fret-stage">
        <canvas ref={canvasRef} />
      </div>

      <NeckBoard
        notes={snap?.notes ?? song.notes.map((n) => ({ ...n, status: "pending" }))}
        currentTime={snap?.currentTime ?? -1}
        tuning={tuning}
        highlight={highlight}
        onPlayFret={playFret}
      />

      {tuning.id === "drop-d" && (
        <p className="practice-hint tuning-note">
          Playing in <b>Drop D</b>. Tabs keep the same pitches — low-string notes sit 2 frets higher, so power
          chords become one-finger shapes.
        </p>
      )}

      {guitarLive && amp.enabled && (
        <p className="practice-hint">
          Hearing the guitar through <b>{getAmpTone(amp.presetId).name}</b>
          {amp.presetId === "direct" ? " (low-latency dry monitor)" : ""}.
          Amp tones add delay. Turn Amp Off and use Scarlett Direct Monitor for zero lag.
        </p>
      )}

      {!guitarLive && (
        <p className="practice-hint">
          No guitar connected. Click the highlighted frets on the neck, or enable <b>Space to hit</b> to practice
          timing.
          {song.notes.some((n) => n.technique) ? (
            <>
              {" "}
              Notes marked <b>h</b> are hammer-ons and <b>p</b> are pull-offs — pick the first note, then hammer or
              pull without picking again.
            </>
          ) : null}
        </p>
      )}

      {snap?.finished && (
        <div className="results-overlay">
          <div className="results-card">
            <p className="eyebrow">Song complete</p>
            <h2>{song.title}</h2>
            <Stars value={snap.stars} />
            <div className="results-grid">
              <div>
                <span>Accuracy</span>
                <strong>{snap.accuracy.toFixed(0)}%</strong>
              </div>
              <div>
                <span>Score</span>
                <strong>{snap.score}</strong>
              </div>
              <div>
                <span>Max combo</span>
                <strong>{snap.maxCombo}</strong>
              </div>
            </div>
            <p className="judge-mix">
              Perfect {snap.counts.perfect} · Great {snap.counts.great} · Good {snap.counts.good} · Miss {snap.counts.miss}
            </p>
            <div className="hero-actions">
              <button className="btn primary" onClick={restart}>
                Play again
              </button>
              <button className="btn" onClick={onBack}>
                Back to songs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
