<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useHardwareStore, type Hardware } from '@/stores/hardware';
import { useFavoriteStore } from '@/stores/favorite';
import HardwareModal from '@/components/modals/HardwareModal.vue';

const hardwareStore = useHardwareStore();
const favoriteStore = useFavoriteStore();

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

const filteredHardware = computed(() => {
  let items = hardwareStore.hardwares;
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

function truncate(text: string, length = 100) {
  if (!text) return '—';
  return text.length > length ? text.slice(0, length) + '…' : text;
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
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

function openCreateModal() {
  editingHardwareId.value = null;
  showCreateModal.value = true;
}

function onHardwareCreated() {
  hardwareStore.fetchAllHardware();
}

async function toggleFavorite(hardwareId: number) {
  try {
    await favoriteStore.toggleFavorite('hardware', hardwareId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to toggle favorite:', err);
  }
}

onMounted(async () => {
  await hardwareStore.fetchAllHardware();
  await favoriteStore.fetchAllFavorites();
});
</script>

<template>
  <div>
    <v-card-title class="d-flex align-center font-weight-bold">
      <span>Hardware</span>
      <v-spacer />
      <v-text-field
        v-model="searchQuery"
        placeholder="Search hardware..."
        density="compact"
        variant="outlined"
        hide-details
        prepend-inner-icon="mdi-magnify"
        style="max-width: 300px"
      />
      <v-btn
        @click="toggleSortOrder"
        size="small"
        class="ms-2"
        :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
      />
    </v-card-title>

    <v-row v-if="paginatedHardware.length > 0" dense>
      <v-col v-for="hw in paginatedHardware" :key="hw.id" cols="12" sm="6" md="4">
        <v-card class="h-100 d-flex flex-column justify-space-between">
          <!-- En-tête sans padding -->
          <div class="pa-0" style="flex-grow: 1">
            <div class="d-flex align-center mb-1" style="padding: 8px 16px 0 8px">
              <!-- Bouton favori collé au bord -->
              <v-btn
                variant="text"
                size="small"
                :icon="
                  favoriteStore.isFavorite('hardware', hw.id ?? -1)
                    ? 'mdi-star'
                    : 'mdi-star-outline'
                "
                :color="favoriteStore.isFavorite('hardware', hw.id ?? -1) ? 'warning' : 'grey'"
                @click.stop="hw.id && toggleFavorite(hw.id)"
                title="Toggle favorite"
                style="min-width: 32px; margin: 0; padding: 0"
              />

              <!-- Titre sans marge excessive -->
              <div class="text-h6 font-weight-medium ms-1" style="margin: 0">
                {{ hw.name }}
              </div>
            </div>

            <v-card-subtitle class="text-body-2 mb-1 ps-4"> Type: {{ hw.type }} </v-card-subtitle>

            <v-card-text class="pa-0 mt-2 text-body-2 ps-4 pe-4 pb-4">
              {{ truncate(hw.description || '') }}
            </v-card-text>
          </div>

          <v-card-actions class="justify-end pt-0 pe-3 pb-3">
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

    <v-alert v-else type="info" variant="tonal" class="mt-4"> No hardware found </v-alert>

    <v-pagination
      v-if="filteredHardware.length > itemsPerPage"
      v-model="page"
      :length="Math.ceil(filteredHardware.length / itemsPerPage)"
      class="mt-4"
      total-visible="5"
    />

    <v-card-actions class="justify-start mt-4">
      <v-btn color="primary" variant="flat" @click="openCreateModal">
        <v-icon start>mdi-plus</v-icon> Add Hardware
      </v-btn>
    </v-card-actions>

    <!-- Modals -->
    <HardwareModal v-model="showCreateModal" :hardware-id="null" @saved="onHardwareCreated" />
    <HardwareModal
      v-model="showEditModal"
      :hardware-id="editingHardwareId"
      @saved="() => hardwareStore.fetchAllHardware()"
    />

    <!-- Delete confirmation -->
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
          <v-btn color="error" variant="flat" @click="confirmDeleteHardware"> Delete </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.hover-icon:hover {
  color: #000 !important;
  transform: scale(1.1);
  transition:
    transform 0.2s,
    color 0.2s;
}
.h-100 {
  height: 100%;
}
.favorite-btn {
  min-width: 36px;
}
</style>
