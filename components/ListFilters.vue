<script setup lang="ts">
// The filters of a list page, in a drawer: a switch per yes/no criterion and one group of chips
// per multiple-choice criterion. The page says which ones exist; the values are in `filters`.
export interface FilterGroup {
  key: string; // name of the query parameter, and of the array in `filters`
  title: string;
  icon: string;
  options: string[];
  labels?: Record<string, string>; // what to show instead of the raw value
}
export interface FilterToggle {
  key: string;
  label: string; // in the drawer
  chip?: string; // under the search bar when the switch is not in its default position
  default: boolean;
}

const filters = defineModel<Record<string, any>>({ required: true });
defineProps<{
  groups: FilterGroup[];
  toggles?: FilterToggle[];
  total: number;
  noun: string;
}>();
defineEmits<{ (e: 'reset' | 'close'): void }>();

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
</script>

<template>
  <div class="filters">
    <div class="filters-head">
      <h3>Filters</h3>
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        aria-label="Close"
        @click="$emit('close')"
      />
    </div>

    <v-switch
      v-for="toggle in toggles"
      :key="toggle.key"
      v-model="filters[toggle.key]"
      color="primary"
      density="compact"
      hide-details
      :label="toggle.label"
    />

    <template v-for="group in groups" :key="group.key">
      <section v-if="group.options.length" class="filter-group">
        <h4>
          <v-icon size="16">{{ group.icon }}</v-icon
          >{{ group.title }}
        </h4>
        <v-chip-group v-model="filters[group.key]" multiple column>
          <v-chip
            v-for="value in group.options"
            :key="value"
            :value="value"
            filter
            variant="outlined"
            size="small"
          >
            {{ group.labels?.[value] ?? capitalize(value) }}
            <span v-if="group.labels?.[value]" class="text-caption text-medium-emphasis ms-1">{{
              value
            }}</span>
          </v-chip>
        </v-chip-group>
      </section>
    </template>

    <div class="filters-foot">
      <span class="text-body-2 text-medium-emphasis">{{ total }} {{ noun }}</span>
      <v-btn variant="text" size="small" @click="$emit('reset')">Reset</v-btn>
    </div>
  </div>
</template>

<style scoped>
.filters {
  padding: 20px;
}
.filters-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.filters-head h3 {
  font-weight: 800;
  font-size: 1.15rem;
}
.filter-group {
  margin-top: 18px;
}
.filter-group h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #555;
}
.filters-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 12px;
  border-top: 1px solid #e4e4e4;
}
</style>
