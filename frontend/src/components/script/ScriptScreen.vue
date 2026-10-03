<!-- 1 · Script: the sound settings on the left, the script editor on the right. -->
<script setup>
import SettingsSidebar from './SettingsSidebar.vue';
import ScriptEditor from './ScriptEditor.vue';
</script>

<template>
  <div class="screen script-screen">
    <SettingsSidebar />
    <ScriptEditor />
  </div>
</template>

<style scoped>
/* A gutter instead of a dividing line: the editor's toolbar rule stops short of the sidebar. */
.script-screen { display: grid; grid-template-columns: 300px minmax(0, 1fr); column-gap: 16px; }
@media (max-width: 1000px) {
  .script-screen { grid-template-columns: 1fr; }
}
</style>
