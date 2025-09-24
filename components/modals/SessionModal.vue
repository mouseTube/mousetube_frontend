<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { debounce } from 'lodash';
import { useRecordingSessionStore, type RecordingSession } from '@/stores/recordingSession';
import type { DataTableSortItem } from 'vuetify';

// Props
const props = defineProps<{ modelValue: boolean }>();

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'selected', session: RecordingSession): void;
}>();

// Store
const store = useRecordingSessionStore();

// Search & pagination
const search = ref('');
const page = ref(1);
const filterMultiple = ref<'all' | 'single' | 'multiple'>('all');

// Sort
const sortBy = ref<DataTableSortItem[]>([{ key: 'name', order: 'asc' }]);

// Duplicate dialog
interface DuplicateForm {
  name: string;
  date: string | null;
  is_multiple: boolean;
}
const showDuplicateDialog = ref(false);
const duplicateForm = ref<DuplicateForm>({ name: '', date: null, is_multiple: false });
let sessionToDuplicate: RecordingSession | null = null;

// Date/Time menu
const dateMenu = ref(false);
const date = ref<Date | null>(null);
const time = ref<string | null>(null);
const formattedDate = ref('');

// Delete dialog
const showDeleteDialog = ref(false);
let sessionToDelete: RecordingSession | null = null;

// Snackbar
const snackbar = ref({ show: false, text: '', color: 'success' });

// Computed
const loading = computed(() => store.loadingSessions);
const sessions = computed(() => store.sessions);
const totalPages = computed(() => store.totalPages || 1);

