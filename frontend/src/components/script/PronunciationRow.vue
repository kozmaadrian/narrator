<!-- One pronunciation rule: the word as written → how to say it, with Hear and Remove. -->
<script setup>
import { ref } from 'vue';
import Icon from '../ui/Icon.vue';
import { usePreview } from '../../composables/usePreview';

defineProps({
  rule: { type: Object, required: true },   // { id, word, say }, edited in place
  hint: { type: String, default: '' },      // why the rule may not do anything
});
const emit = defineEmits(['next', 'remove']);
const { hearRule } = usePreview();

const word = ref(null);
const say = ref(null);
defineExpose({ focusWord: () => word.value?.focus(), focusSay: () => say.value?.focus() });

function onSayEnter(e) {
  if (e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  emit('next');
}
</script>

<template>
  <div class="pron-row" :class="{ warn: !!hint }">
    <input
      ref="word" v-model="rule.word" class="word" placeholder="word" aria-label="Word as written"
      spellcheck="false" autocomplete="off" @keydown.enter.prevent="say.focus()"
    >
    <span style="display: flex"><Icon name="arrow" class="to" /></span>
    <input
      ref="say" v-model="rule.say" class="say" placeholder="sounds like" aria-label="How to say it"
      spellcheck="false" autocomplete="off" @keydown.enter="onSayEnter"
    >
    <button
      class="icon-btn hear"
      :aria-label="`Hear ${rule.word.trim() || 'it'}`"
      title="Hear it (how it sounds, or the word as the voice says it now)"
      @click="hearRule(rule)"
    >
      <Icon name="play" />
    </button>
    <button class="icon-btn" :aria-label="`Remove ${rule.word.trim() || 'this row'}`" title="Remove" @click="emit('remove')"><Icon name="x" /></button>
    <div v-if="hint" class="hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.pron-row { display: grid; grid-template-columns: minmax(0, 1fr) 12px minmax(0, 1fr) 30px 30px; gap: 4px; align-items: center; }
.pron-row input:not([type=checkbox]) { width: 100%; min-width: 0; height: 30px; padding: 0 8px; font-size: 13px; }
.to { width: 12px; height: 12px; color: var(--subtle); }
.icon-btn { width: 30px; height: 30px; padding: 0; margin: 0; color: var(--muted); }
.icon-btn .i { width: 14px; height: 14px; }
.icon-btn.hear .i { width: 12px; height: 12px; fill: currentColor; stroke: none; }
.hint { grid-column: 1 / -1; margin: -1px 2px 2px; color: var(--warn); font-size: 12px; line-height: 1.4; }
.warn .word { border-color: var(--warn-line); background: var(--warn-bg); }
</style>
