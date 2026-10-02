"""Narration engine: parses a script with pause directives and renders it with Kokoro TTS.

Script syntax
-------------
- Blank line            -> paragraph break (uses the paragraph pause)
- Sentence boundary     -> sentence pause
- [pause 2s] / [2s]     -> silence of the given length (also: 500ms, 1.5); before the first
                           sentence it delays the voice
- # comment             -> line is ignored (useful for scene notes)

Usage (CLI):
    uv run narrate.py scripts/graphql-update.txt -o output/narration.wav
"""

from __future__ import annotations

import argparse
import re
import threading
import time
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "kokoro-v1.0.onnx"
VOICES_PATH = ROOT / "models" / "voices-v1.0.bin"

SAMPLE_RATE = 24000
DEFAULT_VOICE = "af_heart"
LANG_BY_PREFIX = {"a": "en-us", "b": "en-gb"}

DIRECTIVE_RE = re.compile(r"\[([^\[\]\n]*)\]")
PAUSE_RE = re.compile(
    r"^(?:pause|break|p)?\s*(\d+(?:\.\d+)?)\s*(ms|s|sec|secs|seconds)?$", re.IGNORECASE
)
SENTENCE_END_RE = re.compile(r"(?<=[.!?…])([\"'”’)]*)\s+(?=[\"'“‘(]?[A-Z0-9])")
SPEAKABLE_RE = re.compile(r"\w")


class RenderCancelled(Exception):
    """Narrator.render stopped because its cancel event was set."""


@dataclass
class Item:
    kind: str  # "speech" | "pause"
    start_char: int
    end_char: int
    text: str = ""
    seconds: float = 0.0
    auto: bool = False  # automatic sentence/paragraph pause


@dataclass
class TimelineEntry:
    kind: str
    start: float
    end: float
    line: int
    start_char: int
    end_char: int
    text: str = ""
    auto: bool = False


@dataclass
class RenderResult:
    audio: np.ndarray
    duration: float
    timeline: list[TimelineEntry] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def timeline_dicts(self) -> list[dict]:
        return [asdict(e) for e in self.timeline]


