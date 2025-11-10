<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSoftwareStore } from '@/stores/software';
import { useFavoriteStore } from '@/stores/favorite';
import SoftwareEditModal from '@/components/modals/SoftwareModal.vue';
import CreateSoftwareVersionModal from '@/components/modals/CreateSoftwareVersionModal.vue';
import { useAuth } from '@/composables/useAuth';

const props = defineProps<{
  modelValue: boolean;
  selectedSoftwareVersions: number[];
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:selectedSoftwareVersions', value: number[]): void;
}>();

const softwareStore = useSoftwareStore();
const { id_user } = useAuth();

// UI state
const showEditModal = ref(false);
const editSoftwareId = ref<number | null>(null);
const showSoftwareVersionModal = ref(false);
const editSoftwareVersionId = ref<number | null>(null);

const showDeleteConfirm = ref(false);
const deleteTarget = ref<{ id: number; softwareName: string; version: string | null } | null>(null);

const showDeleteSoftwareConfirm = ref(false); // 🔹 nouveau
const deleteSoftwareTarget = ref<{ id: number; name: string } | null>(null); // 🔹 nouveau
const duplicatedSoftwareData = ref(null);
const searchQuery = ref('');
const sortOrder = ref<'asc' | 'desc'>('asc');
const page = ref(1);
const itemsPerPage = ref(6);

const selectedVersionBySoftware = ref<Record<number, number>>({});
const selectedSoftwareIds = ref<number[]>([]);

const favoriteStore = useFavoriteStore();

const localDialog = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});
const internalSelectedVersionIds = computed({
  get: () => props.selectedSoftwareVersions,
  set: (val: number[]) => emit('update:selectedSoftwareVersions', val),
});

// Grouped software to display
const groupedSoftware = computed(() => {
  const items = softwareStore.softwareVersions.filter(
    (sv) =>
      (sv.software.type === 'acquisition' || sv.software.type === 'acquisition and analysis') &&
      (!searchQuery.value.trim() ||
        sv.software.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        sv.version?.toLowerCase().includes(searchQuery.value.toLowerCase()))
  );

  const map = new Map<number, { software: any; versions: any[]; selectedVersionId: number }>();

  items.forEach((sv) => {
    if (!map.has(sv.software.id)) {
      map.set(sv.software.id, { software: sv.software, versions: [], selectedVersionId: 0 });
    }
    map.get(sv.software.id)!.versions.push(sv);
  });

  map.forEach((group) => {
    const currentSelected = selectedVersionBySoftware.value[group.software.id];

    if (!currentSelected || !group.versions.find((v) => v.id === currentSelected)) {
      const selected = group.versions.find((v) => internalSelectedVersionIds.value.includes(v.id));
      group.selectedVersionId = selected?.id ?? group.versions.at(-1)!.id;
      selectedVersionBySoftware.value[group.software.id] = group.selectedVersionId;
    } else {
      group.selectedVersionId = currentSelected;
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    sortOrder.value === 'asc'
      ? a.software.name.localeCompare(b.software.name)
      : b.software.name.localeCompare(a.software.name)
  );
});

const paginatedGroups = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return groupedSoftware.value.slice(start, start + itemsPerPage.value);
});

// Handlers
function toggleCardSelection(group: { software: any }) {
  const softwareId = group.software.id;
  const versionId = selectedVersionBySoftware.value[softwareId];
  const idx = selectedSoftwareIds.value.indexOf(softwareId);

  if (idx === -1) {
    selectedSoftwareIds.value.push(softwareId);
    if (versionId && !internalSelectedVersionIds.value.includes(versionId))
      internalSelectedVersionIds.value = [...internalSelectedVersionIds.value, versionId];
  } else {
    selectedSoftwareIds.value.splice(idx, 1);
    internalSelectedVersionIds.value = internalSelectedVersionIds.value.filter(
      (id) => id !== versionId
    );
  }
}

function onVersionSelected(softwareId: number, versionId: number) {
  selectedVersionBySoftware.value[softwareId] = versionId;

  const softwareVersionIds = softwareStore.softwareVersions
    .filter((sv) => sv.software.id === softwareId)
    .map((sv) => sv.id);

  const newSelectedVersions = [
    ...internalSelectedVersionIds.value.filter((id) => !softwareVersionIds.includes(id)),
    versionId,
  ];

  emit('update:selectedSoftwareVersions', newSelectedVersions);

  internalSelectedVersionIds.value = newSelectedVersions;

  if (!selectedSoftwareIds.value.includes(softwareId)) {
    selectedSoftwareIds.value.push(softwareId);
  }
}

