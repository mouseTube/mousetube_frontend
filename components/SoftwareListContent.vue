<script setup lang="ts">
import ReviewStatus from '@/components/ReviewStatus.vue';
import AccountListHeader from '@/components/AccountListHeader.vue';
import SortButtons, { type Sort } from '@/components/SortButtons.vue';
import { ref, computed, onMounted, watch } from 'vue';
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

const selectedVersionBySoftware = ref<Record<number, number | null>>({});

const searchQuery = ref('');
const sort = ref<Sort>({ key: 'name', dir: 'asc' });
const page = ref(1);
const itemsPerPage = ref(6);

// ----------------------
// Grouped software
// ----------------------
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
  const results = Array.from(map.values()).filter(
    (g) =>
      g.software.name.toLowerCase().includes(searchLower) &&
      (!status.value || g.software.status === status.value)
  );

  const sign = sort.value.dir === 'asc' ? 1 : -1;
  const edited = (g: { versions: any[]; software: any }) => g.software.modified_at ?? ''; // the software itself, not its versions
  return results.sort((a, b) =>
    sort.value.key === 'name'
      ? sign * a.software.name.localeCompare(b.software.name)
      : sign * edited(a).localeCompare(edited(b))
  );
});

const paginatedGroups = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value;
  return groupedSoftware.value.slice(start, start + itemsPerPage.value);
});

// ----------------------
// Handlers
// ----------------------
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
  const target = deleteTarget.value;
  if (!target) return;

  await softwareStore.deleteSoftwareVersion(target.id);
  await softwareStore.fetchAllSoftwareVersions();

  const softwareItem = softwareStore.softwareVersions.find(
    (sv) => sv.software.name === target.softwareName
  );
  const softwareId = softwareItem?.software.id;

  if (softwareId != null) {
    if (selectedVersionBySoftware.value[softwareId] === target.id) {
      selectedVersionBySoftware.value[softwareId] = null;
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
    <AccountListHeader
      title="My software"
      lead="Software you can pick in a recording. Add a version when you use a new one; edit or delete what you created."
      add-label="Add software"
      @add="onAddSoftware"
    >
      <v-text-field
        v-model="searchQuery"
        density="comfortable"
        variant="outlined"
        placeholder="Search software"
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

    <ul v-if="paginatedGroups.length" class="entry-list">
      <li
        v-for="group in paginatedGroups"
        :key="group.software.id"
        class="entry-row entry-row--versions"
      >
        <div class="entry-main">
          <div class="entry-name">
            <v-btn
              variant="text"
              size="small"
              density="comfortable"
              :icon="
                favoriteStore.isFavorite('software', group.software.id)
                  ? 'mdi-star'
                  : 'mdi-star-outline'
              "
              :color="favoriteStore.isFavorite('software', group.software.id) ? 'warning' : 'grey'"
              title="Toggle favorite"
              @click.stop="toggleFavorite(group.software.id)"
            />
            {{ group.software.name }}
          </div>
          <div class="entry-meta">
            {{
              [
                group.software.type
                  ? group.software.type.charAt(0).toUpperCase() + group.software.type.slice(1)
                  : '',
                group.software.made_by,
              ]
                .filter(Boolean)
                .join(' · ')
            }}
          </div>
          <div v-if="group.software.description" class="entry-help">
            {{ group.software.description }}
          </div>
        </div>

        <!-- versions of this software -->
        <div class="entry-side d-flex align-center ga-1">
          <v-autocomplete
            v-model="selectedVersionBySoftware[group.software.id]"
            :items="group.versions"
            item-title="version"
            item-value="id"
            label="Version"
            density="compact"
            variant="outlined"
            clearable
            hide-details
          />
          <v-btn
            icon="mdi-plus"
            variant="text"
            size="small"
            title="Add a version"
            @click.stop="onCreateVersion(group.software.id)"
          />
          <v-btn
            icon="mdi-pencil-outline"
            variant="text"
            size="small"
            title="Edit the version"
            :disabled="!selectedVersionBySoftware[group.software.id]"
            @click.stop="
              () => {
                const versionId = selectedVersionBySoftware[group.software.id];
                if (versionId != null) onEditVersion(versionId);
              }
            "
          />
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            title="Delete the version"
            :disabled="!selectedVersionBySoftware[group.software.id]"
            @click.stop="
              () => {
                const versionId = selectedVersionBySoftware[group.software.id];
                if (versionId != null) {
                  onDeleteVersion({
                    id: versionId,
                    softwareName: group.software.name,
                    version: group.versions.find((v) => v.id === versionId)?.version ?? null,
                  });
                }
              }
            "
          />
        </div>

        <ReviewStatus
          endpoint="software"
          :id="group.software.id"
          :status="group.software.status || 'draft'"
          compact
          @changed="group.software.status = $event"
        />

        <div class="entry-actions">
          <template v-if="group.software.created_by === id_user">
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              title="Edit software"
              @click.stop="onEditSoftware(group.software.id)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              title="Delete software"
              @click.stop="onDeleteSoftware(group.software.id, group.software.name)"
            />
          </template>
        </div>
      </li>
    </ul>

    <v-alert v-else type="info" variant="tonal" class="mt-4">No software found</v-alert>

    <v-pagination
      v-if="groupedSoftware.length > itemsPerPage"
      v-model="page"
      :length="Math.ceil(groupedSoftware.length / itemsPerPage)"
      class="mt-4"
      total-visible="5"
    />

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
