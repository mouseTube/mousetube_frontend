<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useHardwareStore, type Hardware } from '@/stores/hardware';
import HardwareModal from '@/components/modals/HardwareModal.vue';

const props = defineProps<{
  modelValue: boolean;
  hardwareType: Hardware['type'];
  selectedHardwareIds: number[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:selectedHardwareIds', value: number[]): void;
}>();

const hardwareStore = useHardwareStore();

// UI state
const searchQuery = ref('');
const sortOrder = ref<'asc' | 'desc'>('asc');
const page = ref(1);
const itemsPerPage = 9;

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingHardwareId = ref<number | null>(null);

// Dialog confirmation delete
const showDeleteConfirm = ref(false);
const deleteTargetId = ref<number | null>(null);
const deleteTargetName = ref<string>(''); // <-- ajouté

const localDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const internalSelectedHardwareIds = computed({
  get: () => props.selectedHardwareIds,
  set: (value: number[]) => emit('update:selectedHardwareIds', value),
});

// Ouverture -> fetch data
watch(localDialog, async (val) => {
  if (val && !hardwareStore.hardwares.length) {
    await hardwareStore.fetchAllHardware();
    page.value = 1;
  }
});

// Filtrage
const filteredHardware = computed(() => {
  let items = hardwareStore.hardwares.filter((hw) => hw.type === props.hardwareType);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter((hw) => hw.name.toLowerCase().includes(q));
  }
  return items;
});

// Tri
const sortedHardware = computed(() => {
  const items = [...filteredHardware.value];
  return items.sort((a, b) => {
    let comparison = a.name.localeCompare(b.name);
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });
});

// Pagination
const paginatedHardware = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return sortedHardware.value.slice(start, start + itemsPerPage);
});

// Utils
function truncate(text: string, length = 100) {
  if (!text) return '—';
  return text.length > length ? text.slice(0, length) + '…' : text;
}

// Actions
function toggleSelection(id: number) {
  const newSelection = [...internalSelectedHardwareIds.value];
  const index = newSelection.indexOf(id);
  if (index === -1) newSelection.push(id);
  else newSelection.splice(index, 1);
  internalSelectedHardwareIds.value = newSelection;
}

function isSelected(id: number) {
  return internalSelectedHardwareIds.value.includes(id);
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
}

function openCreateModal() {
  editingHardwareId.value = null;
  showCreateModal.value = true;
}

function editHardware(hw: Hardware) {
  editingHardwareId.value = hw.id ?? null;
  showEditModal.value = true;
}

function askDeleteHardware(id: number) {
  const hw = hardwareStore.hardwares.find((h) => h.id === id);
  if (!hw) return;
  deleteTargetId.value = id;
  deleteTargetName.value = hw.name; // <-- on stocke le nom
  showDeleteConfirm.value = true;
}

async function confirmDeleteHardware() {
  if (deleteTargetId.value === null) return;
  await hardwareStore.deleteHardware(deleteTargetId.value);
  await hardwareStore.fetchAllHardware();
  const totalPages = Math.ceil(filteredHardware.value.length / itemsPerPage);
  if (page.value > totalPages) {
    page.value = totalPages > 0 ? totalPages : 1;
  }
  showDeleteConfirm.value = false;
  deleteTargetId.value = null;
  deleteTargetName.value = '';
}
</script>

<template>
  <v-dialog v-model="localDialog" max-width="900px">
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>Select {{ hardwareType }}s</span>
        <v-spacer />
        <v-text-field
          v-model="searchQuery"
          placeholder="Search hardware..."
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          class="ml-4"
          style="max-width: 300px"
        />
      </v-card-title>

      <v-card-text>
        <div class="d-flex align-center mb-4">
          <v-btn
            @click="toggleSortOrder"
            size="small"
            class="ml-2"
            :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
            :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
          />
        </div>

        <v-row v-if="paginatedHardware.length > 0" dense>
          <v-col v-for="hw in paginatedHardware" :key="hw.id" cols="12" sm="6" md="4">
            <v-card
              :elevation="isSelected(hw.id!) ? 8 : 1"
              :class="[
                'cursor-pointer',
                'h-100',
                'd-flex',
                'flex-column',
                'justify-space-between',
                'position-relative',
                { 'border-primary': isSelected(hw.id!) },
              ]"
              @click="toggleSelection(hw.id!)"
            >
              <v-icon v-if="isSelected(hw.id!)" color="primary" size="24" class="check-icon">
                mdi-check-circle
              </v-icon>

              <div style="flex-grow: 1; padding: 16px">
                <v-card-title class="pa-0">{{ hw.name }}</v-card-title>
                <v-card-subtitle>Type: {{ hw.type }}</v-card-subtitle>
                <v-card-text class="pa-0 mt-2 text-body-2">
                  {{ truncate(hw.description || '') }}
                </v-card-text>
              </div>

              <v-card-actions class="justify-end pt-0">
                <v-icon
                  color="primary"
                  @click.stop="editHardware(hw)"
                  title="Edit hardware"
                  class="mr-2 cursor-pointer hover-icon"
                >
                  mdi-pencil
                </v-icon>

                <v-icon
                  color="error"
                  @click.stop="askDeleteHardware(hw.id!)"
                  title="Delete hardware"
                  class="cursor-pointer hover-icon"
                >
                  mdi-delete
                </v-icon>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-alert v-else type="info" variant="tonal" class="mt-4">
          No hardware found matching your search criteria
        </v-alert>

        <v-pagination
          v-if="filteredHardware.length > itemsPerPage"
          v-model="page"
          :length="Math.ceil(filteredHardware.length / itemsPerPage)"
          class="mt-4"
          total-visible="5"
        />
      </v-card-text>

      <v-card-actions class="justify-space-between">
        <v-btn color="primary" variant="flat" @click="openCreateModal" title="Add new hardware">
          <v-icon start>mdi-plus</v-icon> Add Hardware
        </v-btn>

        <v-btn color="primary" variant="flat" @click="localDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Modal création -->
    <HardwareModal
      v-model="showCreateModal"
      :hardware-id="null"
      :hardware-type="hardwareType"
      @saved="hardwareStore.fetchAllHardware()"
    />

    <!-- Modal édition -->
    <HardwareModal
      v-model="showEditModal"
      :hardware-id="editingHardwareId"
      :hardware-type="hardwareType"
      @saved="hardwareStore.fetchAllHardware()"
    />

    <!-- Dialog confirmation delete -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Confirm Deletion</v-card-title>
        <v-card-text>
          Are you sure you want to delete
          <strong>{{ deleteTargetName }}</strong
          >? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDeleteHardware">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.h-100 {
  height: 100%;
}
.hover-icon:hover {
  color: #000000 !important;
  transform: scale(1.1);
  transition:
    transform 0.2s,
    color 0.2s;
}
.v-card {
  border: 2px solid transparent;
  border-radius: 8px;
  position: relative;
}
.border-primary {
  border: 2px solid rgb(var(--v-theme-primary));
}
.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
