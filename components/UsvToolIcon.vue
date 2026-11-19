<script setup lang="ts">
// The mark of a detector: its colour and its initials (the logos of the tools are theirs, not ours).
const props = defineProps<{ tool: string; label?: string; color?: string; size?: number }>();
const initials = () => {
  const words = (props.label ?? props.tool).split(/[\s_-]+/).filter(Boolean);
  return (
    words.length > 1 ? words.map((w) => w[0]).join('') : (props.label ?? props.tool).slice(0, 2)
  )
    .slice(0, 2)
    .toUpperCase();
};
</script>

<template>
  <span
    class="tool-icon"
    :style="{
      background: color ?? '#555',
      width: `${size ?? 32}px`,
      height: `${size ?? 32}px`,
      fontSize: `${Math.round((size ?? 32) * 0.38)}px`,
    }"
    aria-hidden="true"
    >{{ initials() }}</span
  >
</template>

<style scoped>
.tool-icon {
  display: inline-grid;
  place-items: center;
  flex: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.02em;
}
</style>
