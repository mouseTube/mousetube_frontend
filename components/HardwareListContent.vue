<script setup lang="ts">
import ReviewStatus from '@/components/ReviewStatus.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { useHardwareStore, type Hardware } from '@/stores/hardware';
import { useFavoriteStore } from '@/stores/favorite';
import AccountListHeader from '@/components/AccountListHeader.vue';
import SortButtons, { type Sort } from '@/components/SortButtons.vue';
import HardwareModal from '@/components/modals/HardwareModal.vue';
import { Mic, MicVocal, Speaker, BoomBox, Microchip } from '@lucide/vue';

const hardwareStore = useHardwareStore();
const favoriteStore = useFavoriteStore();

const searchQuery = ref('');
const sort = ref<Sort>({ key: 'name', dir: 'asc' });
const page = ref(1);
const itemsPerPage = 9;

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingHardwareId = ref<number | null>(null);

const showDeleteConfirm = ref(false);
const deleteTargetId = ref<number | null>(null);
const deleteTargetName = ref<string>('');

// the state of the entries: only yours can be a draft or wait for a review
const STATUSES = [
  { value: 'draft', title: 'Draft' },
  { value: 'waiting validation', title: 'Waiting for validation' },
  { value: 'validated', title: 'Validated' },
];
const status = ref<string | null>(null);
watch([searchQuery, status, sort], () => {
  page.value = 1;
});

const filteredHardware = computed(() => {
  let items = hardwareStore.hardwares;
  if (status.value) items = items.filter((hw) => hw.status === status.value);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter((hw) => hw.name.toLowerCase().includes(q));
  }
  return items;
});

const sortedHardware = computed(() => {
  const sign = sort.value.dir === 'asc' ? 1 : -1;
  return [...filteredHardware.value].sort((a, b) =>
    sort.value.key === 'name'
      ? sign * a.name.localeCompare(b.name)
      : sign * (a.modified_at ?? '').localeCompare(b.modified_at ?? '')
  );
});

const paginatedHardware = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return sortedHardware.value.slice(start, start + itemsPerPage);
});

const typeIcon = (type?: string | null) =>
  ({ microphone: MicVocal, speaker: Speaker, amplifier: BoomBox, soundcard: Microchip })[
    type ?? ''
  ];

function truncate(text: string, length = 60) {
  if (!text) return '—';
  return text.length > length ? text.slice(0, length) + '…' : text;
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

onMounted(async () => {
  await hardwareStore.fetchAllHardware();
  await favoriteStore.fetchAllFavorites();
});
</script>

<template>
  <div>
    <AccountListHeader
      title="My hardware"
      lead="Microphones, soundcards, speakers and amplifiers you can use in a recording. Star the ones you use most; edit or delete the ones you created."
      add-label="Add hardware"
      @add="openCreateModal"
    >
      <v-text-field
        v-model="searchQuery"
        density="comfortable"
        variant="outlined"
        placeholder="Search hardware"
        prepend-inner-icon="mdi-magnify"
        clearable
        hide-details
        style="max-width: 300px"
      />
      <v-chip-group v-model="status" selected-class="text-primary">
        <v-chip
          v-for="state in STATUSES"
          :key="state.value"
          :value="state.value"
          filter
          variant="outlined"
          size="small"
        >
          {{ state.title }}
        </v-chip>
      </v-chip-group>
      <SortButtons v-model="sort" class="ms-auto" />
    </AccountListHeader>

    <ul v-if="paginatedHardware.length > 0" class="entry-list">
      <li v-for="hw in paginatedHardware" :key="hw.id" class="entry-row">
        <div class="entry-main">
          <div class="entry-name">
            <v-btn
              variant="text"
              size="small"
              density="comfortable"
              :icon="
                favoriteStore.isFavorite('hardware', hw.id ?? -1) ? 'mdi-star' : 'mdi-star-outline'
              "
              :color="favoriteStore.isFavorite('hardware', hw.id ?? -1) ? 'warning' : 'grey'"
              title="Toggle favorite"
              @click.stop="hw.id && toggleFavorite(hw.id)"
            />
            {{ hw.name }}
          </div>
          <div class="entry-meta">
            <component :is="typeIcon(hw.type)" v-if="typeIcon(hw.type)" :size="16" />
            {{
              [hw.type ? hw.type.charAt(0).toUpperCase() + hw.type.slice(1) : '', hw.made_by]
                .filter(Boolean)
                .join(' · ')
            }}
          </div>
          <div v-if="hw.description" class="entry-help">{{ hw.description }}</div>
        </div>

        <ReviewStatus
          v-if="hw.id"
          endpoint="hardware"
          :id="hw.id"
          :status="hw.status || 'draft'"
          compact
          @changed="hw.status = $event"
        />

        <div class="entry-actions">
          <v-btn
            icon="mdi-pencil-outline"
            variant="text"
            size="small"
            title="Edit hardware"
            @click.stop="editHardware(hw)"
          />
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            color="error"
            title="Delete hardware"
            @click.stop="askDeleteHardware(hw.id!)"
          />
        </div>
      </li>
    </ul>

    <v-alert v-else type="info" variant="tonal" class="mt-4"> No hardware found </v-alert>

    <v-pagination
      v-if="filteredHardware.length > itemsPerPage"
      v-model="page"
      :length="Math.ceil(filteredHardware.length / itemsPerPage)"
      class="mt-4"
      total-visible="5"
    />

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
