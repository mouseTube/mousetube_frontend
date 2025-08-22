<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { debounce } from 'lodash';
import { useRecordingSessionStore, type RecordingSession } from '@/stores/recordingSession';

// Props: controls dialog open/close
const props = defineProps<{ modelValue: boolean }>();

// Emits: send selected session object + close modal
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'selected', session: RecordingSession): void;
}>();

// Store
const store = useRecordingSessionStore();

// Search & pagination
const search = ref('');
const page = ref(1);
const filterMultiple = ref<'all' | 'single' | 'multiple'>('all'); // 🔹 Nouveau filtre

// Computed store state
const loading = computed(() => store.loadingSessions);
const sessions = computed(() => store.sessions);
const totalPages = computed(() => store.totalPages || 1);

// Table headers
const headers = [
  { text: 'Session Name', value: 'name' },
  { text: 'Protocol', value: 'protocol' },
  { text: 'Laboratory', value: 'laboratory' },
  { text: 'Date', value: 'date' },
  { text: 'Status', value: 'status' },
  { text: 'Studies', value: 'studies' },
];

// Format date
function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

// 🔹 Fonction de fetch avec filtre
const debouncedFetch = debounce((pg: number) => {
  fetchData(pg);
}, 300);

async function fetchData(pg: number) {
  let isMultiple: boolean | null = null;
  if (filterMultiple.value === 'single') isMultiple = false;
  if (filterMultiple.value === 'multiple') isMultiple = true;

  await store.fetchSessionsPage(pg, search.value, isMultiple);
  page.value = pg;
}

// Watchers
watch(search, () => debouncedFetch(1));
watch(page, (val) => fetchData(val));
watch(filterMultiple, () => fetchData(1));
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      page.value = 1;
      search.value = '';
      filterMultiple.value = 'all';
      fetchData(1);
    }
  }
);

// Selection
function selectSession(session: RecordingSession) {
  emit('selected', session);
  emit('update:modelValue', false);
}
function close() {
  emit('update:modelValue', false);
}

// Fetch on mounted if already open
onMounted(() => {
  if (props.modelValue) fetchData(page.value);
});
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="1200px" @click:outside="close">
    <v-card class="pa-3">
      <v-card-title class="d-flex align-center justify-space-between gap-4">
        <!-- Titre -->
        <span class="text-h6 font-weight-bold">Select a Recording Session</span>

        <div class="d-flex align-center gap-3 flex-wrap">
          <!-- Barre de recherche -->
          <v-text-field
            v-model="search"
            placeholder="Search recording session"
            clearable
            append-inner-icon="mdi-magnify"
            density="comfortable"
            hide-details
            class="search-field"
          />

          <!-- 🔹 Filtre Single / Multiple / All -->
          <v-btn-toggle
            v-model="filterMultiple"
            mandatory
            density="comfortable"
            divided
            color="primary"
            variant="outlined"
            class="rounded-lg ml-3"
          >
            <v-btn value="all" size="small">All</v-btn>
            <v-btn value="single" size="small">Single</v-btn>
            <v-btn value="multiple" size="small">Multiple</v-btn>
          </v-btn-toggle>
        </div>
      </v-card-title>

      <v-card-text>
        <!-- Sessions table -->
        <v-data-table
          :headers="headers"
          :items="sessions"
          :loading="loading"
          class="elevation-1"
          dense
          item-key="id"
          @click:row="
            (event: MouseEvent, item: { item: RecordingSession }) => selectSession(item.item)
          "
          hide-default-footer
        >
          <template #item.protocol="{ item }">{{ item.protocol?.name || '—' }}</template>
          <template #item.laboratory="{ item }">{{ item.laboratory?.name || '—' }}</template>
          <template #item.date="{ item }">{{ formatDate(item.date) }}</template>
          <template #item.status="{ item }">
            <v-chip :color="item.status === 'published' ? 'green' : 'grey'" dark small class="ma-0">
              {{ item.status }}
            </v-chip>
          </template>
          <template #item.studies="{ item }">
            <span v-if="item.studies?.length">{{
              item.studies.map((s) => s.name).join(', ')
            }}</span>
            <span v-else>—</span>
          </template>
        </v-data-table>

        <!-- Pagination -->
        <v-pagination
          v-model="page"
          :length="totalPages"
          :total-visible="7"
          class="mt-4"
          color="primary"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
::v-deep(.v-data-table__tr.v-data-table__tr--clickable:hover) {
  background-color: #f5f5f5 !important;
  cursor: pointer !important;
  transform: scale(1.01) !important;
}
.search-field {
  min-width: 350px;
  max-width: 450px;
}
</style>
