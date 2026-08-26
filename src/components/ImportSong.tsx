import { useRef, useState } from "react";
import { decodeAudioFile } from "../audio/decodeFile";
import { saveImportedSong } from "../data/library";
import { metaFromFilename, parseSongJson, transcribe } from "../engine/transcribe";
import type { Song } from "../types";
import { IconImport } from "./Icons";

interface Props {
  onImported: (song: Song) => void;
}

type Phase = "idle" | "working" | "preview" | "error";

export function ImportSong({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [preview, setPreview] = useState<Song | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  const reset = () => {
    setPhase("idle");
    setProgress(0);
    setMessage("");
    setWarning("");
    setPreview(null);
  };

  const close = () => {
    reset();
    setOpen(false);
  };

  const pickFile = () => {
    reset();
    setOpen(true);
  };

  const handleFiles = async (files: FileList | File[] | null) => {
    const file = files?.[0];
    if (!file) return;
    setOpen(true);
    setPhase("working");
    setProgress(0);
    setWarning("");
    setMessage(`Reading ${file.name}…`);
    try {
      if (/\.json$/i.test(file.name) || file.type === "application/json") {
        const raw: unknown = JSON.parse(await file.text());
        const song = parseSongJson(raw);
        song.sourceName = file.name;
        setPreview(song);
        setTitle(song.title);
        setArtist(song.artist);
        setPhase("preview");
        return;
      }
      const decoded = await decodeAudioFile(file);
      setMessage("Listening for notes…");
      const meta = metaFromFilename(file.name);
      const result = await transcribe(decoded.samples, decoded.sampleRate, {
        title: meta.title,
        artist: meta.artist,
        sourceName: file.name,
        onProgress: (fraction) => {
          setProgress(fraction);
          setMessage(`Listening for notes… ${Math.round(fraction * 100)}%`);
        },
      });
      if (result.voicedRatio < 0.12) {
        setWarning(
          "This mix looks busy. Isolated guitar, a hummed melody, or a DI riff transcribes much more cleanly than a full-band MP3.",
        );
      } else if (result.song.duration > 12 && result.song.notes.length < 8) {
        setWarning("Only a few notes came through. Try a clearer recording, or import a .dus.json from the CLI.");
      }
      setPreview(result.song);
      setTitle(result.song.title);
      setArtist(result.song.artist);
      setPhase("preview");
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "Could not import that file.");
    }
  };

  const save = () => {
    if (!preview) return;
    const song: Song = {
      ...preview,
      title: title.trim() || preview.title,
      artist: artist.trim() || preview.artist,
      imported: true,
    };
    saveImportedSong(song);
    onImported(song);
    close();
  };

  return (
    <>
      <button className="btn" type="button" onClick={pickFile}>
        <IconImport />
        Import audio
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,application/json,.mp3,.wav,.m4a,.ogg,.json,.dus.json"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {open && (
        <div className="results-overlay import-overlay" role="dialog" aria-label="Import a song">
          <div className="results-card import-card">
            <p className="eyebrow">Import</p>
            <h2>Turn audio into a track</h2>
            {phase === "idle" && (
              <DropZone
                onFiles={(files) => void handleFiles(files)}
                onBrowse={() => inputRef.current?.click()}
              />
            )}
            {phase === "working" && (
              <>
                <p className="import-status">{message}</p>
                <div className="progress-line import-progress">
                  <span style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </>
            )}
            {phase === "error" && (
              <>
                <p className="error-text">{message}</p>
                <DropZone
                  onFiles={(files) => void handleFiles(files)}
                  onBrowse={() => inputRef.current?.click()}
                />
              </>
            )}
            {phase === "preview" && preview && (
              <div className="import-preview">
                <label>
                  Title
                  <input value={title} onChange={(event) => setTitle(event.target.value)} name="import-title" />
                </label>
                <label>
                  Artist
                  <input value={artist} onChange={(event) => setArtist(event.target.value)} name="import-artist" />
                </label>
                <p className="import-stats">
                  {preview.notes.length} notes · {preview.bpm} BPM · difficulty {preview.difficulty}/5 ·{" "}
                  {preview.duration.toFixed(0)}s
                </p>
                {warning && <p className="import-warning">{warning}</p>}
                <p className="lede">
                  DUS Guitar will scroll these notes on the fretboard like a built-in song. The original MP3 is not
                  stored — only the detected pitches.
                </p>
              </div>
            )}
            <div className="hero-actions">
              {phase === "preview" && (
                <button className="btn primary" type="button" onClick={save}>
                  Add to library
                </button>
              )}
              <button className="btn" type="button" onClick={close}>
                {phase === "preview" ? "Cancel" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DropZone({
  onFiles,
  onBrowse,
}: {
  onFiles: (files: FileList | File[]) => void;
  onBrowse: () => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      className={over ? "import-drop over" : "import-drop"}
      onClick={onBrowse}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        onFiles(event.dataTransfer.files);
      }}
    >
      <strong>Drop an MP3 or JSON here</strong>
      <span>or click to browse. Isolated guitar works best.</span>
    </button>
  );
}
