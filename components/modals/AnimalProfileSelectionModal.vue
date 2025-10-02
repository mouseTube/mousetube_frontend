<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { debounce } from 'lodash';
import { type AnimalProfile, useAnimalProfileStore } from '@/stores/animalProfile';
import { useFavoriteStore } from '@/stores/favorite';
import { useSpeciesStore } from '@/stores/species';
import { type Strain, useStrainStore } from '@/stores/strain';
import CreateAnimalProfileModal from '@/components/modals/CreateAnimalProfileModal.vue';

const props = defineProps<{
  modelValue: boolean;
  selectedAnimalProfiles: AnimalProfile[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:selectedAnimalProfiles', value: AnimalProfile[]): void;
}>();

// Stores
const animalProfileStore = useAnimalProfileStore();
const favoriteStore = useFavoriteStore();
const speciesStore = useSpeciesStore();
const strainStore = useStrainStore();

const showCreateModal = ref(false);
const profileToEdit = ref<any>(null);

const localDialog = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});

// ----------------------------
// Filters
// ----------------------------
const searchQuery = ref('');
const selectedSpecies = ref<number | null>(null);
const selectedStrain = ref<number | null>(null);
const selectedSex = ref<string | null>(null);
const selectedStatus = ref<string | null>(null);

const debouncedSearchQuery = ref(searchQuery.value);
let debounceTimeout: number | null = null;
watch(searchQuery, (newVal) => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = window.setTimeout(() => {
    debouncedSearchQuery.value = newVal;
  }, 300);
});

// ----------------------------
// Pagination + Profiles
// ----------------------------
const currentPage = ref(1);
const itemsPerPage = 10;
const totalCount = ref(0);
const paginatedProfiles = ref<AnimalProfile[]>([]);

async function loadProfiles() {
  try {
    const filters: Record<string, any> = {};
    if (debouncedSearchQuery.value) filters.search = debouncedSearchQuery.value;
    if (selectedSpecies.value) filters.species = selectedSpecies.value;
    if (selectedStrain.value) filters.strain = selectedStrain.value;
    if (selectedSex.value) filters.sex = selectedSex.value;
    if (selectedStatus.value) filters.status = selectedStatus.value;

    const data = await animalProfileStore.fetchAnimalProfilesPage(currentPage.value, filters);
    paginatedProfiles.value = data.results;
    totalCount.value = data.count;
  } catch (err: any) {
    showSnackbar(err.message || 'Failed to fetch animal profiles', 'error');
  }
}

const totalPages = computed(() => Math.ceil(totalCount.value / itemsPerPage));

watch([debouncedSearchQuery, selectedSpecies, selectedStrain, selectedSex, selectedStatus], () => {
  currentPage.value = 1;
  loadProfiles();
});

watch(currentPage, () => {
  loadProfiles();
});

onMounted(async () => {
  await loadProfiles();

  if (favoriteStore.isEmpty()) {
    try {
      await favoriteStore.fetchAllFavorites();
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to fetch favorites', 'error');
    }
  }
  if (speciesStore.isEmpty()) {
    try {
      await speciesStore.fetchSpecies();
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to fetch species', 'error');
    }
  }
  loadStrains();
});

// -------------------------
// Snackbar
const snackbar = ref(false);
const snackbarColor = ref<'success' | 'error'>('success');
const snackbarText = ref('');

