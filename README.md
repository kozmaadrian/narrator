# Narrator

Local, free text-to-speech for video voice-overs using [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) via `kokoro-onnx`. Runs offline after setup.

## Run

```bash
cd narrator
uv run app.py          # open http://127.0.0.1:8765
```

CLI alternative:

```bash
uv run narrate.py scripts/graphql-update.txt --pronunciations scripts/pronunciations.txt --voice af_heart --srt -o output/narration.wav
```

Model files live in `models/` (download them again if missing):

```bash
curl -L -o models/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx
curl -L -o models/voices-v1.0.bin  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin
```

## Script syntax

| Syntax | Effect |
|---|---|
| blank line | paragraph pause (configurable) |
| sentence end | sentence pause (configurable) |
| `[pause 2s]`, `[500ms]`, `[1.5]` | silence; replaces the automatic pause at that spot (several in a row add up, `[pause 0s]` means none). Before the first sentence, it delays the voice |
| `# note` | ignored line |

Pronunciation fixes (`scripts/pronunciations.txt`, one `word = how to say it` per line): `GraphiQL = Graphical`. Matches are case-sensitive and whole-word, and only the audio changes. In the UI they're a list in the sidebar: select a word in the script and press **Add “word”**, type how it should sound, and press ▶ to hear it. A word that doesn't occur in the script, or is listed twice, gets a warning.

## Two screens: Script, then Sync

**1 · Script** holds the narration text, with a sidebar for how it should sound: voice, speed, automatic pauses, and pronunciation fixes. Rough out the timing with `[pause …]`, preview a paragraph with <kbd>⇧⌘↵</kbd>, then press **Generate** (<kbd>⌘↵</kbd>). It renders the narration and opens the second screen.

While a render runs (Generate, Apply, or a paragraph preview), the app is locked behind a progress card. It shows which sentence is being voiced, a progress bar, the elapsed time, and an estimate of the time left. The estimate is based on how fast your machine voiced the previous sentences. **Cancel** (or <kbd>Esc</kbd>) stops the render before the next sentence. Sentences voiced so far stay cached, so the next Generate picks up quickly. A cancelled Apply leaves the script as it was, and the timing changes stay pending.

**2 · Sync** is where you drop in your video. It plays muted, and the narration follows its play, pause, and seek. You can also use the round play button and click or drag along the timeline strip to seek. With no video loaded, the round play button plays the narration on its own, with the same timing, so you can check timing changes by ear first. The strip shows a numbered block per paragraph on a thin silence line. A `[pause …]` line is an amber block (cutting into the paragraph's block when it's inside one), and silence added by a later Start is a green block labelled with its length. Hover the strip to see the time and the paragraph under the pointer. Next to it, **Paragraph timing** has one card per paragraph: its number, its chain and timer buttons, its **Start** (in video time), how long its speech lasted in the render (〰 `11.9s`), and the full paragraph text underneath. The paragraph playing now is highlighted, and the list scrolls to keep it in view, during playback and whenever you jump (clicking the strip, <kbd>⌥J</kbd>/<kbd>⌥L</kbd>, the video's scrubber).

Between two cards, a **⏸ pill** on a dotted line shows the pause before the next paragraph, and on the right where it comes from: the **paragraph pause** setting, or the `[pause …]` line(s) in the script. A leading `[pause …]` shows above ¶1 as the silence before the voice starts. When a timing change resizes a pause, the pill turns green and reads old → new (e.g. ~~`0.8s`~~ → `2.4s`), followed by the difference (`+1.6s`); the new length is what Apply writes into the script. The pause lights up while that silence plays.

You can set a Start two ways:

- **Tap along:** play the video and press <kbd>⌥N</kbd> when the next paragraph should start. The card marked with an accent edge gets the current time, and the mark moves to the next card. Click any card to jump there and tap from that paragraph.
- **Click to set:** pause anywhere and press a card's timer button. You can also type a time, nudge it with <kbd>↑</kbd>/<kbd>↓</kbd> (0.1 s, or 1 s with ⇧), or clear the field so the paragraph simply follows the one before it.

Each card (except the last) has a **chain button** before its timer button and Start. It decides what a change to that Start does to the paragraphs after it:

- **Linked** (🔗, the default): they move along by the same amount, so the pauses between them stay as they are and only the pause before the changed paragraph is resized. While you edit a Start, or point at its chain button, the cards that will move are tinted.
- **Unlinked** (tinted broken-chain icon): the paragraph moves on its own. The paragraphs after it keep their Starts, so only the pauses before and after it get longer or shorter. It can't start so late that it would run into the next paragraph; the Start stops at the latest time that fits (on the 0.1 s grid). A red note between that paragraph and the one in its way says so (e.g. *¶2 can't start later: ¶3 stays at 0:18.6.*), with a **Link ¶2** button to go further. The note goes away with the next change, or with ×.

