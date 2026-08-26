import { IconHome, IconJack, IconLearn, IconPick, IconSongs, IconTuner } from "./Icons";
import type { GuitarStatus } from "../hooks/useGuitar";
import type { Tuning } from "../engine/tuning";
import type { Page } from "../types";

interface Props {
  page: Page;
  onNavigate: (page: Page) => void;
  guitarStatus: GuitarStatus;
  tuning: Tuning;
}

const ITEMS: Array<{ name: Page["name"]; label: string; icon: typeof IconHome }> = [
  { name: "home", label: "Home", icon: IconHome },
  { name: "songs", label: "Songs", icon: IconSongs },
  { name: "learn", label: "Learn", icon: IconLearn },
  { name: "tuner", label: "Tuner", icon: IconTuner },
  { name: "setup", label: "Guitar", icon: IconJack },
];

export function Sidebar({ page, onNavigate, guitarStatus, tuning }: Props) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate({ name: "home" })}>
        <span className="brand-mark">
          <IconPick />
        </span>
        <span>
          <strong>DUS Guitar</strong>
          <em>Play it in time</em>
        </span>
      </button>
      <nav>
        {ITEMS.map((item) => (
          <button
            key={item.name}
            className={page.name === item.name ? "active" : ""}
            onClick={() => onNavigate({ name: item.name } as Page)}
          >
            <item.icon />
            {item.label}
          </button>
        ))}
      </nav>
      <div className={`side-status ${guitarStatus}`}>
        <span className="dot" />
        {guitarStatus === "live"
          ? "Guitar connected"
          : guitarStatus === "connecting"
            ? "Connecting…"
            : guitarStatus === "error"
              ? "Input error"
              : "No guitar yet"}
        <em className="side-tuning">{tuning.name} · {tuning.notation}</em>
      </div>
    </aside>
  );
}
