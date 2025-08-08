<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { debounce } from 'lodash';
import { useRecordingSessionStore, type RecordingSession } from '@/stores/recordingSession';

// Props: controls dialog open/close
const props = defineProps<{
  modelValue: boolean;
}>();

// Emits: send selected session object + close modal
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'selected', session: RecordingSession): void; // ✅ Send full object, not just ID
}>();

// Store for fetching sessions
const store = useRecordingSessionStore();

// Search & pagination state
const search = ref('');
const page = ref(1);
const pageSize = 10; // not used directly, backend handles it

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

/**
 * Format date for display
 */
function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

/**
 * Fetch data from API with debounce
 */
const debouncedFetch = debounce((val: string, pg: number) => {
  fetchData(pg, val);
}, 300);

/**
 * Fetch sessions from store depending on search query
 */
async function fetchData(pg: number, searchQuery: string) {
  if (searchQuery.trim() !== '') {
    await store.searchRecordingSessions(searchQuery.trim());
  } else {
    await store.fetchSessionsPage(pg);
  }
  page.value = pg;
}

// React when search input changes
watch(search, (val) => {
  debouncedFetch(val, 1);
});

// React when page changes
watch(page, (val) => {
  fetchData(val, search.value);
});

// When modal opens, reset and fetch first page
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      page.value = 1;
      search.value = '';
      fetchData(1, '');
    }
  }
);

/**
 * When a session is selected from the table
 */
function selectSession(session: RecordingSession) {
  emit('selected', session); // ✅ Send full object
  emit('update:modelValue', false); // Close modal
}

/**
 * Close modal without selecting
 */
function close() {
  emit('update:modelValue', false);
}

// Fetch when mounted if modal already open
onMounted(() => {
  if (props.modelValue) {
    fetchData(page.value, search.value);
  }
});
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="1200px" @click:outside="close">
    <v-card>
      <v-card-title>
        Select a Session
        <v-spacer />
      </v-card-title>

      <v-card-text>
        <!-- Search input -->
        <v-text-field
          v-model="search"
          label="Search session"
          clearable
          append-inner-icon="mdi-magnify"
          class="mb-4"
        />

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
          <!-- Custom headers -->
          <template #header.name>
            <span>Session Name</span>
          </template>

          <template #header.protocol>
            <span>Protocol</span>
          </template>

          <template #header.laboratory>
            <span>Laboratory</span>
          </template>

          <template #header.date>
            <span>Date</span>
          </template>

          <template #header.status>
            <span>Status</span>
          </template>

          <template #header.studies>
            <span>Studies</span>
          </template>

          <!-- Custom column renderers -->
          <template #item.protocol="{ item }">
            {{ item.protocol?.name || '—' }}
          </template>

          <template #item.laboratory="{ item }">
            {{ item.laboratory?.name || '—' }}
          </template>

          <template #item.date="{ item }">
            {{ formatDate(item.date) }}
          </template>

          <template #item.status="{ item }">
            <v-chip :color="item.status === 'published' ? 'green' : 'grey'" dark small class="ma-0">
              {{ item.status }}
            </v-chip>
          </template>

          <template #item.studies="{ item }">
            <span v-if="item.studies?.length">
              {{ item.studies.map((s) => s.name).join(', ') }}
            </span>
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
