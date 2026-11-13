<script setup lang="ts">
// The two sort buttons of a list: by last edited and by name. The active one is red; clicking it
// reverses it, clicking the other one switches to it (name starts A to Z, last edited starts with
// the most recent).
export interface Sort {
  key: 'date' | 'name';
  dir: 'asc' | 'desc';
}
const sort = defineModel<Sort>({ required: true });

const KEYS = ['date', 'name'] as const;
const LABEL = { date: 'most recent', name: 'name' } as const;

function choose(key: Sort['key']) {
  sort.value =
    sort.value.key === key
      ? { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'name' ? 'asc' : 'desc' };
}
// the icon shows the direction the button would give (its own when it is not the active one)
const dirOf = (key: Sort['key']) =>
  sort.value.key === key ? sort.value.dir : key === 'name' ? 'asc' : 'desc';
const icon = (key: Sort['key']) =>
  `mdi-sort-${key === 'name' ? 'alphabetical' : 'calendar'}-${dirOf(key) === 'asc' ? 'ascending' : 'descending'}`;
const title = (key: Sort['key']) =>
  `Sort by ${LABEL[key]}${sort.value.key === key ? ': click to reverse' : ''}`;
</script>

<template>
  <div class="d-flex ga-2">
    <v-btn
      v-for="key in KEYS"
      :key="key"
      :color="sort.key === key ? 'primary' : undefined"
      :variant="sort.key === key ? 'flat' : 'tonal'"
      :icon="icon(key)"
      :title="title(key)"
      :aria-label="title(key)"
      @click="choose(key)"
    />
  </div>
</template>
