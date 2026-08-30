# DUS Guitar

A Windows and macOS desktop app for learning guitar songs. Plug in a guitar, pick a track, and play the notes as they reach the glowing **PLAY** line on a scrolling fretboard — the same kind of game-like trainer as Yousician.

## What it does

- **Connect a guitar** through a USB interface such as the Focusrite Scarlett 2i2, or a microphone (acoustic)
- **Browse songs** on a dark, card-based home and library
- **Follow the fretboard** as numbered notes scroll toward the play line in time
- **Score timing and pitch** — Perfect / Great / Good / Miss, combo, accuracy, and stars
- **Tune** to standard EADGBE or Drop D (DADGBE) before you play
- **Hear the guitar** through electric amp presets (clean, crunch, metal, and more) while you play
- **Practice without a guitar** by clicking the neck diagram or using Space

## Install on macOS

1. Install [Node.js 20+](https://nodejs.org/).
2. In this folder:

```bash
npm install
npm run dist:mac
```

3. Open the DMG in `release/` and drag **DUS Guitar** to Applications.

The first launch of an unsigned build is blocked by Gatekeeper. Right-click the app, choose **Open**, then confirm. You can also clear the quarantine flag:

```bash
xattr -cr "/Applications/DUS Guitar.app"
```

Apple Silicon and Intel Macs are both covered by the universal build.

During development:

```bash
npm run electron
```

`npm run dev` runs the same UI in a browser (useful for layout work; guitar input still uses the microphone permission).

## Install on Windows

1. Install [Node.js 20+](https://nodejs.org/).
2. In this folder:

```bash
npm install
npm run dist:win
```

3. Open the installer in `release/` (`DUS Guitar Setup 1.0.0.exe`), then launch **DUS Guitar** from the Start menu or desktop shortcut.

## How to play

1. Plug the guitar into an audio interface (Scarlett 2i2: Input 1 + INST), or place a mic in front of an acoustic.
2. Open **Guitar** in the sidebar and choose that input (not Loopback). Pick a string — the meter should jump and a note name should appear.
3. Pick an **amp preset** (Clean Studio, Crunch, Metal Core, …) so you can hear the guitar through headphones or speakers. Turn Scarlett **Direct Monitor** off if you do not want a dry double of the same signal.
4. Use **Tuner** so each open string is in tune. Pick **Standard** (E A D G B e) or **Drop D** (D A D G B e) to match the guitar. Drop D rewrites every song so it still sounds the same: low-string notes move up 2 frets, and power chords become one-finger shapes.
5. Pick a song. After a 4-beat count-in, notes slide toward the cyan **PLAY** line.
6. Fret and pick the matching note when it arrives. The bouncing ball marks the current string. Hits light up; misses fade red.
7. The neck at the bottom shows which frets are coming up. Click it to play a note if you are practicing without a guitar.

Drag the **Speed** slider from 10% to 100% to slow a song down while you learn it. Turn **Click** on for a metronome, or pick **Drums** (Kick, Rock, Pop, Metal, Shuffle) for a backing groove. Switch **Amp** on the play bar to change tone mid-song. **Space to hit** scores the current note from the keyboard so you can learn the rhythm first.

## Input tips

- Turn off echo cancellation / “enhancements” on the recording device if the pitch is unstable.
- If hits feel late, raise **Input latency** on the Guitar page (try 20–80 ms). That slider only shifts scoring, not the sound you hear.
- To hear the guitar in time: pick **Direct** (dry, lowest software delay) and plug headphones into the Scarlett. Amp presets add tone and a little lag.
- Do not run Scarlett **Direct Monitor** and **Hear guitar** together — you will hear a delayed second copy. For zero delay, Direct Monitor on and Hear guitar off.
- Software monitoring is off when **Amp** is set to Off, or **Hear guitar** is unchecked. Pitch detection still works.
- YIN pitch detection is monophonic: single notes score exactly; chords count as a hit if any note in the shape is picked on time.
- On a Mac, if the input list is empty after you click **Enable input**, open **System Settings → Privacy & Security → Microphone** and allow DUS Guitar.

## Focusrite Scarlett 2i2

Yes — DUS Guitar is built to use a Scarlett 2i2 (2nd, 3rd, or 4th gen) on Windows and macOS.

The desktop app talks to the interface through the same path Chromium uses: **Core Audio** on a Mac, **WASAPI** on Windows. You do **not** need the Focusrite ASIO driver, and a DAW that has exclusive access will block it.

1. Plug the guitar into **Input 1** and press **INST**.
2. Set **GAIN 1** so the halo stays green when you pick (red means clipping).
3. Open **Guitar** in the sidebar. Choose the device named Scarlett / Focusrite — not **Loopback**.
4. Leave the channel on **Input 1 · Guitar / INST** unless the guitar is in Input 2.
5. Pick an open string. The meter should jump and a note name should appear.
6. Choose **Direct** to hear yourself in time, or an amp preset for tone. Turn hardware **Direct Monitor** off if Hear guitar is on, or you will hear a slapback.

If the device will not open, close Logic Pro, GarageBand, Ableton, Reaper, or other hosts using the Scarlett exclusively, then Reconnect. In Focusrite Control, Audio MIDI Setup (Mac), or Windows Sound, 44.1 kHz or 48 kHz is the most reliable shared-mode rate.

## Songs

The library mixes original riffs (`Power Pulse`, `Pentatonic Drive`, `Blue Porch`, `Venom Drive`, `Venom Coil`, `Venom Arc`, `Venom Rake`) with public-domain melodies (`Ode to Joy`, `Amazing Grace`, `The Rising Sun`). Nothing here is a licensed pop transcription.

You can also **import your own audio**. DUS Guitar listens for pitches and writes a scrolling fretboard track — the same format as the built-in songs.

### Import an MP3 (or WAV / M4A / JSON)

**In the app:** Songs → **Import audio**. Drop a recording. Isolated guitar, a DI riff, or a hummed melody works best. Full-band commercial mixes usually hide the guitar, so the tab will be rough or empty.

**From the command line** (needs [ffmpeg](https://ffmpeg.org/)):

```bash
npm run import-mp3 -- path/to/riff.mp3
npm run import-mp3 -- path/to/riff.mp3 --bpm 120 --title "Porch Riff" -o porch.dus.json
```

That writes a `.dus.json` song file. Import that JSON from the same Songs button if you want to transcribe on the command line and play in the app.

The importer is monophonic: one note at a time, mapped onto standard-tuning positions. It does **not** store the MP3, and it is not a licensed transcription tool.

`Venom Drive` is an original metalcore chug — palm-muted E5, then G5, C5 and D5. Switch the app to Drop D and the same riff uses one-finger power chords. `Venom Coil` is the advanced metal trainer: notes marked **h** are hammer-ons and **p** are pull-offs. Pick the first note of a slur, then hammer or pull on the same string without picking again. `Venom Arc` trains metal arpeggios: pick one note at a time through Em, C, G and D shapes, then sixteenth-note sweeps (including B diminished and a 7th-position Em). `Venom Rake` is the sweep-picking trainer: one note per adjacent string through 5-string Em, C and B diminished (eighths, then quintuplets), 6-string Em sextuplets, and a hammer-on at the peak of the Em shape.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm test` | Pitch detection, scoring, song-engine, and import tests |
| `npm run typecheck` | TypeScript |
| `npm run build` | Renderer + Electron main process |
| `npm run dist:mac` | Universal macOS DMG + zip |
| `npm run dist:win` | Windows NSIS installer |
| `npm run import-mp3 -- file.mp3` | Transcribe audio to a `.dus.json` practice track |

## License

Private project for Adam Duś.
