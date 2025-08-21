<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSoftwareStore } from '@/stores/software';
import SoftwareEditModal from '@/components/modals/SoftwareModal.vue';
import CreateSoftwareVersionModal from '@/components/modals/CreateSoftwareVersionModal.vue';

const props = defineProps<{
  modelValue: boolean;
  selectedSoftwareVersions: number[];
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:selectedSoftwareVersions', value: number[]): void;
}>();

const softwareStore = useSoftwareStore();

// UI state
const showEditModal = ref(false);
const editSoftwareId = ref<number | null>(null);
const showSoftwareVersionModal = ref(false);
const editSoftwareVersionId = ref<number | null>(null);
const showDeleteConfirm = ref(false);
const deleteTarget = ref<{ id: number; softwareName: string; version: string | null } | null>(null);

const searchQuery = ref('');
const sortOrder = ref<'asc' | 'desc'>('asc');
const page = ref(1);
const itemsPerPage = ref(6);

// Map softwareId -> versionId sélectionnée
const selectedVersionBySoftware = ref<Record<number, number>>({});
const selectedSoftwareIds = ref<number[]>([]);

const localDialog = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});
const internalSelectedVersionIds = computed({
  get: () => props.selectedSoftwareVersions,
  set: (val: number[]) => emit('update:selectedSoftwareVersions', val),
});

// Grouped software pour affichage
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
    const selected = group.versions.find((v) => internalSelectedVersionIds.value.includes(v.id));
    group.selectedVersionId =
      selectedVersionBySoftware.value[group.software.id] ??
      selected?.id ??
      group.versions.at(-1)!.id;
    selectedVersionBySoftware.value[group.software.id] = group.selectedVersionId;
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

  const softwareVersions = softwareStore.softwareVersions
    .filter((sv) => sv.software.id === softwareId)
    .map((sv) => sv.id);
  internalSelectedVersionIds.value = [
    ...internalSelectedVersionIds.value.filter((id) => !softwareVersions.includes(id)),
    versionId,
  ];

  if (!selectedSoftwareIds.value.includes(softwareId)) selectedSoftwareIds.value.push(softwareId);
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
  await softwareStore.deleteSoftwareVersion(deleteTarget.value.id);
  await softwareStore.fetchAllSoftwareVersions();
  showDeleteConfirm.value = false;
  deleteTarget.value = null;
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
function onVersionCreated() {
  showSoftwareVersionModal.value = false;
  editSoftwareVersionId.value = null;
  softwareStore.fetchAllSoftwareVersions();
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
                {{ group.software.name }}
                <v-icon
                  small
                  color="primary"
                  class="hover-icon"
                  @click.stop="onEditSoftware(group.software.id)"
                  >mdi-pencil</v-icon
                >
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
              <v-card-actions class="justify-between align-center">
                <div
                  class="selection-box"
                  :class="{ selected: selectedSoftwareIds.includes(group.software.id) }"
                  @click.stop="toggleCardSelection(group)"
                >
                  <v-icon v-if="selectedSoftwareIds.includes(group.software.id)" small color="red"
                    >mdi-check</v-icon
                  >
                </div>
                <div class="d-flex gap-1">
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
                            (v) => v.id === selectedVersionBySoftware[group.software.id]
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

    <!-- Delete confirmation -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Confirm deletion</v-card-title>
        <v-card-text>
          Are you sure you want to delete the software version
          <strong>{{ deleteTarget?.softwareName }} {{ deleteTarget?.version || '' }}</strong
          >? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <SoftwareEditModal
      v-model="showEditModal"
      :software-id="editSoftwareId"
      @saved="onSoftwareSaved"
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
  min-height: 220px; /* Fixe la hauteur pour éviter redimensionnement */
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
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.selection-box.selected {
  border-color: #c62828;
  background-color: #ffe6e6;
}
</style>