function clearAllSoftwareSelection() {
  internalSelectedVersionIds.value = [];
  selectedSoftwareIds.value = [];
}

async function handleDialogOpen(val: boolean) {
  if (!val) return;

  await softwareStore.fetchAllSoftware();
  await softwareStore.fetchAllSoftwareVersions();
  page.value = 1;

  selectedVersionBySoftware.value = {};

  softwareStore.softwareVersions.forEach((sv) => {
    if (props.selectedSoftwareVersions.includes(sv.id)) {
      selectedVersionBySoftware.value[sv.software.id] = sv.id;
      if (!selectedSoftwareIds.value.includes(sv.software.id)) {
        selectedSoftwareIds.value.push(sv.software.id);
      }
    }
  });
}

// Modal / CRUD
function onAddSoftware() {
  editSoftwareId.value = null;
  showEditModal.value = true;
}
function onEditSoftware(softwareId: number) {
  editSoftwareId.value = softwareId;
  showEditModal.value = true;
}
function onCreateVersion(softwareId: number) {
  editSoftwareId.value = softwareId;
  editSoftwareVersionId.value = null;
  showSoftwareVersionModal.value = true;
}
function onEditVersion(versionId: number) {
  editSoftwareVersionId.value = versionId;
  showSoftwareVersionModal.value = true;
}
function onDeleteVersion(item: { id: number; softwareName: string; version: string | null }) {
  deleteTarget.value = item;
  showDeleteConfirm.value = true;
}
async function confirmDelete() {
  if (!deleteTarget.value) return;

  const softwareId = softwareStore.softwareVersions.find((sv) => sv.id === deleteTarget.value!.id)
    ?.software.id;

  const deletedVersionId = deleteTarget.value.id;

  await softwareStore.deleteSoftwareVersion(deletedVersionId);
  await softwareStore.fetchAllSoftwareVersions();

  if (softwareId) {
    const remainingVersions = softwareStore.softwareVersions
      .filter((sv) => sv.software.id === softwareId)
      .map((sv) => sv.id);

    if (internalSelectedVersionIds.value.includes(deletedVersionId)) {
      if (remainingVersions.length) {
        onVersionSelected(softwareId, remainingVersions.at(-1)!);
      } else {
        delete selectedVersionBySoftware.value[softwareId];
        selectedSoftwareIds.value = selectedSoftwareIds.value.filter((id) => id !== softwareId);
        internalSelectedVersionIds.value = internalSelectedVersionIds.value.filter(
          (id) => id !== deletedVersionId
        );
      }
    }
  }

  showDeleteConfirm.value = false;
  deleteTarget.value = null;
}

function onDeleteSoftware(softwareId: number, name: string) {
  deleteSoftwareTarget.value = { id: softwareId, name };
  showDeleteSoftwareConfirm.value = true;
}

async function confirmDeleteSoftware() {
  if (!deleteSoftwareTarget.value) return;
  await softwareStore.deleteSoftware(deleteSoftwareTarget.value.id);
  await softwareStore.fetchAllSoftware();
  await softwareStore.fetchAllSoftwareVersions();

  selectedSoftwareIds.value = selectedSoftwareIds.value.filter(
    (id) => id !== deleteSoftwareTarget.value!.id
  );
  delete selectedVersionBySoftware.value[deleteSoftwareTarget.value.id];
  internalSelectedVersionIds.value = internalSelectedVersionIds.value.filter(
    (id) =>
      !groupedSoftware.value.some(
        (g) =>
          g.software.id === deleteSoftwareTarget.value!.id && g.versions.some((v) => v.id === id)
      )
  );

  showDeleteSoftwareConfirm.value = false;
  deleteSoftwareTarget.value = null;
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
}

function onSoftwareSaved(newOrEditedSoftwareId: number, createdNew: boolean) {
  showEditModal.value = false;
  softwareStore.fetchAllSoftware();
  softwareStore.fetchAllSoftwareVersions();

  if (createdNew) onCreateVersion(newOrEditedSoftwareId);
}

