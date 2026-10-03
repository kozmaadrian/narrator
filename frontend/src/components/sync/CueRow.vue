<!-- A paragraph: its Start (editable, tap, back to rendered), length, text and timing notes. -->
<script setup>
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import CueTimeInput from './CueTimeInput.vue';
import { tapIndex } from '../../state';
import { fmt } from '../../lib/format';
import { useCues } from '../../composables/useCues';

const props = defineProps({ row: { type: Object, required: true }, index: { type: Number, required: true } });
const { activePara, tapRow, resetCue, selectRow } = useCues();

const resetTitle = computed(() => (props.row.rendered != null ? `Back to ${fmt(props.row.rendered)}, as rendered` : 'Not rendered yet'));

function onClick(e) {
  if (!e.target.closest('input, button')) selectRow(props.index);
}
</script>

<template>
  <tr :class="{ next: index === tapIndex, active: index === activePara }" title="Jump here and tap from this paragraph" @click="onClick">
    <td class="n"><span class="num" :title="`¶${index + 1}`">{{ index + 1 }}</span></td>
    <td class="start">
      <CueTimeInput :index="index" :value="row.value" :est="row.est" :pending="row.pending" />
      <button class="icon-btn" title="Set to the current video time" @click="tapRow(index)"><Icon name="timer" /></button>
      <button
        class="icon-btn"
        :class="{ off: !row.pending }"
        :disabled="!row.pending"
        :title="resetTitle"
        @click="resetCue(index)"
      ><Icon name="reset" /></button>
    </td>
    <td class="t">{{ row.length }}</td>
    <td class="txt">
      {{ row.snippet }}
      <span v-for="(note, k) in row.notes" :key="k" class="note" :class="{ info: note.info }">{{ note.text }}</span>
    </td>
  </tr>
</template>

<style scoped>
tr { cursor: pointer; }
td { padding: 10px; border-bottom: 1px solid var(--border); vertical-align: top; transition: background .1s; }
td:first-child { padding-left: 16px; }
td:last-child { padding-right: 16px; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--surface-2); }
tr.active td { background: var(--active); }
td.n { width: 1%; padding-top: 13px; }
.num { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 6px; background: var(--surface-3); color: var(--muted); font-size: 11.5px; font-weight: 650; font-variant-numeric: tabular-nums; }
tr.next td.n { box-shadow: inset 3px 0 0 var(--primary); }
tr.next .num { background: var(--primary); color: #fff; }
td.start { width: 1%; white-space: nowrap; }
td.start > * { vertical-align: middle; }
td.t { width: 1%; padding-top: 15px; white-space: nowrap; color: var(--muted); font-size: 12.5px; font-variant-numeric: tabular-nums; }
td.txt { padding-top: 14px; line-height: 1.5; }
.note { display: block; margin-top: 4px; color: var(--warn); font-size: 12px; }
.note.info { color: var(--muted); }
</style>
