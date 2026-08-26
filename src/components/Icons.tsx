export function IconHome() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

export function IconSongs() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4v11.2A3.4 3.4 0 1 0 11 18V8h8V4H9Z" />
    </svg>
  );
}

export function IconLearn() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7.5 12 4l9 3.5v2L12 13 3 9.5v-2Zm3 6.2v3.2c0 1.7 2.7 3.1 6 3.1s6-1.4 6-3.1v-3.2l-6 2.3-6-2.3Z" />
    </svg>
  );
}

export function IconTuner() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9h-2.2A6.8 6.8 0 1 1 12 5.2V3Zm.8 4.5-1.6.3-.8 8.2 3.7 2.1.8-1.5-2.1-1.2.8-6.3 1.6-.3.3-1.3Z" />
    </svg>
  );
}

export function IconJack() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h3v4h4V4h3v6.2l2 2V20H5v-7.8l2-2V4Zm5 8.5A1.8 1.8 0 1 0 12 16a1.8 1.8 0 0 0 0-3.5Z" />
    </svg>
  );
}

export function IconPick() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c3.4 3.2 7 7.4 7 11.2A7 7 0 0 1 5 13.2C5 9.4 8.6 5.2 12 2Z" />
    </svg>
  );
}

export function IconBack() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 5 7 12l7.5 7 1.5-1.6L10.2 12 16 6.6 14.5 5Z" />
    </svg>
  );
}

export function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  return (
    <span className={`stars stars-${size}`} aria-label={`${value} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < value ? "on" : ""}>
          ★
        </span>
      ))}
    </span>
  );
}
