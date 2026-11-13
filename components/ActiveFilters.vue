<script setup lang="ts">
// The filters in use, as closable chips on one line (placed in the toolbar, right of the search,
// so that the page below does not move). Also tells the page how many there are.
import type { FilterGroup, FilterToggle } from '@/components/ListFilters.vue';

const filters = defineModel<Record<string, any>>({ required: true });
const props = defineProps<{ groups: FilterGroup[]; toggles?: FilterToggle[] }>();
defineEmits<{ (e: 'reset'): void }>();

const chosen = computed(() =>
  props.groups.flatMap((group) =>
    (filters.value[group.key] ?? []).map((value: string) => ({
      group: group.key,
      value,
      text: group.labels?.[value] ?? value.charAt(0).toUpperCase() + value.slice(1),
    }))
  )
);
// switches that are not in their default position
const changed = computed(() =>
  (props.toggles ?? []).filter((t) => filters.value[t.key] !== t.default)
);
const total = computed(() => chosen.value.length + changed.value.length);
defineExpose({ total });

const removeChosen = (item: { group: string; value: string }) => {
  filters.value[item.group] = filters.value[item.group].filter((v: string) => v !== item.value);
};
</script>

<template>
  <div class="active-filters">
    <v-chip
      v-for="item in chosen"
      :key="item.group + item.value"
      closable
      size="small"
      variant="tonal"
      color="primary"
      @click:close="removeChosen(item)"
    >
      {{ item.text }}
    </v-chip>
    <v-chip
      v-for="toggle in changed"
      :key="toggle.key"
      closable
      size="small"
      variant="tonal"
      color="primary"
      @click:close="filters[toggle.key] = toggle.default"
    >
      {{ toggle.chip ?? toggle.label }}
    </v-chip>
    <v-btn v-if="total" variant="text" size="x-small" @click="$emit('reset')">Clear all</v-btn>
  </div>
</template>

<style scoped>
.active-filters {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 0 12px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.active-filters > * {
  flex: 0 0 auto;
}
</style>
