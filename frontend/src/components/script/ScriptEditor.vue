<!-- The script: its toolbar and the text itself. -->
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import ScriptToolbar from './ScriptToolbar.vue';
import { script } from '../../state';
import { useEditor } from '../../composables/useEditor';

const { textarea, onInput, readSelection } = useEditor();
const el = ref(null);
// Edits go through useEditor (not v-model) so they land on the textarea's undo stack.
onMounted(() => { textarea.value = el.value; });
onBeforeUnmount(() => { textarea.value = null; });
</script>

<template>
  <section class="panel editor">
    <ScriptToolbar />
    <textarea
      ref="el"
      class="script"
      spellcheck="true"
      placeholder="Paste your narration here…"
      :value="script"
      @input="onInput"
      @select="readSelection"
      @keyup="readSelection"
      @mouseup="readSelection"
    />
  </section>
</template>

<style scoped>
.editor { padding: 0; gap: 0; overflow: hidden; }
.script { flex: 1; min-height: 160px; border: none; border-radius: 0; background: transparent; padding: 22px 28px; font: 13.5px/1.85 var(--mono); }
.script:focus { box-shadow: none; }
@media (max-width: 1000px) {
  .script { min-height: 50vh; }
}
</style>
