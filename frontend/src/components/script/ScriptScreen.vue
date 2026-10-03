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
.script-screen { display: grid; grid-template-columns: 300px minmax(0, 1fr); }
.script-screen > .sidebar { border-right: 1px solid var(--border); }
@media (max-width: 1000px) {
  .script-screen { grid-template-columns: 1fr; }
  .script-screen > .sidebar { border-right: 0; border-top: 1px solid var(--border); }
}
</style>
