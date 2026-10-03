<!-- Generate, Preview, Reset, what's out of date, and the pause inserter. -->
<script setup>
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import { beforeReset, draft, pauseLen, stale } from '../../state';
import { useEditor } from '../../composables/useEditor';
import { usePreview } from '../../composables/usePreview';
import { useWorkflow } from '../../composables/useWorkflow';

const { insertPause } = useEditor();
const { previewAudio, preview } = usePreview();
const { generate, resetScript } = useWorkflow();

const undo = computed(() => beforeReset.value != null);
const badge = computed(() => {
  if (draft.value) return `Unapplied timing changes in 2 · Sync${stale.value ? '; the script changed since the render' : ''}`;
  return stale.value ? 'Changed since the last render' : '';
});
</script>

<template>
  <div class="row toolbar">
    <button class="primary" title="⌘/Ctrl + Enter. Renders the narration and opens 2 · Sync." @click="generate()">
      Generate<Icon name="arrow" />
    </button>
    <button title="⇧⌘/Ctrl + Enter. Plays the selection, or the paragraph at the cursor." @click="preview()">
      <template v-if="previewAudio"><Icon name="stop" />Stop preview</template>
      <template v-else><Icon name="play" />Preview paragraph</template>
    </button>
    <button
      class="ghost"
      :title="undo ? 'Bring back the script as it was before the reset' : 'Restore the original script (scripts/graphql-update.txt)'"
      @click="resetScript()"
    >
      <template v-if="undo"><Icon name="undo" />Undo reset</template>
      <template v-else><Icon name="reset" />Reset script</template>
    </button>
    <span v-if="badge" class="badge">{{ badge }}</span>
    <span class="spacer" />
    <div class="combo">
      <button class="ghost" title="⌥P. Insert a pause at the cursor" @click="insertPause()"><Icon name="plus" />Pause</button>
      <span class="unit"><input v-model="pauseLen" type="number" min="0.1" step="0.1" title="Pause length in seconds">s</span>
    </div>
  </div>
</template>

<style scoped>
.toolbar { padding: 10px 12px; border-bottom: 1px solid var(--border); }
</style>
