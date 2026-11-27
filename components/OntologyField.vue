<script setup>
// A field with a controlled vocabulary: type to search the terms, pick one, and the term
// (identifier + label) is stored next to the free text. Searching is done by the API, which
// asks the vocabulary service (EBI OLS, or the ROR registry for organizations).
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

const props = defineProps({
  // which vocabulary: species, strain, sex, age, treatment, diet, behavior, organization
  field: { type: String, required: true },
  modelValue: { type: [Object, Array], default: null }, // a term, or a list when `multiple`
  label: { type: String, required: true },
  multiple: { type: Boolean, default: false },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  // narrow the search to one vocabulary of the field (e.g. 'rs' for the strains of a rat)
  ontology: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue']);

const { token } = useAuth();
const apiBaseUrl = useApiBaseUrl();

const query = ref('');
const found = ref([]);
const loading = ref(false);
const message = ref('');
const vocabulary = ref('');
let timer = null;

// the selected terms are always part of the options, so Vuetify can show them
const items = computed(() => {
  const picked = props.multiple
    ? props.modelValue || []
    : props.modelValue
      ? [props.modelValue]
      : [];
  const known = new Set(picked.map((t) => t.curie));
  return [...picked, ...found.value.filter((t) => !known.has(t.curie))];
});

// The vocabulary service is often slow (several seconds, sometimes twenty): a search still running
// when the user types again is cancelled, so that its late answer never replaces the newer one.
const SLOW_AFTER = 3000;
let running = null; // the AbortController of the search in progress
let slowTimer = null;

const search = async (text) => {
  running?.abort();
  clearTimeout(slowTimer);
  message.value = '';
  if (!text || text.trim().length < 2) {
    running = null;
    loading.value = false;
    found.value = [];
    return;
  }
  const mine = new AbortController();
  running = mine;
  loading.value = true;
  slowTimer = setTimeout(() => {
    message.value = 'The vocabulary service is slow, still searching…';
  }, SLOW_AFTER);
  try {
    const res = await axios.get(`${apiBaseUrl}/ontology/search/`, {
      params: {
        field: props.field,
        q: text.trim(),
        ...(props.ontology && { ontology: props.ontology }),
      },
      headers: { Authorization: `Bearer ${token.value}` },
      signal: mine.signal,
    });
    found.value = res.data.results || [];
    vocabulary.value = res.data.vocabulary || '';
    message.value = found.value.length ? '' : 'No matching term.';
  } catch (e) {
    if (axios.isCancel(e)) return; // a newer search took over
    found.value = [];
    message.value =
      e?.response?.status === 502
        ? 'The vocabulary service is not answering. Try again in a moment.'
        : 'The search failed. Try again.';
  } finally {
    if (running === mine) {
      running = null;
      clearTimeout(slowTimer);
      loading.value = false;
    }
  }
};

watch(query, (text) => {
  clearTimeout(timer);
  timer = setTimeout(() => search(text), 300); // wait for the typing to pause
});

const update = (value) => emit('update:modelValue', value ?? (props.multiple ? [] : null));
</script>

<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="items"
    :loading="loading"
    :label="label"
    :disabled="disabled"
    :multiple="multiple"
    :chips="multiple"
    :closable-chips="multiple"
    :hint="message || hint || (vocabulary ? `Terms of ${vocabulary}` : '')"
    :persistent-hint="!!(message || hint)"
    item-title="label"
    item-value="curie"
    return-object
    clearable
    no-filter
    hide-no-data
    variant="outlined"
    density="comfortable"
    autocomplete="off"
    prepend-inner-icon="mdi-book-search-outline"
    @update:model-value="update"
    @update:search="(text) => (query = text || '')"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps" :title="item.raw.label">
        <template #subtitle>
          {{ item.raw.curie }}<template v-if="item.raw.detail"> · {{ item.raw.detail }}</template>
        </template>
      </v-list-item>
    </template>
    <template #chip="{ props: chipProps, item }">
      <v-chip v-bind="chipProps" size="small" label :text="item.raw.label" />
    </template>
    <template #selection="{ item }">
      <span>{{ item.raw.label }}</span>
      <span class="text-caption text-medium-emphasis ms-2">{{ item.raw.curie }}</span>
    </template>
  </v-autocomplete>
</template>