function showSnackbar(message: string, color: 'success' | 'error') {
  snackbarText.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

// ----------------------------
// Favoris
function isFavorite(id: number) {
  return favoriteStore.isFavorite('animalprofile', id);
}
function toggleFavorite(id: number) {
  favoriteStore.toggleFavorite('animalprofile', id);
}

// ----------------------------
// CRUD
function handleCreatedOrUpdated(profile: any) {
  const index = paginatedProfiles.value.findIndex((p) => p.id === profile.id);

  if (index !== -1) {
    paginatedProfiles.value[index] = profile;
    showSnackbar('Profile updated successfully!', 'success');
  } else {
    paginatedProfiles.value.unshift(profile);
    if (!props.selectedAnimalProfiles.some((p) => p.id === profile.id)) {
      emit('update:selectedAnimalProfiles', [...props.selectedAnimalProfiles, profile]);
    }
    showSnackbar('Profile created successfully!', 'success');
  }
  profileToEdit.value = null;
}

function isSelected(profile: AnimalProfile) {
  return props.selectedAnimalProfiles.some((p) => p.id === profile.id);
}

function toggleProfile(profile: AnimalProfile) {
  let newSelection: AnimalProfile[];
  if (!isSelected(profile)) {
    newSelection = [...props.selectedAnimalProfiles, profile];
  } else {
    newSelection = props.selectedAnimalProfiles.filter((p) => p.id !== profile.id);
  }
  emit('update:selectedAnimalProfiles', newSelection);
}

const showConfirmDelete = ref(false);
const profilePendingDelete = ref<any>(null);

function handleDelete(profile: any) {
  if (profile.status !== 'draft') return;
  profilePendingDelete.value = profile;
  showConfirmDelete.value = true;
}

async function confirmDelete() {
  if (!profilePendingDelete.value) return;
  try {
    await animalProfileStore.deleteAnimalProfile(profilePendingDelete.value.id);
    emit(
      'update:selectedAnimalProfiles',
      props.selectedAnimalProfiles.filter((p) => p.id !== profilePendingDelete.value.id)
    );
    showSnackbar('Profile deleted successfully!', 'success');
    await loadProfiles();
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete profile:', err);
    showSnackbar(err.message || 'Failed to delete profile', 'error');
  } finally {
    showConfirmDelete.value = false;
    profilePendingDelete.value = null;
  }
}

function handleEdit(profile: any) {
  if (profile.status !== 'draft') return;
  profileToEdit.value = profile;
  showCreateModal.value = true;
}

const maxNameLength = 32;
const isTruncated = (name: string) => name.length > maxNameLength;

// ----------------------------
// Infinite scroll Strains
// ----------------------------
const strains = ref<Strain[]>([]);
const searchInput = ref('');
const page = ref(1);
const strainsPerPage = 10;
const strainsTotal = ref(0);
const strainsLoading = ref(false);

async function loadStrains(reset = false) {
  if (strainsLoading.value) return;
  strainsLoading.value = true;

  if (reset) {
    page.value = 1;
    strains.value = [];
  }

  try {
    const res = await strainStore.fetchStrainsByPage({
      page: page.value,
      page_size: strainsPerPage,
      search: searchInput.value || undefined,
    });

    strains.value = reset ? res.results : [...strains.value, ...res.results];
    strainsTotal.value = res.count;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  } finally {
    strainsLoading.value = false;
  }
}

const onSearch = debounce((val: string) => {
  searchInput.value = val;
  loadStrains(true);
}, 300);

function loadMoreStrains() {
  if (strainsLoading.value) return;
  if (strains.value.length < strainsTotal.value) {
    page.value += 1;
    loadStrains();
  }
}
</script>

<template>
  <v-dialog v-model="localDialog" max-width="1600px">
    <v-card class="pa-3" style="max-height: 80vh; overflow-y: auto">
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h6 font-weight-bold">Animal Profiles</span>
        <div class="d-flex align-center" style="gap: 12px">
          <v-select
            v-model="selectedSpecies"
            :items="speciesStore.species"
            item-title="name"
            item-value="id"
            density="comfortable"
            clearable
            label="Species"
            style="min-width: 150px; max-width: 250px"
            class="match-search-height"
          />
          <v-text-field
            v-model="searchQuery"
            clearable
            label="Search"
            prepend-inner-icon="mdi-magnify"
            density="comfortable"
            style="min-width: 250px; max-width: 300px"
            class="match-search-height"
          />
        </div>
      </v-card-title>

      <v-card-text class="scrollable-content">
        <!-- Header -->
        <v-row class="font-weight-bold">
          <v-col cols="3" class="d-flex justify-center">Name</v-col>
          <v-col cols="2" class="d-flex justify-center">
            <v-autocomplete
              v-model="selectedStrain"
              :items="strains"
              item-title="name"
              item-value="id"
              clearable
              density="comfortable"
              label="Strain"
              :loading="strainsLoading"
              hide-selected
              :return-object="false"
              :auto-select-first="false"
              @update:search-input="onSearch"
              style="min-width: 140px; max-width: 180px"
            >
              <template v-slot:append-item>
                <div
                  v-if="strains.length > 0"
                  v-intersect="loadMoreStrains"
                  class="text-center pa-2"
                >
                  <v-progress-circular
                    v-if="strainsLoading"
                    indeterminate
                    size="20"
                    color="primary"
                  />
                </div>
              </template>
            </v-autocomplete>
          </v-col>
          <v-col cols="1" class="d-flex justify-center">
            <v-select
              v-model="selectedSex"
              :items="['male', 'female']"
              clearable
              density="comfortable"
              label="Sex"
              style="min-width: 120px; max-width: 150px"
            />
          </v-col>
          <v-col cols="2" class="d-flex justify-center">Genotype</v-col>
          <v-col cols="2" class="d-flex justify-center">Treatment</v-col>
          <v-col cols="1" class="d-flex justify-center">
            <v-select
              v-model="selectedStatus"
              :items="['draft', 'waiting_validation', 'validated']"
              clearable
              density="comfortable"
              label="Status"
              class="select-column"
            />
          </v-col>
          <v-col cols="1" class="d-flex justify-center">Actions</v-col>
        </v-row>

        <!-- Liste -->
        <v-list dense>
          <template v-for="profile in paginatedProfiles" :key="profile.id">
            <v-divider />
            <v-list-item class="align-center fixed-row" @click="toggleProfile(profile)">
              <v-row class="align-center" style="width: 100%" no-gutters>
                <!-- Name + Checkbox + Favorite -->
                <v-col cols="3" class="d-flex align-center">
                  <v-checkbox
                    :model-value="isSelected(profile)"
                    hide-details
                    density="compact"
                    @click.stop="toggleProfile(profile)"
                    class="me-1"
                  />
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    class="me-1"
                    @click.stop="toggleFavorite(profile.id)"
                  >
                    <v-icon :color="isFavorite(profile.id) ? 'yellow' : 'grey'">
                      {{ isFavorite(profile.id) ? 'mdi-star' : 'mdi-star-outline' }}
                    </v-icon>
                  </v-btn>
                  <span class="truncate-name">{{ profile.name }}</span>
                  <v-tooltip v-if="isTruncated(profile.name)" activator="parent" location="top">
                    {{ profile.name }}
                  </v-tooltip>
                </v-col>

                <v-col cols="2" class="d-flex justify-center align-center">
                  {{ profile.strain?.name || '-' }}
                </v-col>

                <v-col cols="1" class="d-flex justify-center align-center">
                  {{ profile.sex || '-' }}
                </v-col>

                <v-col cols="2" class="d-flex justify-center align-center">
                  {{ profile.genotype || '-' }}
                </v-col>

                <v-col cols="2" class="d-flex justify-center align-center">
                  {{ profile.treatment || '-' }}
                </v-col>

                <v-col cols="1" class="d-flex justify-center align-center">
                  <v-chip
                    size="small"
                    :color="
                      profile.status === 'draft'
                        ? 'grey'
                        : profile.status === 'validated'
                          ? 'green'
                          : 'blue'
                    "
                    text-color="white"
                  >
                    {{ profile.status }}
                  </v-chip>
                </v-col>

                <v-col cols="1" class="d-flex justify-center align-center">
                  <template v-if="profile.status === 'draft'">
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      color="red"
                      @click.stop="handleEdit(profile)"
                      class="me-1"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      color="red"
                      @click.stop="handleDelete(profile)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                </v-col>
              </v-row>
            </v-list-item>
          </template>
        </v-list>

        <!-- Pagination -->
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          class="mt-2"
          color="primary"
        />
      </v-card-text>
      <v-card-actions class="justify-space-between">
        <v-btn
          color="primary"
          variant="flat"
          @click="
            profileToEdit = null;
            showCreateModal = true;
          "
        >
          <v-icon start>mdi-plus</v-icon>
          Create
        </v-btn>

        <div>
          <v-btn color="primary" variant="flat" @click="localDialog = false"> Close </v-btn>
        </div>
      </v-card-actions>
    </v-card>

    <CreateAnimalProfileModal
      v-model="showCreateModal"
      :profileToEdit="profileToEdit"
      @created="handleCreatedOrUpdated"
      @updated="handleCreatedOrUpdated"
    />

    <v-dialog v-model="showConfirmDelete" max-width="400">
      <v-card>
        <v-card-title>Confirm Deletion</v-card-title>
        <v-card-text>
          Are you sure you want to delete <b>{{ profilePendingDelete?.name }}</b> ?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showConfirmDelete = false">Cancel</v-btn>
          <v-btn color="red" text @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>

  <!-- Snackbar -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
    {{ snackbarText }}
  </v-snackbar>
</template>

<style scoped>
.fixed-dialog {
  min-height: 850px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.scrollable-content {
  flex: 1;
  overflow-y: auto;
}
.fixed-row {
  min-height: 50px;
}
.truncate-name {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}
.match-search-height .v-field {
  min-height: 40px !important;
  height: 40px !important;
}
.v-select .v-field__input {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.select-column {
  max-width: 160px;
  min-width: 140px;
  width: 100%;
}
.fixed-row > .v-row {
  margin: 0;
  padding-top: 2px;
  padding-bottom: 2px;
}
.scrollable-content {
  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

.v-card-actions {
  position: sticky;
  bottom: 0;
  background: white;
  z-index: 1;
  padding: 12px;
}
</style>
