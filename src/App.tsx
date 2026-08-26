import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Home } from "./components/Home";
import { Songs } from "./components/Songs";
import { Learn } from "./components/Learn";
import { Tuner } from "./components/Tuner";
import { Setup } from "./components/Setup";
import { PlayView } from "./components/PlayView";
import { useGuitar } from "./hooks/useGuitar";
import { loadHighScores } from "./data/songs";
import type { Page } from "./types";

function pageFromHash(): Page {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "play" && parts[1]) return { name: "play", songId: parts[1] };
  if (parts[0] === "songs") return { name: "songs" };
  if (parts[0] === "learn") return { name: "learn" };
  if (parts[0] === "tuner") return { name: "tuner" };
  if (parts[0] === "setup" || parts[0] === "guitar") return { name: "setup" };
  return { name: "home" };
}

function hashFor(page: Page): string {
  if (page.name === "play") return `#/play/${page.songId}`;
  if (page.name === "home") return "#/";
  return `#/${page.name}`;
}

export function App() {
  const [page, setPage] = useState<Page>(() => pageFromHash());
  const [scores, setScores] = useState(() => loadHighScores());
  const [latencyMs, setLatencyMs] = useState(40);
  const guitar = useGuitar();

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (next: Page) => {
    window.location.hash = hashFor(next);
    setPage(next);
    if (next.name !== "play") setScores(loadHighScores());
  };

  const play = (songId: string) => navigate({ name: "play", songId });

  const body = useMemo(() => {
    if (page.name === "play") {
      return (
        <PlayView
          songId={page.songId}
          detected={guitar.detected}
          guitarLive={guitar.live}
          latencyMs={latencyMs}
          onBack={() => navigate({ name: "songs" })}
          onConnect={() => navigate({ name: "setup" })}
        />
      );
    }
    if (page.name === "songs") return <Songs onPlay={play} scores={scores} />;
    if (page.name === "learn") return <Learn onPlay={play} scores={scores} />;
    if (page.name === "tuner") {
      return <Tuner detected={guitar.detected} status={guitar.status} onConnect={() => void guitar.connect(guitar.deviceId)} />;
    }
    if (page.name === "setup") {
      return (
        <Setup
          status={guitar.status}
          error={guitar.error}
          devices={guitar.devices}
          deviceId={guitar.deviceId}
          channel={guitar.channel}
          capture={guitar.capture}
          detected={guitar.detected}
          onConnect={(id) => void guitar.connect(id)}
          onDisconnect={() => void guitar.disconnect()}
          onRefresh={guitar.refreshDevices}
          onChannel={guitar.setChannel}
        />
      );
    }
    return (
      <Home
        onPlay={play}
        onSetup={() => navigate({ name: "setup" })}
        guitarStatus={guitar.status}
        scores={scores}
      />
    );
  }, [page, guitar, scores, latencyMs]);

  if (page.name === "play") {
    return body;
  }

  return (
    <div className="shell">
      <Sidebar page={page} onNavigate={navigate} guitarStatus={guitar.status} />
      <main className="main">
        {body}
        {page.name === "setup" && (
          <label className="latency-field">
            Input latency
            <input
              type="range"
              name="input-latency"
              min={0}
              max={120}
              value={latencyMs}
              onChange={(e) => setLatencyMs(Number(e.target.value))}
            />
            <span>{latencyMs} ms</span>
          </label>
        )}
      </main>
    </div>
  );
}
