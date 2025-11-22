<!-- src/components/CustomSquare.vue -->
<script setup>
import { defineProps } from 'vue';
const props = defineProps({ size: { type: [Number, String], default: 16 }, fill: { type: String, default: '#000' } });
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" :fill="fill" rx="2" />
  </svg>
</template>