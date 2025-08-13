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
const deleteTargetId = ref<number | null>(null);

const searchQuery = ref('');
const sortBy = ref<'name' | 'version'>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');
const page = ref(1);
const itemsPerPage = 9;

// Computed
const localDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const internalSelectedVersionIds = computed({
  get: () => props.selectedSoftwareVersions,
  set: (value: number[]) => emit('update:selectedSoftwareVersions', value),
});

const filteredSoftwareVersions = computed(() => {
  let items = softwareStore.softwareVersions.filter(
    (sv) => sv.software.type === 'acquisition' || sv.software.type === 'acquisition and analysis'
  );

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(
      (sv) =>
        sv.software.name.toLowerCase().includes(query) ||
        (sv.version && sv.version.toLowerCase().includes(query))
    );
  }

  return items;
});

const sortedSoftwareVersions = computed(() => {
  const items = [...filteredSoftwareVersions.value];
  return items.sort((a, b) => {
    let comparison = 0;
    if (sortBy.value === 'name') {
      comparison = a.software.name.localeCompare(b.software.name);
    } else {
      comparison = (a.version || '').localeCompare(b.version || '');
    }
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });
});

const paginatedSoftwareVersions = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return sortedSoftwareVersions.value.slice(start, start + itemsPerPage);
});

// Methods
function toggleSelection(id: number) {
  const newSelection = [...internalSelectedVersionIds.value];
  const index = newSelection.indexOf(id);
  if (index === -1) newSelection.push(id);
  else newSelection.splice(index, 1);
  internalSelectedVersionIds.value = newSelection;
}

function isSelected(id: number) {
  return internalSelectedVersionIds.value.includes(id);
}

function onAddSoftware() {
  editSoftwareId.value = null;
  showEditModal.value = true;
}

function onEditSoftware() {
  if (internalSelectedVersionIds.value.length === 0) return;
  const firstVersionId = internalSelectedVersionIds.value[0];
  const version = softwareStore.getSoftwareVersionById(firstVersionId);
  if (version) {
    editSoftwareId.value = version.software.id;
    showEditModal.value = true;
  }
}

function onEditVersion(versionId: number) {
  editSoftwareVersionId.value = versionId;
  showSoftwareVersionModal.value = true;
}

function onDeleteVersion(versionId: number) {
  deleteTargetId.value = versionId;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (deleteTargetId.value !== null) {
    await softwareStore.deleteSoftwareVersion(deleteTargetId.value);
    await softwareStore.fetchAllSoftwareVersions();
  }
  showDeleteConfirm.value = false;
  deleteTargetId.value = null;
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

  if (createdNew) {
    editSoftwareVersionId.value = null;
    showSoftwareVersionModal.value = true;
  }
}

function onVersionCreated() {
  showSoftwareVersionModal.value = false;
  editSoftwareVersionId.value = null;
  softwareStore.fetchAllSoftwareVersions();
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
}

watch(localDialog, handleDialogOpen, { immediate: true });
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
          class="ml-4"
          style="max-width: 300px"
        />
      </v-card-title>

      <v-card-text>
        <div class="d-flex align-center mb-4">
          <v-btn-toggle v-model="sortBy" mandatory divided>
            <v-btn value="name" size="small">
              <v-icon start>mdi-sort-alphabetical</v-icon> Name
            </v-btn>
            <v-btn value="version" size="small"> <v-icon start>mdi-numeric</v-icon> Version </v-btn>
          </v-btn-toggle>

          <v-btn
            @click="toggleSortOrder"
            size="small"
            class="ml-2"
            :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
            :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
          />
        </div>

        <v-row v-if="paginatedSoftwareVersions.length > 0" dense>
          <v-col v-for="item in paginatedSoftwareVersions" :key="item.id" cols="12" sm="6" md="4">
            <v-card
              :elevation="isSelected(item.id) ? 8 : 1"
              :class="[
                'cursor-pointer',
                'h-100',
                'd-flex',
                'flex-column',
                'justify-space-between',
                'position-relative',
                { 'border-primary': isSelected(item.id) },
              ]"
              @click="toggleSelection(item.id)"
            >
              <!-- Check icon top-right -->
              <v-icon v-if="isSelected(item.id)" color="primary" size="24" class="check-icon">
                mdi-check-circle
              </v-icon>

              <div style="flex-grow: 1; padding: 16px">
                <v-card-title class="pa-0">
                  {{ item.software.name }}
                </v-card-title>
                <v-card-subtitle> Version: {{ item.version || 'N/A' }} </v-card-subtitle>
                <v-card-subtitle> Type: {{ item.software.type }} </v-card-subtitle>
              </div>

              <v-card-actions class="justify-end pt-0">
                <!-- Edit version icon -->
                <v-icon
                  color="primary"
                  @click.stop="onEditVersion(item.id)"
                  title="Edit this software version"
                  class="mr-2 cursor-pointer hover-icon"
                >
                  mdi-pencil
                </v-icon>

                <!-- Edit software icon -->
                <v-icon
                  color="primary"
                  @click.stop="
                    () => {
                      editSoftwareId = item.software.id;
                      showEditModal = true;
                    }
                  "
                  title="Edit software"
                  class="mr-2 cursor-pointer hover-icon"
                >
                  mdi-cog
                </v-icon>

                <!-- Delete version icon -->
                <v-icon
                  color="error"
                  @click.stop="onDeleteVersion(item.id)"
                  title="Delete this software version"
                  class="cursor-pointer hover-icon"
                >
                  mdi-delete
                </v-icon>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-alert v-else type="info" variant="tonal" class="mt-4">
          No software found matching your search criteria
        </v-alert>

        <v-pagination
          v-if="filteredSoftwareVersions.length > itemsPerPage"
          v-model="page"
          :length="Math.ceil(filteredSoftwareVersions.length / itemsPerPage)"
          class="mt-4"
          total-visible="5"
        />
      </v-card-text>

      <v-card-actions class="justify-space-between">
        <div class="d-flex gap-2">
          <v-btn color="primary" variant="flat" @click="onAddSoftware" title="Add new software">
            <v-icon start>mdi-plus</v-icon> Add Software
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete confirmation dialog -->
  <v-dialog v-model="showDeleteConfirm" max-width="400">
    <v-card>
      <v-card-title class="text-h6">Confirm deletion</v-card-title>
      <v-card-text>
        Are you sure you want to delete this software version? This action cannot be undone.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="showDeleteConfirm = false">Cancel</v-btn>
        <v-btn color="error" @click="confirmDelete">Delete</v-btn>
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
