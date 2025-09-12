<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { debounce } from 'lodash';
import { useProtocolStore, type Protocol } from '@/stores/protocol';
import type { DataTableSortItem } from 'vuetify';
import { useAuth } from '@/composables/useAuth';
import { useFavoriteStore } from '@/stores/favorite';

// ----------------------
// Props & Emits
// ----------------------
const props = defineProps<{ modelValue: boolean; selectedProtocolId?: number }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'select', protocol: Protocol): void;
}>();

// ----------------------
// Auth
// ----------------------
const { id_user } = useAuth();

// ----------------------
// Store & State
// ----------------------
const store = useProtocolStore();
const search = ref('');
const page = ref(1);
const sortBy = ref<DataTableSortItem[]>([{ key: 'name', order: 'asc' }]);
const selectedProtocolId = ref<number | null>(props.selectedProtocolId ?? null);
const favoriteStore = useFavoriteStore();

// ----------------------
// Filters
// ----------------------
const filters = ref({
  animals_sex: null as string | null,
  animals_age: null as string | null,
  animals_housing: null as string | null,
  context_duration: null as string | null,
  context_cage: null as string | null,
  context_bedding: null as string | null,
  context_light_cycle: null as string | null,
  status: null as string | null,
});

const options = {
  animals_sex: ['male(s)', 'female(s)', 'male(s) & female(s)'],
  animals_age: ['pup', 'juvenile', 'adult'],
  animals_housing: ['grouped', 'isolated', 'grouped & isolated'],
  context_duration: ['short term (<1h)', 'mid term (<1day)', 'long term (>=1day)'],
  context_cage: ['unfamiliar test cage', 'familiar test cage', 'home cage'],
  context_bedding: ['bedding', 'no bedding'],
  context_light_cycle: ['day', 'night'],
  status: ['draft', 'waiting validation', 'validated'],
};

// ----------------------
// Headers
// ----------------------
const headers = [
  { title: 'Protocol Name', key: 'name', sortable: true },
  { title: 'Sex', key: 'animals_sex', sortable: false },
  { title: 'Age', key: 'animals_age', sortable: false },
  { title: 'Housing', key: 'animals_housing', sortable: false },
  { title: 'Duration', key: 'context_duration', sortable: false },
  { title: 'Cage', key: 'context_cage', sortable: false },
  { title: 'Bedding', key: 'context_bedding', sortable: false },
  { title: 'Light Cycle', key: 'context_light_cycle', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false },
];

const fieldMap: Record<string, string> = {
  name: 'name',
};

// ----------------------
// Computed
// ----------------------
const loading = computed(() => store.loading);
const protocols = computed(() => store.protocols?.results || []);
const totalPages = computed(() => store.totalPages || 1);

// ----------------------
// Fetch
// ----------------------
const debouncedFetch = debounce((pg: number) => fetchData(pg), 300);
async function fetchData(pg: number) {
  let ordering = '';
  if (sortBy.value.length > 0) {
    const s = sortBy.value[0];
    const field = fieldMap[s.key];
    if (field) ordering = s.order === 'desc' ? `-${field}` : field;
  }

  try {
    await store.fetchProtocolsPage(pg, search.value, ordering, filters.value);
  } catch (err: any) {
    showError(err.message || 'Failed to fetch protocols');
  }
  page.value = pg;
}

// ----------------------
// Sort
// ----------------------
function onSortUpdate(newSort: DataTableSortItem[]) {
  sortBy.value = newSort;
  fetchData(1);
}

// ----------------------
// Selection
// ----------------------
function selectProtocol(protocol: Protocol) {
  selectedProtocolId.value = protocol.id;
  emit('select', protocol);
  // emit('update:modelValue', false);
}

// ----------------------
// Delete
// ----------------------
const deleteDialog = ref(false);
const protocolToDelete = ref<Protocol | null>(null);

function openDeleteDialog(protocol: Protocol) {
  protocolToDelete.value = protocol;
  deleteDialog.value = true;
}

async function confirmDelete() {
  if (!protocolToDelete.value) return;

  try {
    await store.deleteProtocol(protocolToDelete.value.id);
    deleteDialog.value = false;
    if (selectedProtocolId.value === protocolToDelete.value.id) selectedProtocolId.value = null;
    showSuccess(`Protocol "${protocolToDelete.value.name}" deleted successfully`);
    protocolToDelete.value = null;
  } catch (err: any) {
    console.error('Failed to delete protocol:', err);
    showError(err.message || 'Failed to delete protocol');
  }
}

// ----------------------
// Snackbars
// ----------------------
const snackbarSuccess = ref(false);
const successMessage = ref('');
const snackbarError = ref(false);
const errorMessage = ref('');

function showSuccess(msg: string) {
  successMessage.value = msg;
  snackbarSuccess.value = true;
}

function showError(msg: string) {
  errorMessage.value = msg;
  snackbarError.value = true;
}

// ----------------------
// Watchers
// ----------------------
watch(search, () => debouncedFetch(1));
watch(page, (val) => fetchData(val));
watch(filters, () => fetchData(1), { deep: true });
watch(
  () => props.modelValue,
  (val) => {
    if (val) fetchData(1);
  }
);