async function onVersionCreated(versionId: number) {
  showSoftwareVersionModal.value = false;
  editSoftwareVersionId.value = null;

  const softwareId = editSoftwareId.value!;

  await softwareStore.fetchAllSoftwareVersions();

  selectedVersionBySoftware.value[softwareId] = versionId;
}

function onDuplicateSoftware(data: any) {
  showEditModal.value = false;
  editSoftwareId.value = null;

  setTimeout(() => {
    duplicatedSoftwareData.value = data;
    showEditModal.value = true;
  }, 0);
}

function toggleFavorite(softwareId: number) {
  favoriteStore.toggleFavorite('software', softwareId);
}

const truncate = (text: string, length = 40) => {
  if (!text) return '';
  return text.length > length ? text.slice(0, length - 1) + '…' : text;
};

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

// Watchers
watch(localDialog, handleDialogOpen, { immediate: true });

watch(
  internalSelectedVersionIds,
  () => {
    selectedSoftwareIds.value = Object.entries(selectedVersionBySoftware.value)
      .filter(([_, vId]) => internalSelectedVersionIds.value.includes(vId))
      .map(([sId]) => Number(sId));
  },
  { immediate: true }
);

onMounted(async () => {
  await softwareStore.fetchAllSoftware();
  await softwareStore.fetchAllSoftwareVersions();
  await favoriteStore.fetchAllFavorites();
});
</script>

