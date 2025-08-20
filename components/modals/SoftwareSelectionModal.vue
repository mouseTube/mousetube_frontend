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
const selectedSoftwareIds = ref<number[]>([]); // multi-sélection

// Computed
const localDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const internalSelectedVersionIds = computed({
  get: () => props.selectedSoftwareVersions,
  set: (value: number[]) => emit('update:selectedSoftwareVersions', value),
});

const groupedSoftware = computed(() => {
  const items = softwareStore.softwareVersions
    .filter(
      (sv) => sv.software.type === 'acquisition' || sv.software.type === 'acquisition and analysis'
    )
    .filter(
      (sv) =>
        !searchQuery.value.trim() ||
        sv.software.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (sv.version && sv.version.toLowerCase().includes(searchQuery.value.toLowerCase()))
    );

  const map = new Map<number, { software: any; versions: any[]; selectedVersionId?: number }>();

  items.forEach((sv) => {
    if (!map.has(sv.software.id)) {
      map.set(sv.software.id, {
        software: sv.software,
        versions: [],
        selectedVersionId: undefined,
      });
    }
    map.get(sv.software.id)!.versions.push(sv);
  });

  map.forEach((group) => {
    const lastSelected = group.versions.find((v) =>
      internalSelectedVersionIds.value.includes(v.id)
    );
    group.selectedVersionId = lastSelected
      ? lastSelected.id
      : group.versions[group.versions.length - 1].id;

    selectedVersionBySoftware.value[group.software.id] = group.selectedVersionId!;
  });

  let groupsArray = Array.from(map.values());

  groupsArray.sort((a, b) =>
    sortOrder.value === 'asc'
      ? a.software.name.localeCompare(b.software.name)
      : b.software.name.localeCompare(a.software.name)
  );

  return groupsArray;
});

const paginatedGroups = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return groupedSoftware.value.slice(start, start + itemsPerPage.value);
});

// Methods
function toggleCardSelection(group: { software: any }) {
  const idx = selectedSoftwareIds.value.indexOf(group.software.id);
  if (idx === -1) {
    selectedSoftwareIds.value.push(group.software.id);
  } else {
    selectedSoftwareIds.value.splice(idx, 1);
  }

  const versionId = selectedVersionBySoftware.value[group.software.id];
  if (versionId && !internalSelectedVersionIds.value.includes(versionId)) {
    internalSelectedVersionIds.value = [...internalSelectedVersionIds.value, versionId];
  }
}

function onVersionSelected(softwareId: number, versionId: number) {
  selectedVersionBySoftware.value[softwareId] = versionId;
  if (!internalSelectedVersionIds.value.includes(versionId)) {
    internalSelectedVersionIds.value = [...internalSelectedVersionIds.value, versionId];
  }
}

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
  if (!versionId) return;
  editSoftwareVersionId.value = versionId;
  showSoftwareVersionModal.value = true;
}

function onDeleteVersion(item: { id: number; softwareName: string; version: string | null }) {
  deleteTarget.value = item;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (deleteTarget.value) {
    await softwareStore.deleteSoftwareVersion(deleteTarget.value.id);
    await softwareStore.fetchAllSoftwareVersions();
  }
  showDeleteConfirm.value = false;
  deleteTarget.value = null;
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
}

function clearAllSoftwareSelection() {
  internalSelectedVersionIds.value = [];
  selectedSoftwareIds.value = [];
}

async function handleDialogOpen(val: boolean) {
  if (val) {
    await softwareStore.fetchAllSoftware();
    await softwareStore.fetchAllSoftwareVersions();
    page.value = 1;
  }
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

watch(localDialog, handleDialogOpen, { immediate: true });
watch(
  internalSelectedVersionIds,
  (ids) => {
    const newSelected: number[] = [];
    for (const [softwareId, versionId] of Object.entries(selectedVersionBySoftware.value)) {
      if (ids.includes(versionId)) newSelected.push(Number(softwareId));
    }
    selectedSoftwareIds.value = newSelected;
  },
  { immediate: true }
);
</script>

<template>
  <v-dialog v-model="localDialog" max-width="900px">
    <v-card>
      <v-card-title class="d-flex align-center">
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

        <v-row v-if="paginatedGroups.length > 0" dense>
          <v-col v-for="group in paginatedGroups" :key="group.software.id" cols="12" sm="6" md="4">
            <v-card
              class="h-100 d-flex flex-column justify-space-between"
              :class="{ 'selected-card': selectedSoftwareIds.includes(group.software.id) }"
              outlined
            >
              <v-card-title class="d-flex justify-space-between align-center pa-2">
                {{ group.software.name }}
                <div>
                  <v-icon
                    small
                    color="primary"
                    class="hover-icon mr-2"
                    @click.stop="onEditSoftware(group.software.id)"
                    >mdi-pencil</v-icon
                  >
                </div>
              </v-card-title>

              <v-card-text>
                <v-autocomplete
                  v-model="selectedVersionBySoftware[group.software.id]"
                  :items="group.versions"
                  item-title="version"
                  item-value="id"
                  label="Select Version"
                  dense
                  outlined
                  @change.stop="(val: number) => onVersionSelected(group.software.id, val)"
                />
              </v-card-text>

              <v-card-actions class="justify-between align-center">
                <!-- Carré de sélection -->
                <div
                  class="selection-box"
                  :class="{ selected: selectedSoftwareIds.includes(group.software.id) }"
                  @click.stop="toggleCardSelection(group)"
                >
                  <v-icon v-if="selectedSoftwareIds.includes(group.software.id)" small color="red"
                    >mdi-check</v-icon
                  >
                </div>

                <div>
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
                    class="hover-icon mr-2"
                    @click.stop="onEditVersion(selectedVersionBySoftware[group.software.id])"
                    >mdi-pencil</v-icon
                  >
                  <v-icon
                    small
                    color="error"
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

        <v-alert v-else type="info" variant="tonal" class="mt-4">
          No software found matching your search criteria
        </v-alert>

        <v-pagination
          v-if="groupedSoftware.length > itemsPerPage"
          v-model="page"
          :length="Math.ceil(groupedSoftware.length / itemsPerPage)"
          class="mt-4"
          total-visible="5"
        />
      </v-card-text>

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
.hover-icon:hover {
  color: #000000 !important;
  transform: scale(1.1);
  transition:
    transform 0.2s,
    color 0.2s;
}
.h-100 {
  height: 100%;
}
.selected-card {
  border: 2px solid rgb(143, 5, 5);
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
  border-color: rgb(143, 5, 5);
  background-color: #ffe6e6;
}
</style>
