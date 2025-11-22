<!-- src/components/CustomCircle.vue -->
<script setup>
import { defineProps } from 'vue';
const props = defineProps({ size: { type: [Number, String], default: 16 }, fill: { type: String, default: '#000' } });
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" :fill="fill" />
  </svg>
</template>