<template>
  <v-dialog v-model="localDialog" max-width="900px">
    <v-card class="pa-3">
      <!-- Header -->
      <v-card-title class="d-flex align-center font-weight-bold">
        <span>Select Acquisition Software Version</span>
        <v-spacer />
        <v-text-field
          v-model="searchQuery"
          placeholder="Search software..."
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          style="max-width: 300px"
        />
        <v-btn
          @click="toggleSortOrder"
          size="small"
          class="ml-2"
          :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
          :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
        />
      </v-card-title>

      <!-- Body -->
      <v-card-text>
        <v-row dense v-if="paginatedGroups.length">
          <v-col v-for="group in paginatedGroups" :key="group.software.id" cols="12" sm="6" md="4">
            <v-card
              class="software-card"
              :class="{ 'selected-card': selectedSoftwareIds.includes(group.software.id) }"
              outlined
            >
              <!-- Card header -->
              <v-card-title class="d-flex justify-space-between align-center pa-2">
                <div class="d-flex align-center flex-grow-1" style="min-width: 0">
                  <v-btn
                    variant="text"
                    size="small"
                    :icon="
                      favoriteStore.isFavorite('software', group.software.id)
                        ? 'mdi-star'
                        : 'mdi-star-outline'
                    "
                    :color="
                      favoriteStore.isFavorite('software', group.software.id) ? 'warning' : 'grey'
                    "
                    @click.stop="toggleFavorite(group.software.id)"
                    title="Toggle favorite"
                    class="favorite-btn me-2"
                  />

                  <v-tooltip location="top">
                    <template #activator="{ props }">
                      <div
                        v-bind="props"
                        class="font-weight-medium text-truncate"
                        style="
                          display: block;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                          min-width: 0;
                          flex: 1;
                        "
                      >
                        {{ truncate(group.software.name, 40) }}
                      </div>
                    </template>
                    <span>{{ group.software.name }}</span>
                  </v-tooltip>
                </div>

                <div
                  class="d-flex align-center gap-1 flex-shrink-0"
                  v-if="group.software.created_by === id_user"
                >
                  <v-icon
                    small
                    color="primary"
                    class="hover-icon"
                    @click.stop="onEditSoftware(group.software.id)"
                  >
                    mdi-pencil
                  </v-icon>
                  <v-icon
                    small
                    color="primary"
                    class="hover-icon"
                    @click.stop="onDeleteSoftware(group.software.id, group.software.name)"
                  >
                    mdi-delete
                  </v-icon>
                </div>
              </v-card-title>

              <!-- Version selector -->
              <v-card-text>
                <v-autocomplete
                  v-model="selectedVersionBySoftware[group.software.id]"
                  :items="group.versions"
                  item-title="version"
                  item-value="id"
                  label="Select Version"
                  dense
                  outlined
                  @update:model-value="(val: number) => onVersionSelected(group.software.id, val)"
                />
              </v-card-text>

              <!-- Card actions -->
              <v-card-actions class="justify-space-between align-center">
                <v-chip
                  v-if="group.software.status"
                  :color="getStatusColor(group.software.status)"
                  size="small"
                  class="ms-2 text-white"
                  label
                >
                  {{ group.software.status }}
                </v-chip>
                <div class="d-flex align-center" style="gap: 4px">
                  <div
                    class="selection-box"
                    :class="{ selected: selectedSoftwareIds.includes(group.software.id) }"
                    @click.stop="toggleCardSelection(group)"
                  >
                    <v-icon
                      v-if="selectedSoftwareIds.includes(group.software.id)"
                      small
                      color="primary"
                      >mdi-check</v-icon
                    >
                  </div>
                  <v-icon
                    small
                    color="primary"
                    class="hover-icon"
                    @click.stop="onCreateVersion(group.software.id)"
                    >mdi-plus</v-icon
                  >
                  <v-icon
                    small
                    color="primary"
                    class="hover-icon"
                    @click.stop="onEditVersion(selectedVersionBySoftware[group.software.id])"
                    >mdi-pencil</v-icon
                  >
                  <v-icon
                    small
                    color="primary"
                    class="hover-icon"
                    @click.stop="
                      onDeleteVersion({
                        id: selectedVersionBySoftware[group.software.id],
                        softwareName: group.software.name,
                        version:
                          group.versions.find(
                            (v: { id: number; version: string | null }) =>
                              v.id === selectedVersionBySoftware[group.software.id]
                          )?.version ?? null,
                      })
                    "
                    >mdi-delete</v-icon
                  >
                </div>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Empty state -->
        <v-alert v-else type="info" variant="tonal" class="mt-4">
          No software found matching your search criteria
        </v-alert>

        <!-- Pagination -->
        <v-pagination
          v-if="groupedSoftware.length > itemsPerPage"
          v-model="page"
          :length="Math.ceil(groupedSoftware.length / itemsPerPage)"
          class="mt-4"
          total-visible="5"
        />
      </v-card-text>

      <!-- Footer -->
      <v-card-actions class="justify-space-between">
        <v-btn color="primary" variant="flat" @click="onAddSoftware" title="Add new software">
          <v-icon start>mdi-plus</v-icon> Add Software
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          :disabled="internalSelectedVersionIds.length === 0"
          @click="clearAllSoftwareSelection"
        >
          <v-icon start>mdi-close</v-icon> Clear All
        </v-btn>
        <v-btn color="primary" variant="flat" @click="localDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Delete version confirmation -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Confirm deletion</v-card-title>
        <v-card-text>
          Are you sure you want to delete
          <strong> version {{ deleteTarget?.version || '' }}</strong> of
          <strong>{{ deleteTarget?.softwareName }}</strong
          >? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete software confirmation -->
    <v-dialog v-model="showDeleteSoftwareConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Confirm software deletion</v-card-title>
        <v-card-text>
          Are you sure you want to delete the software
          <strong>{{ deleteSoftwareTarget?.name }}</strong
          >? All its versions will also be deleted. This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showDeleteSoftwareConfirm = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmDeleteSoftware">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modals -->
    <SoftwareEditModal
      v-model="showEditModal"
      :software-id="editSoftwareId"
      :initial-data="duplicatedSoftwareData"
      @saved="onSoftwareSaved"
      @duplicate="onDuplicateSoftware"
    />
    <CreateSoftwareVersionModal
      v-if="showSoftwareVersionModal"
      v-model="showSoftwareVersionModal"
      :software-id="editSoftwareId!"
      :software-version-id="editSoftwareVersionId"
      @saved="onVersionCreated"
    />
  </v-dialog>
</template>

<style scoped>
.software-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 220px;
}

.hover-icon:hover {
  color: #000 !important;
  transform: scale(1.1);
  transition:
    transform 0.2s,
    color 0.2s;
}

.selected-card {
  border: 2px solid #c62828;
}

.selection-box {
  width: 20px;
  height: 20px;
  border: 2px solid #ccc;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.selection-box.selected {
  border-color: #c62828;
  background-color: #ffe6e6;
  color: #c62828;
}

.selection-box v-icon {
  font-size: 16px;
}
</style>