The link applies to typing, nudging, tapping, clearing, and putting a Start back. It belongs to the paragraph's text, so it survives Apply and reloads. A changed Start is accent-colored and listed in the bar above the cards. Next to it, a **↺ was** chip shows the rendered Start, struck through, and how far it moved (↺ ~~`0:05.9`~~ `+1.1s`); click the chip to put that Start back. The pauses they resize turn green. **Discard** drops all of them. Pending changes survive a page reload as long as the script is unchanged.

**Live preview:** changes play right away, with or without a video, using the current render. If a paragraph now starts later, the audio waits in silence until then (a green block on the timeline strip). If it starts earlier, the audio jumps ahead to it. A paragraph is never cut off: if the previous one is still speaking at its Start, it keeps its usual gap after it instead, and its card says so. The preview uses Web Audio for sample-accurate jumps, which the browser may only start after your first click or key press. At speeds other than 1×, the voice pitch shifts.

**Apply** (<kbd>⌘↵</kbd> on this screen) writes the timing back into the script as `[pause …]` values and renders again. Only the gaps that changed are touched: an existing pause there is updated, otherwise one is added. Either way the pause ends up on its own line, with a blank line on each side, so it's easy to spot between the paragraphs. Gaps a paragraph keeps because it was pushed along stay as they are. Unchanged sentences are cached, so re-rendering is quick. Back on **1 · Script** you can keep editing. Opening **2 · Sync** with a changed script generates first.

Paragraph 1 can take a negative Start, e.g. `-0:02.5`. The voice then starts 2.5 s before the video. This is kept with the render, not in the script, and Sync shows "the video starts 2.50s into the audio". In the preview, playing from 0:00 runs the intro first, holding the video on its first frame. When editing, place the narration audio 2.5 s before the video, or delay the video by 2.5 s. A positive Start for paragraph 1 becomes a leading `[pause …]`.

**Reset script** restores the original script from `scripts/graphql-update.txt`. Until you edit the script again, the button reads **Undo reset** and brings your version back.

**Help:** the **?** icon in the header (or <kbd>?</kbd> / <kbd>⌘/</kbd>) opens a cheat sheet with the three-step flow, the shortcuts for each screen (the current screen is marked), the script syntax, and syncing tips. <kbd>Esc</kbd> or a click outside closes it. On Windows and Linux, the shortcuts show <kbd>Ctrl</kbd>/<kbd>Alt</kbd> instead of ⌘/⌥.

`[at …]` cues are no longer supported. Scripts that still have them are converted when the page loads: the cues are removed and their times become pending Starts on 2 · Sync, ready to Apply.

Outputs (WAV, MP3, SRT) are written to `output/`.

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
| `App.vue` | header, the two screens, overlays |
| `components/script/` | 1 · Script: editor, toolbar, settings sidebar, pronunciation list |
| `components/sync/` | 2 · Sync: video panel, transport, timeline strip, downloads, paragraph timing cards (paragraph cards and ⏸ pause connectors) and draft bar |
| `components/overlays/` | progress card, help dialog, shortcut list |
| `components/ui/` | SVG icon sprite and `Icon` |
| `composables/` | behavior: rendering, playback clock, cues, editor, preview, workflow, shortcuts, persistence |
| `lib/` | pure helpers and data: script parsing, timing math, formatting, pronunciation, voices, shortcut list, API calls |
| `state.js` | shared reactive state |
| `styles/base.css` | theme tokens and shared styles; components keep their own styles scoped |
