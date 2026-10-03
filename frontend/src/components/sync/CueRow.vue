<!-- A paragraph card: its Start (editable, with what it was before the change), its spoken length, the link to
     the paragraphs after it and the tap button, then its text and timing notes. -->
<script setup>
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import CueTimeInput from './CueTimeInput.vue';
import { paraCount, tapIndex } from '../../state';
import { fmt } from '../../lib/format';
import { useCues } from '../../composables/useCues';

const props = defineProps({
  row: { type: Object, required: true },
  index: { type: Number, required: true },
  moving: { type: Boolean, default: false },
});
const { activePara, tapRow, resetCue, selectRow, toggleFree, linkHover, linkEdit } = useCues();

const lastRow = computed(() => props.index >= paraCount.value - 1);
const after = computed(() => (props.index + 2 === paraCount.value ? `¶${paraCount.value}` : `¶${props.index + 2}–¶${paraCount.value}`));
const linkTitle = computed(() => (props.row.free
  ? `Moves on its own: changing this Start leaves ${after.value} where they are. Click to link them, so they move along with it.`
  : `Linked: changing this Start moves ${after.value} along with it. Click to move this paragraph on its own.`));
// Pointing at the link, or editing the Start, shows which cards would move with this one.
const marks = { hover: linkHover, edit: linkEdit };
const mark = (which, on) => {
  const r = marks[which];
  if (on) r.value = props.index;
  else if (r.value === props.index) r.value = -1;
};

// The rendered Start, shown while the Start differs from it; clicking it puts it back.
const was = computed(() => (props.row.pending && props.row.rendered != null ? fmt(props.row.rendered) : ''));
const shift = computed(() => {
  if (!was.value || props.row.value == null) return '';
  const d = Math.round((props.row.value - props.row.rendered) * 10) / 10;
  return d ? `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}s` : '';
});

function onClick(e) {
  if (!e.target.closest('input, button')) selectRow(props.index);
}
</script>

<template>
  <div
    class="card"
    :class="{ next: index === tapIndex, active: index === activePara, moving, edited: !!was }"
    title="Jump here and tap from this paragraph"
    @click="onClick"
  >
    <div class="head">
      <span class="num" :title="`¶${index + 1}`">{{ index + 1 }}</span>
      <CueTimeInput :index="index" :value="row.value" :est="row.est" :pending="row.pending" @focus="mark('edit', true)" @blur="mark('edit', false)" />
      <button v-if="was" class="was" :title="`Changed${shift ? ` by ${shift}` : ''}. Click to put back ${was}, as rendered.`" @click="resetCue(index)">
        <Icon name="reset" /><span class="old">{{ was }}</span><span v-if="shift" class="shift">{{ shift }}</span>
      </button>
      <span class="spacer" />
      <span v-if="row.length" class="len" title="How long the paragraph is spoken"><Icon name="wave" />{{ row.length }}</span>
      <div class="actions">
        <button
          v-if="!lastRow"
          class="act link"
          :class="{ free: row.free }"
          :aria-pressed="row.free"
          :aria-label="row.free ? 'Moves on its own' : 'Linked to the paragraphs after it'"
          :title="linkTitle"
          @click="toggleFree(index)"
          @mouseenter="mark('hover', true)"
          @mouseleave="mark('hover', false)"
          @focus="mark('edit', true)"
          @blur="mark('edit', false)"
        ><Icon :name="row.free ? 'unlink' : 'link'" /><span v-if="row.free">Unlinked</span></button>
        <span v-else class="act-slot" />
        <button class="act" title="Set the Start to the current video time" aria-label="Set to the current video time" @click="tapRow(index)"><Icon name="timer" /></button>
      </div>
    </div>
    <p class="txt">{{ row.snippet }}</p>
    <p v-for="(note, k) in row.notes" :key="k" class="note" :class="{ info: note.info }"><Icon :name="note.info ? 'info' : 'alert'" />{{ note.text }}</p>
  </div>
</template>

<style scoped>
.card { --pad: 12px; --num: 24px; position: relative; padding: 10px var(--pad) 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); cursor: pointer; transition: background .12s, border-color .12s, box-shadow .12s; }
.card:hover { border-color: var(--border-strong); background: var(--surface-2); }
.card.moving { border-color: var(--accent-line); background: color-mix(in srgb, var(--accent-weak) 70%, var(--surface)); }
.card.active { border-color: var(--accent-line); background: var(--active); box-shadow: inset 3px 0 0 var(--primary); }

.head { display: flex; align-items: center; gap: 8px; min-height: 30px; }
.num { display: inline-grid; place-items: center; flex: none; width: var(--num); height: var(--num); border-radius: 7px; background: var(--surface-3); color: var(--muted); font-size: 11.5px; font-weight: 650; font-variant-numeric: tabular-nums; margin-right: 2px; }
.next .num { background: var(--primary); color: #fff; }

.was { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; box-shadow: none; color: var(--subtle); font: 12px var(--mono); cursor: pointer; }
.was .i { width: 12px; height: 12px; }
.was .old { text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--subtle) 70%, transparent); }
.was .shift { color: var(--accent); font-weight: 600; }
.was:hover { background: var(--surface-3); color: var(--text); }
.was:hover .old { text-decoration: none; }

.len { display: inline-flex; align-items: center; gap: 5px; color: var(--subtle); font-size: 12px; font-variant-numeric: tabular-nums; }
.len .i { width: 13px; height: 13px; }

.actions { display: flex; align-items: center; gap: 2px; margin-left: 4px; }
.act { display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 28px; min-width: 28px; padding: 0 6px; border: 0; border-radius: 7px; background: transparent; box-shadow: none; color: var(--subtle); font: 600 11.5px var(--ui-font); cursor: pointer; opacity: .7; transition: opacity .12s, background .12s, color .12s; }
.act .i { width: 15px; height: 15px; }
.act-slot { width: 28px; }
.card:hover .act, .card.active .act, .card:focus-within .act, .act.free { opacity: 1; }
.act:hover { background: var(--surface-3); color: var(--text); }
.act:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; opacity: 1; }
.act.free, .act.free:hover { padding: 0 9px 0 7px; background: var(--pause-bg); color: var(--pause-ink); box-shadow: inset 0 0 0 1px var(--pause-line); }

/* Text and notes line up with the Start field, after the number. */
.txt, .note { margin: 0; padding-left: calc(var(--num) + 10px); }
.txt { margin-top: 6px; color: color-mix(in srgb, var(--text) 86%, var(--surface)); font-size: 13.5px; line-height: 1.55; text-wrap: pretty; }
.card.active .txt, .card:hover .txt { color: var(--text); }
.note { display: flex; align-items: center; gap: 6px; margin-top: 6px; color: var(--warn); font-size: 12px; }
.note .i { width: 13px; height: 13px; }
.note.info { color: var(--muted); }
</style>
