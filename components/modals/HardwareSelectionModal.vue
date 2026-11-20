<script setup lang="ts">
import PickerFrame from '@/components/modals/PickerFrame.vue';
import { ref, computed, watch } from 'vue';
import { useHardwareStore, type Hardware } from '@/stores/hardware';
import HardwareModal from '@/components/modals/HardwareModal.vue';
import { useFavoriteStore } from '@/stores/favorite';

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

const searchQuery = ref('');
const sortOrder = ref<'asc' | 'desc'>('asc');
const page = ref(1);
const itemsPerPage = 9;

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingHardwareId = ref<number | null>(null);

const showDeleteConfirm = ref(false);
const deleteTargetId = ref<number | null>(null);
const deleteTargetName = ref<string>('');
const favoriteStore = useFavoriteStore();

const localDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const internalSelectedHardwareIds = computed({
  get: () => props.selectedHardwareIds,
  set: (value: number[]) => emit('update:selectedHardwareIds', value),
});

watch(localDialog, async (val) => {
  if (val && !hardwareStore.hardwares.length) {
    await hardwareStore.fetchAllHardware();
    page.value = 1;
  }
});

// Pagination, filter, sort
const filteredHardware = computed(() => {
  let items = hardwareStore.hardwares.filter((hw) => hw.type === props.hardwareType);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter((hw) => hw.name.toLowerCase().includes(q));
  }
  return items;
});

const sortedHardware = computed(() => {
  const items = [...filteredHardware.value];
  return items.sort((a, b) =>
    sortOrder.value === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );
});

const paginatedHardware = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return sortedHardware.value.slice(start, start + itemsPerPage);
});

function truncate(text: string, length = 80) {
  if (!text) return '—';
  return text.length > length ? text.slice(0, length) + '…' : text;
}

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
  deleteTargetName.value = hw.name;
  showDeleteConfirm.value = true;
}

async function confirmDeleteHardware() {
  if (deleteTargetId.value === null) return;
  await hardwareStore.deleteHardware(deleteTargetId.value);
  await hardwareStore.fetchAllHardware();
  const totalPages = Math.ceil(filteredHardware.value.length / itemsPerPage);
  if (page.value > totalPages) page.value = totalPages > 0 ? totalPages : 1;
  showDeleteConfirm.value = false;
  deleteTargetId.value = null;
  deleteTargetName.value = '';
}

function clearAllHardwareSelection() {
  internalSelectedHardwareIds.value = [];
}

async function toggleFavorite(hardwareId: number) {
  try {
    await favoriteStore.toggleFavorite('hardware', hardwareId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to toggle favorite:', err);
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'draft':
      return 'grey';
    case 'waiting validation':
      return 'orange';
    case 'validated':
      return 'green';
    default:
      return 'grey';
  }
}

function onHardwareCreated(newId?: number) {
  hardwareStore.fetchAllHardware();
  if (newId) {
    internalSelectedHardwareIds.value = [...internalSelectedHardwareIds.value, newId];
  }
}

onMounted(async () => {
  await favoriteStore.fetchAllFavorites();
});
</script>

<template>
  <v-dialog v-model="localDialog" max-width="900px">
    <PickerFrame
      :title="`Select ${hardwareType}s`"
      :subtitle="`${filteredHardware.length} available · ${internalSelectedHardwareIds.length} selected`"
      icon="mdi-microphone-outline"
      :selected="internalSelectedHardwareIds.length"
      @close="localDialog = false"
    >
      <template #toolbar>
        <v-text-field
          v-model="searchQuery"
          placeholder="Search hardware..."
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
        />
        <v-btn
          icon
          variant="tonal"
          :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
          @click="toggleSortOrder"
        >
          <v-icon>{{ sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending' }}</v-icon>
        </v-btn>
      </template>

      <v-row v-if="paginatedHardware.length > 0" dense>
        <v-col v-for="hw in paginatedHardware" :key="hw.id" cols="12" sm="6" md="4">
          <v-card
            :class="['pick-card', { 'pick-card--selected': isSelected(hw.id!) }]"
            tabindex="0"
            role="checkbox"
            :aria-checked="isSelected(hw.id!)"
            @click="toggleSelection(hw.id!)"
            @keydown.enter.prevent="toggleSelection(hw.id!)"
            @keydown.space.prevent="toggleSelection(hw.id!)"
          >
            <v-icon
              v-if="isSelected(hw.id!)"
              class="pick-check"
              color="primary"
              size="24"
              icon="mdi-check-circle"
            />
            <div class="pick-title d-flex align-center">
              <v-btn
                variant="text"
                size="x-small"
                density="comfortable"
                :icon="
                  favoriteStore.isFavorite('hardware', hw.id ?? -1)
                    ? 'mdi-star'
                    : 'mdi-star-outline'
                "
                :color="favoriteStore.isFavorite('hardware', hw.id ?? -1) ? 'warning' : 'grey'"
                title="Toggle favorite"
                aria-label="Toggle favorite"
                class="me-1"
                @click.stop="hw.id && toggleFavorite(hw.id)"
              />
              <span class="text-truncate" :title="hw.name">{{ hw.name }}</span>
            </div>
            <div class="pick-text" :title="hw.description || ''">
              {{ truncate(hw.description || '') }}
            </div>
            <div class="pick-foot">
              <v-chip v-if="hw.status" :color="getStatusColor(hw.status)" size="small" label>
                {{ hw.status }}
              </v-chip>
              <span v-else />
              <span class="pick-tools">
                <v-btn
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  color="grey-darken-1"
                  title="Edit hardware"
                  aria-label="Edit hardware"
                  @click.stop="editHardware(hw)"
                />
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="small"
                  color="grey-darken-1"
                  title="Delete hardware"
                  aria-label="Delete hardware"
                  @click.stop="askDeleteHardware(hw.id!)"
                />
              </span>
            </div>
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

      <template #actions>
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          title="Add new hardware"
          @click="openCreateModal"
        >
          Add hardware
        </v-btn>
        <v-btn
          variant="text"
          :disabled="internalSelectedHardwareIds.length === 0"
          @click="clearAllHardwareSelection"
        >
          Clear selection
        </v-btn>
      </template>
    </PickerFrame>

    <HardwareModal
      v-model="showCreateModal"
      :hardware-id="null"
      :hardware-type="hardwareType"
      @saved="onHardwareCreated"
    />

    <HardwareModal
      v-model="showEditModal"
      :hardware-id="editingHardwareId"
      :hardware-type="hardwareType"
      @saved="() => hardwareStore.fetchAllHardware()"
    />

    <!-- Dialog confirmation delete -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Confirm Deletion</v-card-title>
        <v-card-text>
          Are you sure you want to delete <strong>{{ deleteTargetName }}</strong
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
