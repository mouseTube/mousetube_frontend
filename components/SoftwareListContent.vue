<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSoftwareStore } from '@/stores/software';
import { useFavoriteStore } from '@/stores/favorite';
import SoftwareEditModal from '@/components/modals/SoftwareModal.vue';
import CreateSoftwareVersionModal from '@/components/modals/CreateSoftwareVersionModal.vue';
import { useAuth } from '@/composables/useAuth';

const softwareStore = useSoftwareStore();
const favoriteStore = useFavoriteStore();
const { id_user } = useAuth();

// UI state
const showEditModal = ref(false);
const editSoftwareId = ref<number | null>(null);
const showSoftwareVersionModal = ref(false);
const editSoftwareVersionId = ref<number | null>(null);

const showDeleteConfirm = ref(false);
const deleteTarget = ref<{ id: number; softwareName: string; version: string | null } | null>(null);

const showDeleteSoftwareConfirm = ref(false);
const deleteSoftwareTarget = ref<{ id: number; name: string } | null>(null);

const searchQuery = ref('');
const sortOrder = ref<'asc' | 'desc'>('asc');
const page = ref(1);
const itemsPerPage = ref(6);

// ----------------------
// Grouped software
// ----------------------
const groupedSoftware = computed(() => {
  const filtered = softwareStore.softwareVersions.filter(
    (sv) => sv.software.type === 'acquisition' || sv.software.type === 'acquisition and analysis'
  );

  const map = new Map<number, { software: any; versions: any[] }>();
  filtered.forEach((sv) => {
    if (!map.has(sv.software.id)) map.set(sv.software.id, { software: sv.software, versions: [] });
    map.get(sv.software.id)!.versions.push(sv);
  });

  const searchLower = searchQuery.value.toLowerCase();
  const results = Array.from(map.values()).filter((g) =>
    g.software.name.toLowerCase().includes(searchLower)
  );

  return results.sort((a, b) =>
    sortOrder.value === 'asc'
      ? a.software.name.localeCompare(b.software.name)
      : b.software.name.localeCompare(a.software.name)
  );
});

const paginatedGroups = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return groupedSoftware.value.slice(start, start + itemsPerPage.value);
});

// ----------------------
// Handlers
// ----------------------
function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
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

function onDeleteSoftware(softwareId: number, name: string) {
  deleteSoftwareTarget.value = { id: softwareId, name };
  showDeleteSoftwareConfirm.value = true;
}

async function confirmDeleteSoftware() {
  if (!deleteSoftwareTarget.value) return;
  await softwareStore.deleteSoftware(deleteSoftwareTarget.value.id);
  await softwareStore.fetchAllSoftware();
  await softwareStore.fetchAllSoftwareVersions();
  showDeleteSoftwareConfirm.value = false;
  deleteSoftwareTarget.value = null;
}

function onSoftwareSaved() {
  showEditModal.value = false;
  softwareStore.fetchAllSoftware();
  softwareStore.fetchAllSoftwareVersions();
}

async function onVersionCreated() {
  showSoftwareVersionModal.value = false;
  editSoftwareVersionId.value = null;
  await softwareStore.fetchAllSoftwareVersions();
}

function toggleFavorite(softwareId: number) {
  favoriteStore.toggleFavorite('software', softwareId);
}

onMounted(async () => {
  await softwareStore.fetchAllSoftware();
  await softwareStore.fetchAllSoftwareVersions();
});
</script>

<template>
  <div>
    <v-card-title class="d-flex align-center font-weight-bold">
      <span>Software</span>
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
        class="ms-2"
        :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
      />
    </v-card-title>

    <v-row dense v-if="paginatedGroups.length">
      <v-col v-for="group in paginatedGroups" :key="group.software.id" cols="12" sm="6" md="4">
        <v-card class="software-card" outlined>
          <v-card-title class="d-flex justify-space-between align-center pa-2">
            <div class="d-flex align-center gap-2">
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
              <span>{{ group.software.name }}</span>
            </div>

            <div class="d-flex align-center gap-1" v-if="group.software.created_by === id_user">
              <v-icon
                size="20"
                color="primary"
                class="hover-icon"
                @click.stop="onEditSoftware(group.software.id)"
                >mdi-pencil</v-icon
              >
              <v-icon
                size="20"
                color="primary"
                class="hover-icon"
                @click.stop="onDeleteSoftware(group.software.id, group.software.name)"
                >mdi-delete</v-icon
              >
            </div>
          </v-card-title>

          <v-card-text>
            <v-autocomplete
              :items="group.versions"
              item-title="version"
              item-value="id"
              label="Versions"
              density="compact"
              variant="outlined"
              clearable
            />
          </v-card-text>

          <v-card-actions class="justify-between align-center">
            <v-btn
              size="small"
              color="primary"
              variant="text"
              @click.stop="onCreateVersion(group.software.id)"
            >
              <v-icon start>mdi-plus</v-icon>
              Add Version
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-else type="info" variant="tonal" class="mt-4">No software found</v-alert>

    <v-pagination
      v-if="groupedSoftware.length > itemsPerPage"
      v-model="page"
      :length="Math.ceil(groupedSoftware.length / itemsPerPage)"
      class="mt-4"
      total-visible="5"
    />

    <v-card-actions class="justify-start mt-6">
      <v-btn color="primary" variant="flat" @click="onAddSoftware">
        <v-icon start>mdi-plus</v-icon>
        Add Software
      </v-btn>
    </v-card-actions>

    <!-- Modals -->
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

    <!-- Delete confirmations -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Confirm deletion</v-card-title>
        <v-card-text>
          Are you sure you want to delete
          <strong>version {{ deleteTarget?.version || '' }}</strong> of
          <strong>{{ deleteTarget?.softwareName }}</strong
          >?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDeleteSoftwareConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Confirm software deletion</v-card-title>
        <v-card-text>
          Are you sure you want to delete the software
          <strong>{{ deleteSoftwareTarget?.name }}</strong
          >?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showDeleteSoftwareConfirm = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmDeleteSoftware">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.software-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 220px;
}

.favorite-btn {
  margin-right: 6px;
  transition: transform 0.2s ease;
}
.favorite-btn:hover {
  transform: scale(1.1);
}

.hover-icon:hover {
  color: #000 !important;
  transform: scale(1.1);
  transition:
    transform 0.2s,
    color 0.2s;
}
</style>
