# Narrator

Local, free text-to-speech for video voice-overs using [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) via `kokoro-onnx`. Runs offline after setup.

## Getting started

### What you need

| | Needed for | Install |
|---|---|---|
| [uv](https://docs.astral.sh/uv/) | running the app. It installs Python 3.12 and the Python packages for you | macOS / Linux: `curl -LsSf https://astral.sh/uv/install.sh \| sh` (or `brew install uv`)<br>Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"` |
| Kokoro model files (~340 MB) | the voice. They're not in git; download them once (step 2) | — |
| [ffmpeg](https://ffmpeg.org/) *(optional)* | the MP3 download. Without it, you get WAV and SRT only | macOS: `brew install ffmpeg` · Debian/Ubuntu: `sudo apt install ffmpeg` · Windows: `winget install Gyan.FFmpeg` |
| [Node.js](https://nodejs.org/) 20.19+ or 22.12+ *(optional)* | only for changing the UI. The built UI is committed in `static/` | — |

A current Chrome, Edge, Firefox, or Safari for the UI. No GPU or account is needed. Everything runs on your machine, and it works offline after setup.

### 1. Clone

```bash
git clone https://github.com/kozmaadrian/narrator.git
cd narrator
```

### 2. Download the model files

```bash
curl -L --create-dirs -o models/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx
curl -L --create-dirs -o models/voices-v1.0.bin  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin
```

In Windows PowerShell, type `curl.exe` instead of `curl`.

### 3. Run

```bash
uv run app.py
```

Open <http://127.0.0.1:8765>. The first run creates `.venv/` and installs the Python packages (FastAPI, Uvicorn, kokoro-onnx, SoundFile) from `uv.lock`, which can take a minute; later runs start right away. Stop the server with <kbd>Ctrl+C</kbd>. Renders are saved in `output/`.

The app opens with the example script from `scripts/graphql-update.txt` and its pronunciation fixes from `scripts/pronunciations.txt`. Replace the text with your own; edits are kept in the browser.

<details>
<summary>Without uv (plain pip)</summary>

With Python 3.12 or 3.13:

```bash
python3 -m venv .venv            # Windows: py -3.12 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install fastapi kokoro-onnx soundfile uvicorn
python app.py
```

</details>

### Command line

To render without the UI:

```bash
uv run narrate.py scripts/graphql-update.txt --pronunciations scripts/pronunciations.txt --voice af_heart --srt -o output/narration.wav
```

`uv run narrate.py --help` lists the options (speed, sentence and paragraph pauses).

### Troubleshooting

- **"Model files missing"**: step 2 wasn't done, or the files aren't in `models/` next to `app.py`.
- **No MP3 download**: install ffmpeg, then restart `app.py`. It checks for ffmpeg at startup.
- **"Address already in use"**: another copy is running on port 8765. Stop it, or change the port on the last line of `app.py`.
- **No sound in the Sync preview**: browsers only start audio after a click or key press on the page. Click anywhere, then press play.

## How it works

You write the narration on one screen, then line it up with your video on the other.

1. **Write** on **1 · Script**. Paste your text, choose a voice and speed in the sidebar, and add pronunciation fixes. <kbd>⇧⌘↵</kbd> previews the paragraph at the cursor.
2. **Generate** (<kbd>⌘↵</kbd>). This renders the narration and opens **2 · Sync**.
3. **Sync** on **2 · Sync**. Drop in your video, press play, and press <kbd>⌥N</kbd> each time the next paragraph should start. Or type the times on the paragraph cards.
4. **Apply** (<kbd>⌘↵</kbd>). This writes the timing into the script and renders again. Then download the **WAV**, **MP3**, or **SRT** subtitles; they're also saved in `output/`.

In the app, **?** opens a cheat sheet with all of this.

## Script syntax

| Syntax | Effect |
|---|---|
| blank line | paragraph pause (set in the sidebar) |
| end of a sentence | sentence pause (set in the sidebar) |
| `[pause 2s]`, `[500ms]`, `[1.5]` | silence instead of the automatic pause there. Several in a row add up; `[pause 0s]` means no pause. Before the first sentence, it delays the voice |
| `# note` | a comment line; not spoken |

**Pronunciation fixes** go one per line as `word = how to say it`, e.g. `GraphiQL = Graphical` (the defaults are in `scripts/pronunciations.txt`). A fix matches whole words, case-sensitively, and changes only the audio, not the subtitles. In the sidebar, select a word in the script, press **Add “word”**, type how it should sound, and press ▶ to hear it.

## The Sync screen

### Player and timeline

- Your video plays **muted**, and the narration follows its play, pause, and seek. Without a video, play still works, so you can check the timing by ear.
- The **timeline strip** shows one block per paragraph. **Amber** marks a `[pause …]` from the script, **green** marks silence added by moving a paragraph's Start. Hover to see the time and paragraph; click or drag to seek.
- **Subtitles** (<kbd>⌥C</kbd>) show the sentence being spoken on the video. They're the same lines as the SRT.

### Paragraph cards

Each card shows the paragraph's **number** (click it to jump there), its **Start** in video time, how long its speech lasts (〰 `11.9s`), and its text. The paragraph playing now is highlighted and stays in view. Between two cards, a **⏸ pill** shows the pause and where it comes from: the paragraph pause setting or a `[pause …]`. It turns green, showing old → new, when a change resizes it.

To set a Start:

- **Start now** (<kbd>⌥N</kbd>) while playing: the highlighted card gets the current time, and the highlight moves to the next card.
- Pause where the paragraph should start and press the card's **timer button**.
- **Type** a time (`m:ss.s` or seconds), nudge it with <kbd>↑</kbd>/<kbd>↓</kbd> (0.1 s, or 1 s with ⇧), or clear it so the paragraph follows the one before.

A changed Start shows a **↺ was** chip with the old time; click the chip to put the old time back.

The **chain button** on each card decides what a change does to the paragraphs after it:

- **Linked** (🔗, the default): they move by the same amount, so only the pause before this paragraph changes. The cards that will move are tinted.
- **Unlinked**: only this paragraph moves. It can't move so late that it would run into the next paragraph; a note says so and offers to link it.

### History, Apply, and downloads

- Every change is a step in the **Timing history**. Click a step to go back to it, or <kbd>⌘Z</kbd> / <kbd>⇧⌘Z</kbd> to undo or redo one step. Undone steps stay listed, struck through, until your next change.
- Changes play right away in the preview. A later Start adds silence before the paragraph; an earlier one skips ahead to it. A paragraph is never cut off.
- While changes are pending, **Discard** and **Apply** take Generate's place in the header, and the **2 · Sync** tab shows how many paragraphs changed. Pending changes survive a page reload.
- The downloads are **locked until you Apply**, so you never download the old timing by mistake.
- **Apply** only changes the gaps you moved, putting each `[pause …]` on its own line. Unchanged sentences are cached, so it's quick.

<details>
<summary><b>More details</b></summary>

- **Voice before the video**: paragraph 1 can have a negative Start, e.g. `-0:02.5`, so the voice starts 2.5 s before the video. The preview holds the video's first frame during that intro. When you edit the video, place the audio 2.5 s earlier, or delay the video by 2.5 s. A positive Start for paragraph 1 becomes a leading `[pause …]`.
- **Video shorter than the narration**: the preview holds the video's last frame while the voice goes on. A dashed line on the timeline marks where the video ends.
- **While a render runs**, a progress card shows the sentence being voiced and the time left. **Cancel** (<kbd>Esc</kbd>) stops before the next sentence. Sentences already voiced stay cached. A cancelled Apply keeps your timing changes pending.
- **Timeline from the keyboard**: <kbd>Tab</kbd> to it, then <kbd>←</kbd>/<kbd>→</kbd> seek 1 s (5 s with ⇧), <kbd>Page Up</kbd>/<kbd>Page Down</kbd> 10 s, <kbd>Home</kbd>/<kbd>End</kbd> to the start or end.
- **History**: nudges to the same paragraph within 2 s count as one step. The last 60 steps are kept. Apply or a new render starts a fresh history.
- **Preview audio** uses Web Audio, which browsers start only after your first click or key press. At speeds other than 1×, the voice pitch shifts.
- **Reset script** restores `scripts/graphql-update.txt`. Until you edit again, **Undo reset** brings your version back.
- **Messages** appear on the screen they belong to, are read out by screen readers, and clear when you switch screens.
- **Old `[at …]` cues** are converted on load: they're removed from the script, and their times become pending Starts, ready to Apply.

</details>

## Keyboard shortcuts

On Windows and Linux, use <kbd>Ctrl</kbd> for ⌘ and <kbd>Alt</kbd> for ⌥.

| Screen | Action | Keys |
|---|---|---|
| Script | Generate and open Sync | <kbd>⌘↵</kbd> |
| | Preview the paragraph at the cursor | <kbd>⇧⌘↵</kbd> |
| | Insert a pause at the cursor | <kbd>⌥P</kbd> |
| Sync | Play / pause | <kbd>⌥Space</kbd> |
| | Start now: the highlighted paragraph starts here | <kbd>⌥N</kbd> |
| | Seek back / forward 2 s | <kbd>⌥J</kbd> / <kbd>⌥L</kbd> |
| | Subtitles on / off | <kbd>⌥C</kbd> |
| | Nudge a Start by 0.1 s (1 s with ⇧) | <kbd>↑</kbd> / <kbd>↓</kbd> |
| | Undo / redo a timing change | <kbd>⌘Z</kbd> / <kbd>⇧⌘Z</kbd> |
| | Apply the timing | <kbd>⌘↵</kbd> |
| Anywhere | Help | <kbd>?</kbd> or <kbd>⌘/</kbd> |
| | Close help, or cancel a render | <kbd>Esc</kbd> |

## Frontend (Vue 3)

The UI source is in `frontend/`, a Vite + Vue 3 app. `static/` holds its build output, which `app.py` serves, so the app runs without Node. Rebuild after editing the frontend:

```bash
cd frontend
npm install
npm run build          # writes ../static/
npm run dev            # http://localhost:5173 with hot reload; /api is proxied to app.py on :8765
```

`frontend/src` layout:

| Path | Contents |
|---|---|
| `App.vue` | the header, the two screens, and the overlays |
| `components/AppHeader.vue` | brand, screen tabs (2 · Sync counts pending timing changes), Generate (or Discard / Apply), help |
| `components/script/` | 1 · Script: editor, toolbar, settings sidebar, pronunciation list |
| `components/sync/` | 2 · Sync: video panel, transport, timeline strip, downloads, paragraph timing cards (paragraph cards and ⏸ pause connectors) and timing history |
| `components/overlays/` | progress card, help dialog, shortcut list |
| `components/ui/` | SVG icon sprite and `Icon` |
| `composables/` | behavior: rendering, playback clock, cues, editor, preview, workflow, shortcuts, persistence |
| `lib/` | pure helpers and data: script parsing, timing math, formatting, pronunciation, voices, shortcut list, API calls |
| `state.js` | shared reactive state |
| `styles/base.css` | theme tokens and shared styles; components keep their own styles scoped |
