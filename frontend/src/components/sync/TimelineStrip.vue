<!-- The narration as a strip: a numbered block per paragraph on a thin silence line, [pause …] lines as amber
     dashes and silence added by a later Start as green dashes. Hover to see the time and paragraph under the
     pointer; click or drag to seek. -->
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
    : { left: `calc(${pct(e.start)} + 3px)`, width: `max(2px, calc(${pct(len)} - 6px))` };
  return { ...e, i, label, short, style };
}).filter((e) => e.end > e.start));
const videoOnly = computed(() => !!last.value && videoLoaded.value && videoDuration.value + lead.value > narrationEnd.value);

// The pointer: where it is over the strip and what plays there.
const hover = ref(null), scrubbing = ref(false);
const timeAt = (x) => {
  const r = track.value.getBoundingClientRect();
  return Math.min(1, Math.max(0, (x - r.left) / r.width)) * totalDuration.value;
};
const hint = computed(() => {
  const h = hover.value;
  if (!h) return null;
  const at = segs.value.filter((e) => h.t >= e.start && h.t < e.end);
  const e = at.find((x) => x.kind === 'pause' && x.inner) || at.find((x) => x.kind === 'speech') || at[0];
  let what = 'Pause', text = '';
  if (h.t >= narrationEnd.value - 0.05) what = videoOnly.value && h.t > narrationEnd.value ? 'Video only' : 'End';
  else if (h.t < lead.value && !e) what = 'Before the video';
  else if (e?.kind === 'speech') { what = `¶${e.para + 1}`; text = e.text.replace(/^¶\d+\s+/, ''); }
  else if (e?.kind === 'pause') { what = 'Pause'; text = e.text || ''; }
  else if (e?.kind === 'wait') { what = `Added pause +${gapLen(e.end - e.start)}`; text = e.text; }
  const sr = strip.value.getBoundingClientRect();
  return { time: fmt(h.t - lead.value), what, text, hot: e?.i ?? -1, x: h.x - sr.left, f: (h.x - sr.left) / sr.width };
});

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
      aria-label="Timeline: click or drag to seek"
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
        <div v-if="hint" class="cursor" :style="{ left: pct(hover.t) }" />
        <div v-if="last" class="playhead" :style="{ left: pct(clock.t) }" />
      </div>
    </div>
    <div v-if="hint" class="chip" :style="{ left: `${hint.x}px`, transform: `translateX(-${hint.f * 100}%)` }">
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
/* Inset from the rounded edges so the first and last blocks (and the playhead at 0) aren't clipped. */
.track { position: absolute; inset: 0 10px; }

/* Silence: a thin line under everything, so the space between blocks reads as time passing. */
.silence { position: absolute; left: 0; top: 50%; height: 2px; margin-top: -1px; border-radius: 1px; background: var(--border-strong); }

.seg { position: absolute; top: 10px; bottom: 10px; display: flex; align-items: center; justify-content: center; container-type: inline-size; }
.lbl { overflow: hidden; white-space: nowrap; font: 600 10.5px/1 var(--mono); letter-spacing: -.01em; pointer-events: none; }

/* Opaque mixes rather than opacity, so the silence line doesn't show through. */
.seg.speech { justify-content: flex-start; padding-left: 7px; border-radius: 6px; background: color-mix(in srgb, var(--speech) 78%, var(--surface-2)); transition: background .12s, box-shadow .12s, filter .12s; }
.seg.speech .lbl { color: rgba(255, 255, 255, .92); }
.seg.speech.hot { background: color-mix(in srgb, var(--speech) 92%, var(--surface-2)); }
.seg.speech.active { background: var(--speech); filter: brightness(1.12); box-shadow: 0 0 0 2px var(--surface-2), 0 0 0 4px color-mix(in srgb, var(--speech) 55%, transparent); z-index: 1; }
@container (max-width: 15px) { .seg.speech .lbl { display: none; } }

/* [pause …] lines and added silence: dashes on the silence line, with their length when there's room. */
.seg.pause::before, .seg.wait::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px; border-radius: 1px; }
.seg.pause::before { background: repeating-linear-gradient(90deg, var(--pause) 0 5px, transparent 5px 8px); }
.seg.wait::before { height: 3px; margin-top: -1.5px; background: repeating-linear-gradient(90deg, var(--wait) 0 6px, transparent 6px 9px); }
.seg.pause .lbl, .seg.wait .lbl { position: relative; padding: 2px 5px; border-radius: 5px; font-size: 10px; }
.seg.pause .lbl { background: var(--pause-bg); color: var(--pause-ink); box-shadow: 0 0 0 1px var(--pause-line), 0 0 0 3px var(--surface-2); }
.seg.wait .lbl { background: var(--wait-bg); color: var(--wait-ink); box-shadow: 0 0 0 1px var(--wait-line), 0 0 0 3px var(--surface-2); }
.seg.wait.active::before, .seg.wait.hot::before { height: 4px; margin-top: -2px; }
.seg.pause.active::before, .seg.pause.hot::before { height: 3px; margin-top: -1.5px; }
.seg .lbl.short { display: none; }
@container (max-width: 46px) {
  .seg.pause .lbl, .seg.wait .lbl { display: none; }
  .seg.pause .lbl.short, .seg.wait .lbl.short { display: block; padding: 2px 3px; }
}
@container (max-width: 26px) { .seg.pause .lbl.short, .seg.wait .lbl.short { display: none; } }
/* A [pause …] inside a paragraph: a cut in its block, with the pause dashes running through. */
.seg.pause.inner { z-index: 1; background: var(--surface-2); }

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
