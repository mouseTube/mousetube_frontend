<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { debounce } from 'lodash';
import { useProtocolStore, type Protocol } from '@/stores/protocol';
import type { DataTableSortItem } from 'vuetify';
import { useAuth } from '@/composables/useAuth';

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

// ----------------------
// Headers
// ----------------------
const headers = [
  { title: 'Protocol Name', key: 'name', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Animals', key: 'animals', sortable: false },
  { title: 'Duration', key: 'duration', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false },
];

// ----------------------
// Mapping pour tri backend
// ----------------------
const fieldMap: Record<string, string> = {
  name: 'name',
  description: 'description',
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
    await store.fetchProtocolsPage(pg, search.value, ordering);
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
  emit('update:modelValue', false);
}

// ----------------------
// Duplicate
// ----------------------
const duplicateDialog = ref(false);
const duplicateName = ref('');
const protocolToDuplicate = ref<Protocol | null>(null);

function openDuplicateDialog(protocol: Protocol) {
  protocolToDuplicate.value = protocol;
  duplicateName.value = protocol.name + ' copy';
  duplicateDialog.value = true;
}

async function confirmDuplicate() {
  if (!protocolToDuplicate.value) return;

  try {
    await store.duplicateProtocol(protocolToDuplicate.value.id, duplicateName.value);
    duplicateDialog.value = false;
    showSuccess(`Protocol "${duplicateName.value}" duplicated successfully`);
  } catch (err: any) {
    console.error('Duplication failed:', err);
    showError(err.message || 'Duplication failed');
  }
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
    if (selectedProtocolId.value === protocolToDelete.value.id) {
      selectedProtocolId.value = null;
    }
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
  <v-dialog :model-value="props.modelValue" max-width="1200px" @click:outside="close">
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
          <template #item="{ item }">
            <tr
              :class="{ 'protocol-selected': selectedProtocolId === item.id }"
              @click="selectProtocol(item)"
            >
              <td>{{ item.name }}</td>
              <td>
                <v-tooltip location="top">
                  <template #activator="{ props: tooltipProps }">
                    <span v-bind="tooltipProps">
                      {{
                        item.description?.length > 50
                          ? item.description.slice(0, 50) + '…'
                          : item.description || '—'
                      }}
                    </span>
                  </template>
                  <span>{{ item.description }}</span>
                </v-tooltip>
              </td>
              <td>
                <span v-if="item.animals?.species">
                  {{ item.animals.species }} ({{ item.animals.sex || '—' }},
                  {{ item.animals.age || '—' }})
                </span>
                <span v-else>—</span>
              </td>
              <td>{{ item.context?.duration || '—' }}</td>
              <td>
                <div class="d-flex gap-2">
                  <v-btn
                    icon="mdi-content-copy"
                    variant="text"
                    color="primary"
                    @click.stop="openDuplicateDialog(item)"
                  />
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

  <!-- Duplicate Dialog -->
  <v-dialog v-model="duplicateDialog" max-width="400px">
    <v-card>
      <v-card-title>Duplicate Protocol</v-card-title>
      <v-card-text>
        <v-text-field v-model="duplicateName" label="New name" clearable />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="duplicateDialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="confirmDuplicate">Duplicate</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete Confirmation Dialog -->
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

  <!-- Success Snackbar -->
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

.protocol-selected {
  background-color: #e0f7fa;
}
</style>
