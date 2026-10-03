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
.script-screen { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 20px; }
@media (max-width: 1000px) {
  .script-screen { grid-template-columns: 1fr; }
}
</style>
