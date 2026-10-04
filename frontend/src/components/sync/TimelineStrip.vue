<!-- The narration as a strip: a numbered block per paragraph on a thin silence line, [pause …] lines as amber
     blocks and silence added by a later Start as green blocks. Hover to see the time and paragraph under the
     pointer; click or drag to seek. From the keyboard it is a slider: ←/→ seek 1 s (⇧ 5 s), Home/End. -->
<script setup>
import { computed, ref } from 'vue';
import { last, videoDuration, videoLoaded } from '../../state';
import { fmt, gapLen } from '../../lib/format';
import { usePlayback } from '../../composables/usePlayback';
import { useTimeline } from '../../composables/useTimeline';
import { useCues } from '../../composables/useCues';

const { clock, seekTo } = usePlayback();
const { lead, narrationEnd, totalDuration, stripEntries } = useTimeline();
const { activeSeg } = useCues();
const strip = ref(null), track = ref(null);

const pct = (t) => `${(t / totalDuration.value) * 100}%`;
const segs = computed(() => (last.value ? stripEntries.value : []).map((e, i) => {
  const len = e.end - e.start, speech = e.kind === 'speech';
  const label = speech ? `¶${e.para + 1}` : e.kind === 'wait' ? `+${gapLen(len)}` : e.inner ? '' : gapLen(len);
  // For silence too narrow for the full length: whole seconds (or tenths under one second).
  const round = len < 0.95 ? `${len.toFixed(1).replace(/^0/, '')}s` : `${Math.round(len)}s`;
  const short = speech || !label ? '' : e.kind === 'wait' ? `+${round}` : round;
  // Silence is inset a little so it never touches the blocks around it.
  const style = speech || e.inner
    ? { left: pct(e.start), width: `max(2px, ${pct(len)})` }
    : { left: `calc(${pct(e.start)} + 2px)`, width: `max(2px, calc(${pct(len)} - 4px))` };
  return { ...e, i, label, short, style };
}).filter((e) => e.end > e.start));
const videoOnly = computed(() => !!last.value && videoLoaded.value && videoDuration.value + lead.value > narrationEnd.value);
// Where a shorter video ends: the voice goes on over its last frame.
const videoEnd = computed(() => {
  const end = videoDuration.value + lead.value;
  return last.value && videoLoaded.value && Number.isFinite(end) && end < narrationEnd.value - 0.05 ? end : null;
});

// What plays at strip time t.
function describe(t) {
  const at = segs.value.filter((e) => t >= e.start && t < e.end);
  const e = at.find((x) => x.kind === 'pause' && x.inner) || at.find((x) => x.kind === 'speech') || at[0];
  let what = 'Pause', text = '';
  if (t >= narrationEnd.value - 0.05) what = videoOnly.value && t > narrationEnd.value ? 'Video only' : 'End';
  else if (t < lead.value && !e) what = 'Before the video';
  else if (e?.kind === 'speech') { what = `¶${e.para + 1}`; text = e.text.replace(/^¶\d+\s+/, ''); }
  else if (e?.kind === 'pause') { what = 'Pause'; text = e.text || ''; }
  else if (e?.kind === 'wait') { what = `Added pause +${gapLen(e.end - e.start)}`; text = e.text; }
  if (videoEnd.value != null && t >= videoEnd.value && what !== 'End') what += ' · after the video';
  return { what, text, hot: e?.i ?? -1 };
}

// The pointer (where it is over the strip), or the playhead while the strip has keyboard focus: the time and
// what plays there, in a chip above the strip.
const hover = ref(null), scrubbing = ref(false), keyFocus = ref(false);
const timeAt = (x) => {
  const r = track.value.getBoundingClientRect();
  return Math.min(1, Math.max(0, (x - r.left) / r.width)) * totalDuration.value;
};
const hint = computed(() => {
  const t = hover.value ? hover.value.t : keyFocus.value && last.value ? clock.t : null;
  if (t == null) return null;
  const sr = strip.value.getBoundingClientRect(), tr = track.value.getBoundingClientRect();
  const x = tr.left - sr.left + (t / totalDuration.value) * tr.width;
  return { time: fmt(t - lead.value), ...describe(t), x, f: Math.min(1, Math.max(0, x / sr.width)) };
});

