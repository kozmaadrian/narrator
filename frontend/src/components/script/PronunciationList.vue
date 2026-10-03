<!-- The pronunciation rules (word → how to say it) and the button that adds one. -->
<script setup>
import { computed, nextTick } from 'vue';
import Icon from '../ui/Icon.vue';
import PronunciationRow from './PronunciationRow.vue';
import { pronRules, script } from '../../state';
import { makeRule, ruleHints } from '../../lib/pronunciation';
import { useEditor } from '../../composables/useEditor';

const { selectedWord } = useEditor();
const rows = new Map();   // rule id → PronunciationRow (its focusWord / focusSay)
let addButton = null;

const hints = computed(() => ruleHints(pronRules.value, script.value));
const hasRule = (word) => pronRules.value.some((r) => r.word.trim() === word);
// The selected word, unless it's already in the list.
const fresh = computed(() => (selectedWord.value && !hasRule(selectedWord.value) ? selectedWord.value : ''));

const setRow = (id) => (row) => { if (row) rows.set(id, row); else rows.delete(id); };

async function addRule(word = selectedWord.value) {
  const existing = word && pronRules.value.find((r) => r.word.trim() === word);
  if (existing) return rows.get(existing.id)?.focusSay();
  const rule = makeRule(word, '');
  pronRules.value.push(rule);
  await nextTick();
  const row = rows.get(rule.id);
  if (word) row?.focusSay(); else row?.focusWord();
}

// Enter in a row's "sounds like": on to the next row, or a new one after the last.
function next(i) {
  const rule = pronRules.value[i + 1];
  if (rule) rows.get(rule.id)?.focusWord();
  else addRule('');
}

async function remove(i) {
  pronRules.value.splice(i, 1);
  await nextTick();
  const rule = pronRules.value[Math.min(i, pronRules.value.length - 1)];
  if (rule) rows.get(rule.id)?.focusWord();
  else addButton?.focus();
}
</script>

<template>
  <div v-if="pronRules.length" class="pron-list">
    <div class="pron-head"><span>Written</span><span>Sounds like</span></div>
    <PronunciationRow
      v-for="(rule, i) in pronRules"
      :key="rule.id"
      :ref="setRow(rule.id)"
      :rule="rule"
      :hint="hints[i]"
      @next="next(i)"
      @remove="remove(i)"
    />
  </div>
  <button
    :ref="(el) => (addButton = el)"
    class="sm add"
    :title="fresh ? `Add a pronunciation for “${fresh}”` : 'Add a word. Select it in the script first to fill it in.'"
    @click="addRule()"
  >
    <Icon name="plus" /><span>{{ fresh ? `Add “${fresh}”` : 'Add word' }}</span>
  </button>
</template>

<style scoped>
.pron-list { display: flex; flex-direction: column; gap: 6px; }
.pron-head { display: grid; grid-template-columns: minmax(0, 1fr) 12px minmax(0, 1fr) 26px 26px; gap: 4px; align-items: center; padding: 0 2px; color: var(--subtle); font-size: 11.5px; font-weight: 550; }
.pron-head span:nth-child(2) { grid-column: 3; }
button.add { align-self: flex-start; max-width: 100%; }
button.add span { overflow: hidden; text-overflow: ellipsis; }
</style>