def format_timestamp(seconds: float, srt: bool = False) -> str:
    if srt:
        seconds = max(seconds, 0.0)
        ms = round(seconds * 1000)
        h, ms = divmod(ms, 3_600_000)
        m, ms = divmod(ms, 60_000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    sign = "-" if seconds < -0.05 else ""
    m, s = divmod(abs(seconds), 60)
    return f"{sign}{int(m)}:{s:04.1f}"


def parse_pronunciations(text: str) -> list[tuple[str, str]]:
    rules = []
    for raw in (text or "").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        sep = "=>" if "=>" in line else "="
        if sep not in line:
            continue
        word, spoken = (s.strip() for s in line.split(sep, 1))
        if word:
            rules.append((word, spoken))
    return sorted(rules, key=lambda r: len(r[0]), reverse=True)


def apply_pronunciations(text: str, rules: list[tuple[str, str]]) -> str:
    for word, spoken in rules:
        text = re.sub(rf"(?<!\w){re.escape(word)}(?!\w)", spoken, text)
    return text


def _line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def _strip_span(text: str, start: int, end: int) -> tuple[int, int]:
    while start < end and text[start].isspace():
        start += 1
    while end > start and text[end - 1].isspace():
        end -= 1
    return start, end


def parse_script(
    script: str, sentence_pause: float, paragraph_pause: float
) -> tuple[list[Item], list[str]]:
    """Turn a script into speech/pause items, preserving character offsets."""
    warnings: list[str] = []
    raw: list[Item | str] = []  # str markers: "sentence" | "paragraph"

    # Collect paragraphs as spans of consecutive non-blank, non-comment lines.
    paragraphs: list[tuple[int, int]] = []
    offset, para_start, para_end = 0, None, None
    for line in script.splitlines(keepends=True):
        content = line.strip()
        if content and not content.startswith("#"):
            if para_start is None:
                para_start = offset
            para_end = offset + len(line.rstrip("\r\n"))
        elif para_start is not None:
            paragraphs.append((para_start, para_end))
            para_start = None
        offset += len(line)
    if para_start is not None:
        paragraphs.append((para_start, para_end))

    def add_text(start: int, end: int) -> None:
        start, end = _strip_span(script, start, end)
        if start >= end:
            return
        chunk = script[start:end]
        cursor = 0
        bounds = [m.start() + len(m.group(1)) for m in SENTENCE_END_RE.finditer(chunk)] + [len(chunk)]
        for i, b in enumerate(bounds):
            s, e = _strip_span(chunk, cursor, b)
            if s < e:
                sentence = " ".join(chunk[s:e].split())
                if SPEAKABLE_RE.search(sentence):
                    if i > 0:
                        raw.append("sentence")
                    raw.append(Item("speech", start + s, start + e, text=sentence))
            cursor = b

    for p_index, (p_start, p_end) in enumerate(paragraphs):
        if p_index > 0:
            raw.append("paragraph")
        cursor = p_start
        for m in DIRECTIVE_RE.finditer(script, p_start, p_end):
            add_text(cursor, m.start())
            body = m.group(1).strip()
            line = _line_of(script, m.start())
            if pm := PAUSE_RE.match(body):
                value = float(pm.group(1))
                if (pm.group(2) or "s").lower() == "ms":
                    value /= 1000
                raw.append(Item("pause", m.start(), m.end(), text=m.group(0), seconds=value))
            else:
                warnings.append(f"Line {line}: unknown directive {m.group(0)} was ignored")
                raw.append("sentence")
            cursor = m.end()
        add_text(cursor, p_end)

    # Resolve boundaries: explicit pauses replace automatic ones (several add up); drop leading/trailing auto pauses.
    items: list[Item] = []
    run: list[Item | str] = []

    def flush(next_is_speech: bool) -> None:
        explicit = [r for r in run if isinstance(r, Item)]
        if explicit:
            items.extend(explicit)
        elif run and next_is_speech and items and items[-1].kind == "speech":
            seconds = paragraph_pause if "paragraph" in run else sentence_pause
            prev = items[-1]
            items.append(Item("pause", prev.end_char, prev.end_char, seconds=seconds, auto=True))
        run.clear()

    for entry in raw:
        if isinstance(entry, Item) and entry.kind == "speech":
            flush(next_is_speech=True)
            items.append(entry)
        else:
            run.append(entry)
    flush(next_is_speech=False)
    return items, warnings


class Narrator:
    def __init__(self, model_path: Path = MODEL_PATH, voices_path: Path = VOICES_PATH):
        from kokoro_onnx import Kokoro

        if not model_path.exists() or not voices_path.exists():
            raise FileNotFoundError(
                f"Model files missing. Expected {model_path} and {voices_path}. See README.md."
            )
        self.kokoro = Kokoro(str(model_path), str(voices_path))
        self._cache: OrderedDict[tuple, np.ndarray] = OrderedDict()
        self._lock = threading.Lock()
        self._rate: float | None = None  # seconds of synthesis per character, from the last render

    def voices(self) -> list[str]:
        return [v for v in self.kokoro.get_voices() if v[:1] in LANG_BY_PREFIX]

    @staticmethod
    def _key(text: str, voice: str, speed: float) -> tuple:
        return (text, voice, round(speed, 3))

    def _synth(self, text: str, voice: str, speed: float) -> np.ndarray:
        key = self._key(text, voice, speed)
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        lang = LANG_BY_PREFIX.get(voice[:1], "en-us")
        samples, sr = self.kokoro.create(text, voice=voice, speed=speed, lang=lang)
        if sr != SAMPLE_RATE:
            raise RuntimeError(f"Unexpected sample rate {sr}")
        audio = np.asarray(samples, dtype=np.float32)
        self._cache[key] = audio
        if len(self._cache) > 2000:
            self._cache.popitem(last=False)
        return audio

    def render(
        self,
        script: str,
        voice: str = DEFAULT_VOICE,
        speed: float = 1.0,
        sentence_pause: float = 0.35,
        paragraph_pause: float = 0.8,
        pronunciations: str = "",
        progress: Callable[[dict], None] | None = None,
        cancel: threading.Event | None = None,
    ) -> RenderResult:
        """Render the script. progress gets a dict before each sentence that needs synthesis (cached ones are
        instant) and once at the end; setting cancel stops before the next sentence with RenderCancelled."""
        if voice not in self.kokoro.get_voices():
            raise ValueError(f"Unknown voice: {voice}")
        if not 0.5 <= speed <= 2.0:
            raise ValueError("Speed must be between 0.5 and 2.0")

        items, warnings = parse_script(script, sentence_pause, paragraph_pause)
        rules = parse_pronunciations(pronunciations)
        chunks: list[np.ndarray] = []
        timeline: list[TimelineEntry] = []
        t = 0.0

        def silence(seconds: float) -> None:
            nonlocal t
            n = int(round(seconds * SAMPLE_RATE))
            if n > 0:
                chunks.append(np.zeros(n, dtype=np.float32))
                t += n / SAMPLE_RATE

        def stopped() -> bool:
            return cancel is not None and cancel.is_set()

        def report(**info) -> None:
            if progress:
                progress(info)

        if not self._lock.acquire(blocking=False):
            report(phase="waiting")  # another render is still running (or stopping)
            while not self._lock.acquire(timeout=0.1):
                if stopped():
                    raise RenderCancelled()
        try:
            spoken_texts: list[str | None] = []
            todo: set[int] = set()  # items that need synthesis
            seen: set[tuple] = set()
            for i, item in enumerate(items):
                spoken = apply_pronunciations(item.text, rules) if item.kind == "speech" else None
                if spoken is not None and not SPEAKABLE_RE.search(spoken):
                    spoken = None
                spoken_texts.append(spoken)
                if spoken is not None:
                    key = self._key(spoken, voice, speed)
                    if key not in self._cache and key not in seen:
                        todo.add(i)
                    seen.add(key)
            sentences = sum(s is not None for s in spoken_texts)
            chars_total = sum(len(spoken_texts[i]) for i in todo)
            done = chars_done = 0
            synth_time = 0.0

            def report_synth(current: str | None) -> None:
                rate = synth_time / chars_done if chars_done else self._rate
                report(
                    phase="synth", done=done, total=len(todo), sentences=sentences,
                    chars_done=chars_done, chars_total=chars_total,
                    current_chars=len(current) if current else 0, rate=rate,
                )

            for i, item in enumerate(items):
                line = _line_of(script, item.start_char)
                start = t
                if item.kind == "speech":
                    spoken = spoken_texts[i]
                    if spoken is None:
                        continue
                    if i in todo:
                        if stopped():
                            raise RenderCancelled()
                        report_synth(spoken)
                        began = time.perf_counter()
                    audio = self._synth(spoken, voice, speed)
                    if i in todo:
                        synth_time += time.perf_counter() - began
                        done += 1
                        chars_done += len(spoken)
                        self._rate = synth_time / chars_done
                    chunks.append(audio)
                    t += len(audio) / SAMPLE_RATE
                elif item.kind == "pause":
                    silence(item.seconds)
                timeline.append(
                    TimelineEntry(
                        kind=item.kind,
                        start=round(start, 3),
                        end=round(t, 3),
                        line=line,
                        start_char=item.start_char,
                        end_char=item.end_char,
                        text=item.text,
                        auto=item.auto,
                    )
                )
            report_synth(None)
        finally:
            self._lock.release()

        audio = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)
        return RenderResult(audio=audio, duration=round(t, 3), timeline=timeline, warnings=warnings)


