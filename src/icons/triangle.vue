<!-- src/components/CustomTriangle.vue -->
<script setup>
import { defineProps } from 'vue';
const props = defineProps({ size: { type: [Number, String], default: 16 }, fill: { type: String, default: '#000' } });
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24">
    <polygon points="12 2, 22 22, 2 22" :fill="fill" />
  </svg>
</template>