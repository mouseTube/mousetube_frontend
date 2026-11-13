<script setup lang="ts">
// The top of a list of the account page: title and "add" button, one line saying what the list is
// for, and a row for its search, filters and sort (the default slot).
defineProps<{ title: string; lead: string; addLabel: string; addTo?: string }>();
defineEmits<{ (e: 'add'): void }>();
</script>

<template>
  <div class="list-header">
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-2">
      <h2 class="list-title">{{ title }}</h2>
      <v-btn
        variant="outlined"
        size="small"
        prepend-icon="mdi-plus"
        :to="addTo"
        @click="!addTo && $emit('add')"
      >
        {{ addLabel }}
      </v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">{{ lead }}</p>
    <div class="d-flex align-center flex-wrap ga-3 mb-2">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.list-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}
</style>
