<!-- One icon from IconSprite. Extra classes (e.g. "to", "play-icon") go on the <svg>. -->
<script setup>
defineProps({ name: { type: String, required: true } });
</script>

<template>
  <svg class="i" aria-hidden="true"><use :href="`#i-${name}`" /></svg>
</template>
