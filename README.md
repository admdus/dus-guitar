# DUS Guitar

A Windows desktop app for learning guitar songs. Plug in a guitar, pick a track, and play the notes as they reach the glowing **PLAY** line on a scrolling fretboard — the same kind of game-like trainer as Yousician.

## What it does

- **Connect a guitar** through an audio interface (electric) or a microphone (acoustic)
- **Browse songs** on a dark, card-based home and library
- **Follow the fretboard** as numbered notes scroll toward the play line in time
- **Score timing and pitch** — Perfect / Great / Good / Miss, combo, accuracy, and stars
- **Tune** to standard EADGBE before you play
- **Practice without a guitar** by clicking the neck diagram or using Space

## Install on Windows

1. Install [Node.js 20+](https://nodejs.org/).
2. In this folder:

```bash
npm install
npm run dist:win
```

3. Open the installer in `release/` (`DUS Guitar Setup 1.0.0.exe`), then launch **DUS Guitar** from the Start menu or desktop shortcut.

During development:

```bash
npm run electron
```

`npm run dev` runs the same UI in a browser (useful for layout work; guitar input still uses the microphone permission).

## How to play

1. Plug the guitar into an audio interface, or place a mic in front of an acoustic.
2. Open **Guitar** in the sidebar and choose that input. Pick a string — the meter should jump and a note name should appear.
3. Use **Tuner** so each open string is in tune (E A D G B e).
4. Pick a song. After a 4-beat count-in, notes slide toward the cyan **PLAY** line.
5. Fret and pick the matching note when it arrives. The bouncing ball marks the current string. Hits light up; misses fade red.
6. The neck at the bottom shows which frets are coming up. Click it to play a note if you are practicing without a guitar.

Speed can be 50%, 75%, or 100%. Turn **Click** on for a metronome. **Space to hit** scores the current note from the keyboard so you can learn the rhythm first.

## Input tips

- Turn off echo cancellation / “enhancements” on the Windows recording device if the pitch is unstable.
- If hits feel late, raise **Input latency** on the Guitar page (try 20–80 ms).
- YIN pitch detection is monophonic: single notes score exactly; chords count as a hit if any note in the shape is picked on time.

## Songs

The library mixes original riffs (`Power Pulse`, `Pentatonic Drive`, `Blue Porch`) with public-domain melodies (`Ode to Joy`, `Amazing Grace`, `The Rising Sun`). Nothing here is a licensed pop transcription.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm test` | Pitch detection, scoring, and song-engine tests |
| `npm run typecheck` | TypeScript |
| `npm run build` | Renderer + Electron main process |
| `npm run dist:win` | Windows NSIS installer |

## License

Private project for Adam Duś.