function close() {
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog :model-value="props.modelValue" max-width="1700px" @click:outside="close">
    <v-card class="pa-3">
      <v-card-title class="d-flex align-center justify-space-between gap-4">
        <span class="text-h6 font-weight-bold">Protocols</span>
        <v-text-field
          v-model="search"
          placeholder="Search protocol"
          clearable
          append-inner-icon="mdi-magnify"
          density="comfortable"
          hide-details
          class="search-field"
        />
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="protocols"
          :loading="loading"
          dense
          hover
          hide-default-footer
          item-key="id"
          :sort-by.sync="sortBy"
          @update:sort-by="onSortUpdate"
        >
          <!-- Custom item slot with <tr> for selection -->
          <template #item="{ item }">
            <tr
              :class="{ 'protocol-selected': selectedProtocolId === item.id }"
              @click="selectProtocol(item)"
            >
              <!-- Name with tooltip -->
              <td>
                <div class="d-flex align-center gap-2">
                  <!-- Star icon -->
                  <v-icon
                    :color="
                      favoriteStore.isFavorite('protocol', item.id) ? 'yellow darken-3' : 'grey'
                    "
                    @click.stop="favoriteStore.toggleFavorite('protocol', item.id)"
                    class="cursor-pointer"
                  >
                    {{
                      favoriteStore.isFavorite('protocol', item.id)
                        ? 'mdi-star'
                        : 'mdi-star-outline'
                    }}
                  </v-icon>

                  <!-- Name with tooltip -->
                  <v-tooltip location="top">
                    <template #activator="{ props: tooltipProps }">
                      <span v-bind="tooltipProps">{{ item.name }}</span>
                    </template>
                    <span>{{ item.description || '—' }}</span>
                  </v-tooltip>
                </div>
              </td>

              <!-- Animals -->
              <td>{{ item.animals?.sex || '—' }}</td>
              <td>{{ item.animals?.age || '—' }}</td>
              <td>{{ item.animals?.housing || '—' }}</td>

              <!-- Context -->
              <td>{{ item.context?.duration || '—' }}</td>
              <td>{{ item.context?.cage || '—' }}</td>
              <td>{{ item.context?.bedding || '—' }}</td>
              <td>{{ item.context?.light_cycle || '—' }}</td>

              <!-- Status -->
              <td>
                <v-chip
                  :color="
                    item.status === 'validated'
                      ? 'green'
                      : item.status === 'awaiting validation'
                        ? 'blue'
                        : 'grey'
                  "
                  dark
                  small
                >
                  {{ item.status || '—' }}
                </v-chip>
              </td>

              <!-- Actions -->
              <td>
                <div class="d-flex gap-2">
                  <v-btn
                    v-if="item.created_by === id_user"
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    @click.stop="openDeleteDialog(item)"
                  />
                </div>
              </td>
            </tr>
          </template>

          <!-- Header filters -->
          <template #header.animals_sex>
            <v-select
              v-model="filters.animals_sex"
              :items="options.animals_sex"
              dense
              hide-details
              outlined
              clearable
              label="Sex"
              class="header-select-1"
            />
          </template>

          <template #header.animals_age>
            <v-select
              v-model="filters.animals_age"
              :items="options.animals_age"
              dense
              hide-details
              outlined
              clearable
              label="Age"
              class="header-select-1"
            />
          </template>

          <template #header.animals_housing>
            <v-select
              v-model="filters.animals_housing"
              :items="options.animals_housing"
              dense
              hide-details
              outlined
              clearable
              label="Housing"
              class="header-select-2"
            />
          </template>

          <template #header.context_duration>
            <v-select
              v-model="filters.context_duration"
              :items="options.context_duration"
              dense
              hide-details
              outlined
              clearable
              label="Duration"
              class="header-select-2"
            />
          </template>

          <template #header.context_cage>
            <v-select
              v-model="filters.context_cage"
              :items="options.context_cage"
              dense
              hide-details
              outlined
              clearable
              label="Cage"
              class="header-select-2"
            />
          </template>

          <template #header.context_bedding>
            <v-select
              v-model="filters.context_bedding"
              :items="options.context_bedding"
              dense
              hide-details
              outlined
              clearable
              label="Bedding"
              class="header-select-2"
            />
          </template>

          <template #header.context_light_cycle>
            <v-select
              v-model="filters.context_light_cycle"
              :items="options.context_light_cycle"
              dense
              hide-details
              outlined
              clearable
              label="Light Cycle"
              class="header-select-2"
            />
          </template>

          <template #header.status>
            <v-select
              v-model="filters.status"
              :items="options.status"
              dense
              hide-details
              outlined
              clearable
              label="Status"
              class="header-select-2"
            />
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

  <!-- Delete Dialog -->
  <v-dialog v-model="deleteDialog" max-width="400px">
    <v-card>
      <v-card-title class="text-h6">Confirm Deletion</v-card-title>
      <v-card-text>
        Are you sure you want to delete
        <strong>{{ protocolToDelete?.name }}</strong> ?
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="deleteDialog = false">Cancel</v-btn>
        <v-btn color="error" @click="confirmDelete">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Snackbars -->
  <v-snackbar v-model="snackbarSuccess" color="green" timeout="3000">
    {{ successMessage }}
    <template #actions="{ isActive }">
      <v-btn text @click="snackbarSuccess = false">Close</v-btn>
    </template>
  </v-snackbar>

  <v-snackbar v-model="snackbarError" color="red" timeout="5000">
    {{ errorMessage }}
    <template #actions="{ isActive }">
      <v-btn text @click="snackbarError = false">Close</v-btn>
    </template>
  </v-snackbar>
</template>

<style scoped>
.search-field {
  min-width: 350px;
  max-width: 450px;
}

.cursor-pointer tr:hover {
  background-color: #e0f7fa;
}

.protocol-selected {
  background-color: #b2dfdb !important;
}
.v-data-table-header th {
  overflow: visible !important;
  height: auto;
  vertical-align: top;
}
.header-select-1 {
  min-width: 92px;
  margin-top: 4px;
  margin-bottom: 4px;
}
.header-select-2 {
  min-width: 127px;
  margin-top: 4px;
  margin-bottom: 4px;
}
</style>