// Headers
const headers = [
  { title: 'Session Name', key: 'name', sortable: true },
  { title: 'Protocol', key: 'protocol', sortable: true },
  { title: 'Laboratory', key: 'laboratory', sortable: true },
  { title: 'Recording Date', key: 'date', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Studies', key: 'studies', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false },
];

// Mapping pour tri backend
const fieldMap: Record<string, string> = {
  name: 'name',
  protocol: 'protocol__name',
  laboratory: 'laboratory__name',
  date: 'date',
  status: 'status',
};

// Utils
function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

// Fetch
const debouncedFetch = debounce((pg: number) => fetchData(pg), 300);
async function fetchData(pg: number) {
  let isMultiple: boolean | null = null;
  if (filterMultiple.value === 'single') isMultiple = false;
  if (filterMultiple.value === 'multiple') isMultiple = true;

  let ordering = '';
  if (sortBy.value.length > 0) {
    const s = sortBy.value[0];
    const field = fieldMap[s.key];
    if (field) ordering = s.order === 'desc' ? `-${field}` : field;
  }

  await store.fetchSessionsPage(pg, search.value, isMultiple, ordering);
  page.value = pg;
}

// Sort
function onSortUpdate(newSort: DataTableSortItem[]) {
  sortBy.value = newSort;
  fetchData(1);
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
      sortBy.value = [{ key: 'name', order: 'asc' }];
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

// Duplicate
function openDuplicateDialog(session: RecordingSession) {
  sessionToDuplicate = session;
  duplicateForm.value.name = `${session.name} Copy`;
  duplicateForm.value.is_multiple = session.is_multiple; // repris de l'original
  duplicateForm.value.date = session.date || null;

  if (duplicateForm.value.date) {
    const d = new Date(duplicateForm.value.date);
    date.value = d;
    time.value = d.toTimeString().slice(0, 5);
    formattedDate.value = `${d.toISOString().slice(0, 10)} ${time.value}`;
  } else {
    date.value = null;
    time.value = null;
    formattedDate.value = '';
  }

  showDuplicateDialog.value = true;
}

function updateDate(newDate: Date | null) {
  date.value = newDate;
  mergeDateTime();
}

function updateTime(newTime: string) {
  time.value = newTime;
  mergeDateTime();
}

function mergeDateTime() {
  if (!date.value) {
    duplicateForm.value.date = null;
    formattedDate.value = '';
    return;
  }
  const dateStr = date.value.toISOString().slice(0, 10);
  const timeStr = time.value || '00:00';
  duplicateForm.value.date = new Date(`${dateStr}T${timeStr}`).toISOString();
  formattedDate.value = `${dateStr} ${timeStr}`;
}

async function confirmDuplicate() {
  if (!duplicateForm.value.name) {
    snackbar.value = { show: true, text: 'Please enter a session name.', color: 'error' };
    return;
  }
  if (!duplicateForm.value.is_multiple && !duplicateForm.value.date) {
    snackbar.value = { show: true, text: 'Please enter recording date and time.', color: 'error' };
    return;
  }
  if (!sessionToDuplicate) return;

  try {
    await store.duplicateSession(
      sessionToDuplicate,
      duplicateForm.value.name,
      duplicateForm.value.date
    );
    snackbar.value = {
      show: true,
      text: 'Recording session successfully duplicated!',
      color: 'success',
    };
    showDuplicateDialog.value = false;
    fetchData(page.value);
  } catch {
    snackbar.value = { show: true, text: 'An error occurred while duplicating.', color: 'error' };
  }
}

// Delete
function openDeleteDialog(session: RecordingSession) {
  if (session.status === 'published') return;
  sessionToDelete = session;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (!sessionToDelete) return;
  try {
    await store.deleteSession(sessionToDelete.id);
    snackbar.value = {
      show: true,
      text: 'Recording session successfully deleted!',
      color: 'success',
    };
    showDeleteDialog.value = false;
    fetchData(page.value);
  } catch {
    snackbar.value = { show: true, text: 'An error occurred while deleting.', color: 'error' };
  }
}

// Mounted
onMounted(() => {
  if (props.modelValue) fetchData(page.value);
});
</script>

<template>
  <!-- Main Dialog -->
  <v-dialog :model-value="modelValue" max-width="1200px" @click:outside="close">
    <v-card class="pa-3" min-height="850px" overflow-y="auto">
      <v-card-title class="d-flex align-center justify-space-between gap-4">
        <span class="text-h6 font-weight-bold">Recording Sessions</span>
        <div class="d-flex align-center gap-3 flex-wrap">
          <v-text-field
            v-model="search"
            placeholder="Search recording session"
            clearable
            append-inner-icon="mdi-magnify"
            density="comfortable"
            hide-details
            class="search-field"
          />
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
        <v-data-table
          :headers="headers"
          :items="sessions"
          :loading="loading"
          dense
          item-key="id"
          hover
          hide-default-footer
          :sort-by.sync="sortBy"
          @update:sort-by="onSortUpdate"
          @click:row="
            (event: MouseEvent, { item }: { item: RecordingSession }) => selectSession(item)
          "
        >
          <template #item.protocol="{ item }">{{ item.protocol?.name || '—' }}</template>
          <template #item.laboratory="{ item }">{{ item.laboratory?.name || '—' }}</template>
          <template #item.date="{ item }">{{ formatDate(item.date) }}</template>
          <template #item.status="{ item }">
            <v-chip :color="item.status === 'published' ? 'green' : 'grey'" dark small>
              {{ item.status }}
            </v-chip>
          </template>
          <template #item.studies="{ item }">
            <span v-if="item.studies?.length">{{
              item.studies.map((s: { name: string }) => s.name).join(', ')
            }}</span>
            <span v-else>—</span>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex gap-2">
              <v-tooltip top>
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-content-copy"
                    size="small"
                    color="primary"
                    variant="text"
                    @click.stop="openDuplicateDialog(item)"
                  />
                </template>
                <span>Duplicate (status will always be draft)</span>
              </v-tooltip>

              <v-tooltip top>
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-delete"
                    size="small"
                    color="error"
                    variant="text"
                    :class="{ 'disabled-btn': item.status === 'published' }"
                    @click.stop="item.status !== 'published' && openDeleteDialog(item)"
                  />
                </template>
                <span v-if="item.status === 'published'">Cannot delete published session</span>
                <span v-else>Delete</span>
              </v-tooltip>
            </div>
          </template>
        </v-data-table>

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
        <v-btn text @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Duplicate Modal -->
  <v-dialog v-model="showDuplicateDialog" max-width="600px">
    <v-card>
      <v-card-title>Duplicate Recording Session</v-card-title>

      <v-card-text>
        <v-form>
          <v-text-field v-model="duplicateForm.name" label="New Session Name" outlined required />

          <v-menu
            v-if="!duplicateForm.is_multiple"
            v-model="dateMenu"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
          >
            <template #activator="{ props }">
              <v-text-field v-model="formattedDate" readonly outlined class="mb-4">
                <template #label>Recording Date</template>
              </v-text-field>
            </template>
            <v-card>
              <v-row no-gutters>
                <v-col cols="6">
                  <v-date-picker
                    v-model="date"
                    @update:modelValue="updateDate"
                    show-adjacent-months
                  />
                </v-col>
                <v-col cols="6">
                  <v-time-picker
                    v-model="time"
                    @update:model-value="(val: string | null) => updateTime(val || '')"
                    format="24hr"
                  />
                </v-col>
              </v-row>
            </v-card>
          </v-menu>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="showDuplicateDialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="confirmDuplicate">Duplicate</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete Modal -->
  <v-dialog v-model="showDeleteDialog" max-width="400px">
    <v-card>
      <v-card-title>Delete Recording Session</v-card-title>
      <v-card-text>
        Are you sure you want to delete this recording session? This action cannot be undone.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="showDeleteDialog = false">Cancel</v-btn>
        <v-btn color="error" @click="confirmDelete">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Snackbar -->
  <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
    {{ snackbar.text }}
  </v-snackbar>
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

.disabled-btn {
  opacity: 0.5;
  pointer-events: auto !important;
}
</style>
