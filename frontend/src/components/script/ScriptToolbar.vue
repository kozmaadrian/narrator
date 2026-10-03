<!-- Preview, Reset, whether the script changed since the render, and the pause inserter. (Generate is in the
     header; pending timing changes show as a count on its 2 · Sync tab.) -->
<script setup>
import { computed } from 'vue';
import Icon from '../ui/Icon.vue';
import { beforeReset, pauseLen, stale } from '../../state';
import { useEditor } from '../../composables/useEditor';
import { usePreview } from '../../composables/usePreview';
import { useWorkflow } from '../../composables/useWorkflow';

const { insertPause } = useEditor();
const { previewAudio, preview } = usePreview();
const { resetScript } = useWorkflow();

const undo = computed(() => beforeReset.value != null);
</script>

<template>
  <div class="row toolbar">
    <button title="⇧⌘/Ctrl + Enter. Plays the selection, or the paragraph at the cursor." @click="preview()">
      <template v-if="previewAudio"><Icon name="stop" />Stop preview</template>
      <template v-else><Icon name="play" />Preview paragraph</template>
    </button>
    <button
      :title="undo ? 'Bring back the script as it was before the reset' : 'Restore the original script (scripts/graphql-update.txt)'"
      @click="resetScript()"
    >
      <template v-if="undo"><Icon name="undo" />Undo reset</template>
      <template v-else><Icon name="reset" />Reset script</template>
    </button>
    <span v-if="stale" class="badge">Changed since the last render</span>
    <span class="spacer" />
    <div class="combo">
      <button class="ghost" title="⌥P. Insert a pause at the cursor" @click="insertPause()"><Icon name="plus" />Pause</button>
      <span class="unit"><input v-model="pauseLen" type="number" min="0.1" step="0.1" aria-label="Pause length in seconds" title="Pause length in seconds">s</span>
    </div>
  </div>
</template>

<style scoped>
.toolbar { padding: 10px 12px; border-bottom: 1px solid var(--border); }
</style>
