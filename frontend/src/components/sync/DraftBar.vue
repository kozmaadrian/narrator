<!-- Which paragraphs have pending Starts, with Discard and Apply. -->
<script setup>
import Icon from '../ui/Icon.vue';
import { useCues } from '../../composables/useCues';
import { useWorkflow } from '../../composables/useWorkflow';

const { draftSummary, discardDraft } = useCues();
const { applyDraft } = useWorkflow();
</script>

<template>
  <div class="row draft-bar">
    <Icon name="info" />
    <span class="info">{{ draftSummary }}</span>
    <span class="spacer" />
    <button class="ghost sm" title="Forget the pending timing changes" @click="discardDraft()">Discard</button>
    <button class="primary sm" title="⌘↵. Write the timing into the script as [pause …] values and render again" @click="applyDraft()">Apply</button>
  </div>
</template>

<style scoped>
.draft-bar { padding: 7px 7px 7px 12px; border-radius: 10px; border: 1px solid var(--accent-line); background: var(--accent-weak); flex: none; flex-wrap: nowrap; }
.draft-bar > .i { color: var(--accent); }
.info { font-size: 13px; }
</style>
