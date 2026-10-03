<!-- Narrator: 1 · Script (text and voice) and 2 · Sync (line the narration up with the recording). -->
<script setup>
import { onMounted, watchEffect } from 'vue';
import IconSprite from './components/ui/IconSprite.vue';
import AppHeader from './components/AppHeader.vue';
import ScriptScreen from './components/script/ScriptScreen.vue';
import SyncScreen from './components/sync/SyncScreen.vue';
import BusyOverlay from './components/overlays/BusyOverlay.vue';
import HelpDialog from './components/overlays/HelpDialog.vue';
import { busy, screen } from './state';
import { useRender } from './composables/useRender';
import { useWorkflow } from './composables/useWorkflow';
import { usePersistence } from './composables/usePersistence';
import { useShortcuts } from './composables/useShortcuts';

const { busyView, revealed } = useRender();
const { init } = useWorkflow();

watchEffect(() => document.body.classList.toggle('busy', busy.value));

// Both screens are mounted (v-show), so the video and audio elements exist before init loads the last render.
onMounted(() => {
  usePersistence();
  useShortcuts();
  init();
});
</script>

<template>
  <IconSprite />
  <AppHeader :inert="busy" />
  <main :inert="busy">
    <ScriptScreen v-show="screen === 'script'" />
    <SyncScreen v-show="screen === 'sync'" />
  </main>
  <BusyOverlay v-if="busyView && revealed" />
  <HelpDialog />
</template>