def write_wav(path: Path, audio: np.ndarray) -> None:
    sf.write(str(path), np.clip(audio, -1.0, 1.0), SAMPLE_RATE, subtype="PCM_16")


def to_srt(timeline: list[TimelineEntry]) -> str:
    blocks = []
    for i, e in enumerate((e for e in timeline if e.kind == "speech"), start=1):
        blocks.append(
            f"{i}\n{format_timestamp(e.start, srt=True)} --> {format_timestamp(e.end, srt=True)}\n{e.text}\n"
        )
    return "\n".join(blocks)


def main() -> None:
    parser = argparse.ArgumentParser(description="Render a narration script to audio with Kokoro TTS.")
    parser.add_argument("script", type=Path, help="Script text file")
    parser.add_argument("-o", "--output", type=Path, default=ROOT / "output" / "narration.wav")
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--sentence-pause", type=float, default=0.35)
    parser.add_argument("--paragraph-pause", type=float, default=0.8)
    parser.add_argument("--pronunciations", type=Path, help="File with 'word = spoken form' lines")
    parser.add_argument("--srt", action="store_true", help="Also write subtitles next to the audio")
    args = parser.parse_args()

    narrator = Narrator()
    result = narrator.render(
        args.script.read_text(encoding="utf-8"),
        voice=args.voice,
        speed=args.speed,
        sentence_pause=args.sentence_pause,
        paragraph_pause=args.paragraph_pause,
        pronunciations=args.pronunciations.read_text(encoding="utf-8") if args.pronunciations else "",
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_wav(args.output, result.audio)
    if args.srt:
        args.output.with_suffix(".srt").write_text(to_srt(result.timeline), encoding="utf-8")

    for e in result.timeline:
        if e.kind == "speech":
            print(f"{format_timestamp(e.start):>8}  L{e.line:<3} {e.text}")
        elif not e.auto:
            print(f"{format_timestamp(e.start):>8}  L{e.line:<3} {e.text} ({e.end - e.start:.1f}s)")
    for w in result.warnings:
        print(f"WARNING: {w}")
    print(f"Wrote {args.output} ({format_timestamp(result.duration)})")


if __name__ == "__main__":
    main()