// For screen readers: the video time in whole seconds and what plays there.
const whole = (t) => {
  const s = Math.floor(Math.abs(t));
  return `${t < 0 ? '−' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const second = computed(() => Math.floor(clock.t));
// Recomputed every frame while playing, but the string only changes with the second or the paragraph.
const valueText = computed(() => {
  if (!last.value) return null;
  return `${whole(clock.t - lead.value)}, ${describe(clock.t).what}`;
});

const KEY_STEPS = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
function onKeydown(e) {
  if (!last.value || e.altKey || e.ctrlKey || e.metaKey) return;
  let t;
  if (e.key in KEY_STEPS) t = clock.t + KEY_STEPS[e.key] * (e.shiftKey ? 5 : 1);
  else if (e.key === 'Home') t = 0;
  else if (e.key === 'End') t = totalDuration.value;
  else return;
  e.preventDefault();
  seekTo(Math.min(totalDuration.value, Math.max(0, t)));
}
const onFocus = (e) => { keyFocus.value = e.target.matches(':focus-visible'); };

let frame = 0, pendingT = null;
function seekSoon(t) {
  pendingT = t;
  if (!frame) frame = requestAnimationFrame(() => { frame = 0; seekTo(pendingT); });
}
function onDown(e) {
  if (!last.value || e.button !== 0) return;
  strip.value.setPointerCapture(e.pointerId);
  scrubbing.value = true;
  hover.value = { x: e.clientX, t: timeAt(e.clientX) };
  seekTo(hover.value.t);
}
function onMove(e) {
  if (!last.value) return;
  hover.value = { x: e.clientX, t: timeAt(e.clientX) };
  if (scrubbing.value) seekSoon(hover.value.t);
}
function onUp(e) {
  scrubbing.value = false;
  const r = strip.value.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) hover.value = null;
}
const onLeave = () => { if (!scrubbing.value) hover.value = null; };
</script>

<template>
  <div class="timeline">
    <div
      ref="strip"
      class="strip"
      :class="{ scrubbing, empty: !last }"
      :tabindex="last ? 0 : null"
      :role="last ? 'slider' : null"
      aria-label="Timeline"
      :aria-valuemin="last ? 0 : null"
      :aria-valuemax="last ? Math.ceil(totalDuration) : null"
      :aria-valuenow="last ? second : null"
      :aria-valuetext="valueText"
      @keydown="onKeydown"
      @focus="onFocus"
      @blur="keyFocus = false"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onLeave"
    >
      <div ref="track" class="track">
        <div v-if="last" class="silence" :style="{ width: pct(narrationEnd) }" />
        <div
          v-for="e in segs"
          :key="e.i"
          class="seg"
          :class="[e.kind, { inner: e.inner, active: e.i === activeSeg, hot: hint && e.i === hint.hot }]"
          :style="e.style"
        ><span v-if="e.label" class="lbl">{{ e.label }}</span><span v-if="e.short" class="lbl short">{{ e.short }}</span></div>
        <div v-if="last && lead > 0" class="vstart" :style="{ left: pct(lead) }" />
        <div v-if="videoOnly" class="videoonly" :style="{ left: pct(narrationEnd) }" />
        <div v-if="videoEnd != null" class="vstart" :style="{ left: pct(videoEnd) }" />
        <div v-if="hover" class="cursor" :style="{ left: pct(hover.t) }" />
        <div v-if="last" class="playhead" :style="{ left: pct(clock.t) }" />
      </div>
    </div>
    <div v-if="hint" class="chip" aria-hidden="true" :style="{ left: `${hint.x}px`, transform: `translateX(-${hint.f * 100}%)` }">
      <b>{{ hint.time }}</b><span class="what">{{ hint.what }}</span><span v-if="hint.text" class="txt">{{ hint.text }}</span>
    </div>
  </div>
</template>

<style scoped>
.timeline { position: relative; flex: 1; min-width: 0; }
.strip { position: relative; height: 48px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); cursor: pointer; overflow: hidden; touch-action: none; user-select: none; transition: border-color .12s; }
.strip:hover, .strip.scrubbing { border-color: var(--border-strong); }
.strip.scrubbing { cursor: grabbing; }
.strip.empty { cursor: default; }
.strip:focus-visible { outline-offset: 2px; }
/* Inset from the rounded edges so the first and last blocks (and the playhead at 0) aren't clipped. */
.track { position: absolute; inset: 0 10px; }

/* Silence: a thin line under everything, so the space between blocks reads as time passing. */
.silence { position: absolute; left: 0; top: 50%; height: 2px; margin-top: -1px; border-radius: 1px; background: var(--border-strong); }

.seg { position: absolute; top: 10px; bottom: 10px; display: flex; align-items: center; justify-content: center; container-type: inline-size; }
.lbl { overflow: hidden; white-space: nowrap; font: 600 12px/1 var(--mono); letter-spacing: -.01em; pointer-events: none; }

/* Square blocks: a paragraph's speech in indigo, a [pause …] line in amber and silence added by a later Start in
   green. Opaque mixes rather than opacity, so the silence line doesn't show through. */
.seg.speech, .seg.pause, .seg.wait { transition: background .12s, box-shadow .12s; }
.seg.speech { justify-content: flex-start; padding-left: 7px; background: color-mix(in srgb, var(--speech) 88%, var(--surface-2)); }
.seg.pause { background: color-mix(in srgb, var(--pause) 78%, var(--surface-2)); }
.seg.wait { background: color-mix(in srgb, var(--wait) 78%, var(--surface-2)); }
.seg.speech .lbl { color: #fff; }
.seg.pause .lbl { color: #3d1a02; font-size: 12px; }
.seg.wait .lbl { color: #011510; font-size: 12px; }  /* 4.5:1 on the dark theme's mix too */
.seg.speech.hot { background: color-mix(in srgb, var(--speech) 95%, var(--surface-2)); }
.seg.pause.hot { background: color-mix(in srgb, var(--pause) 92%, var(--surface-2)); }
.seg.wait.hot { background: color-mix(in srgb, var(--wait) 92%, var(--surface-2)); }
.seg.speech.active { background: var(--speech); }
.seg.pause.active { background: var(--pause); }
.seg.wait.active { background: var(--wait); }
/* The playing block: full colour and a white inset edge (no brightening, which would cost label contrast). */
.seg.active { box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .7); z-index: 1; }
/* A [pause …] inside a paragraph sits on top of its block. */
.seg.pause.inner { z-index: 1; }

/* Labels only when they fit: the full length, then a rounded one, then nothing. */
@container (max-width: 15px) { .seg.speech .lbl { display: none; } }
.seg .lbl.short { display: none; }
@container (max-width: 40px) {
  .seg.pause .lbl, .seg.wait .lbl { display: none; }
  .seg.pause .lbl.short, .seg.wait .lbl.short { display: block; }
}
@container (max-width: 20px) { .seg.pause .lbl.short, .seg.wait .lbl.short { display: none; } }

.videoonly { position: absolute; top: 0; bottom: 0; right: -10px; background: repeating-linear-gradient(45deg, transparent 0 6px, var(--border) 6px 8px); }
.vstart { position: absolute; top: 6px; bottom: 6px; width: 0; border-left: 2px dashed var(--muted); opacity: .6; }
.cursor { position: absolute; top: 4px; bottom: 4px; width: 1px; margin-left: -.5px; background: var(--text); opacity: .35; pointer-events: none; z-index: 2; }
.scrubbing .cursor { display: none; }
.playhead { position: absolute; top: 5px; bottom: 5px; width: 2px; margin-left: -1px; border-radius: 1px; background: var(--playhead); box-shadow: 0 0 0 1px var(--surface-2); pointer-events: none; z-index: 3; }
.playhead::before { content: ""; position: absolute; top: -2px; left: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--playhead); box-shadow: 0 0 0 2px var(--surface-2); }

/* What's under the pointer, above the strip; it slides from left- to right-aligned so it never overflows. */
.chip { position: absolute; bottom: calc(100% + 8px); display: flex; align-items: baseline; gap: 8px; max-width: min(420px, 100%); padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--surface); box-shadow: 0 6px 20px rgba(16, 24, 40, .16); font-size: 12px; white-space: nowrap; pointer-events: none; z-index: 5; }
.chip b { font: 650 12px var(--mono); font-variant-numeric: tabular-nums; }
.chip .what { color: var(--accent); font-weight: 600; }
.chip .txt { min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--muted); }
</style>
