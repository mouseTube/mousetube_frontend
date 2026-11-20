<script setup lang="ts">
import PickerFrame from '@/components/modals/PickerFrame.vue';
import { ref, computed, watch, onMounted } from 'vue';
import debounce from 'lodash-es/debounce';
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
const selectedAge = ref<string | null>(null);
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
    if (selectedAge.value) filters.age = selectedAge.value;

    const data = await animalProfileStore.fetchAnimalProfilesPage(currentPage.value, filters);
    paginatedProfiles.value = data.results;
    totalCount.value = data.count;
  } catch (err: any) {
    showSnackbar(err.message || 'Failed to fetch animal profiles', 'error');
  }
}

const totalPages = computed(() => Math.ceil(totalCount.value / itemsPerPage));

watch(
  [debouncedSearchQuery, selectedSpecies, selectedStrain, selectedSex, selectedAge, selectedStatus],
  () => {
    currentPage.value = 1;
    loadProfiles();
  }
);

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
async function handleCreatedOrUpdated(profile: AnimalProfile) {
  profileToEdit.value = null;
  showCreateModal.value = false;

  try {
    const isNew = !props.selectedAnimalProfiles.some((p) => p.id === profile.id);

    if (isNew) {
      const newSelection = [...props.selectedAnimalProfiles, profile];
      emit('update:selectedAnimalProfiles', newSelection);

      if (!paginatedProfiles.value.some((p) => p.id === profile.id)) {
        paginatedProfiles.value = [profile, ...paginatedProfiles.value];
        totalCount.value += 1;
      }
    } else {
      const index = paginatedProfiles.value.findIndex((p) => p.id === profile.id);
      if (index !== -1) paginatedProfiles.value[index] = profile;
    }

    showSnackbar(
      isNew ? 'Profile created successfully!' : 'Profile updated successfully!',
      'success'
    );

    // await loadProfiles();
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Failed to refresh profiles after creation/update:', err);
    showSnackbar(err.message || 'Failed to refresh profiles', 'error');
  }
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
  <v-dialog v-model="localDialog" max-width="1100px">
    <PickerFrame
      title="Select animal profiles"
      :subtitle="`${totalCount} available · ${selectedAnimalProfiles.length} selected`"
      icon="mdi-paw"
      :selected="selectedAnimalProfiles.length"
      @close="localDialog = false"
    >
      <template #toolbar>
        <div class="d-flex flex-wrap align-center ga-2 w-100">
          <v-text-field
            v-model="searchQuery"
            clearable
            placeholder="Search profiles..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            hide-details
            class="ap-filter ap-filter--search"
          />
          <v-select
            v-model="selectedSpecies"
            :items="speciesStore.species"
            item-title="name"
            item-value="id"
            density="comfortable"
            variant="outlined"
            hide-details
            clearable
            label="Species"
            class="ap-filter"
          />
          <v-autocomplete
            v-model="selectedStrain"
            :items="strains"
            item-title="name"
            item-value="id"
            clearable
            density="comfortable"
            variant="outlined"
            hide-details
            label="Strain"
            :loading="strainsLoading"
            hide-selected
            :return-object="false"
            :auto-select-first="false"
            class="ap-filter"
            @update:search-input="onSearch"
          >
            <template v-slot:append-item>
              <div v-if="strains.length > 0" v-intersect="loadMoreStrains" class="text-center pa-2">
                <v-progress-circular
                  v-if="strainsLoading"
                  indeterminate
                  size="20"
                  color="primary"
                />
              </div>
            </template>
          </v-autocomplete>
          <v-select
            v-model="selectedSex"
            :items="['male', 'female']"
            clearable
            density="comfortable"
            variant="outlined"
            hide-details
            label="Sex"
            class="ap-filter ap-filter--small"
          />
          <v-select
            v-model="selectedAge"
            :items="['pup', 'juvenile', 'adult']"
            clearable
            density="comfortable"
            variant="outlined"
            hide-details
            label="Age"
            class="ap-filter ap-filter--small"
          />
          <v-select
            v-model="selectedStatus"
            :items="['draft', 'waiting validation', 'validated']"
            clearable
            density="comfortable"
            variant="outlined"
            hide-details
            label="Status"
            class="ap-filter"
          />
        </div>
      </template>

      <div class="ap-table">
        <div class="ap-row ap-row--head" aria-hidden="true">
          <span>Name</span>
          <span>Strain</span>
          <span>Sex</span>
          <span>Age</span>
          <span>Genotype</span>
          <span>Treatment</span>
          <span>Status</span>
          <span />
        </div>

        <div v-if="paginatedProfiles.length === 0" class="text-center text-medium-emphasis pa-6">
          No data available
        </div>

        <div
          v-for="profile in paginatedProfiles"
          :key="profile.id"
          class="ap-row ap-row--item"
          :class="{ 'ap-row--selected': isSelected(profile) }"
          tabindex="0"
          role="checkbox"
          :aria-checked="isSelected(profile)"
          @click="toggleProfile(profile)"
          @keydown.enter.prevent="toggleProfile(profile)"
          @keydown.space.prevent="toggleProfile(profile)"
        >
          <span class="ap-name">
            <v-icon
              :icon="isSelected(profile) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline'"
              :color="isSelected(profile) ? 'primary' : 'grey'"
              size="22"
              class="me-1"
            />
            <v-btn
              variant="text"
              size="x-small"
              density="comfortable"
              :icon="isFavorite(profile.id) ? 'mdi-star' : 'mdi-star-outline'"
              :color="isFavorite(profile.id) ? 'warning' : 'grey'"
              title="Toggle favorite"
              aria-label="Toggle favorite"
              class="me-1"
              @click.stop="toggleFavorite(profile.id)"
            />
            <span class="truncate-name" :title="profile.name">{{ profile.name }}</span>
          </span>
          <span>{{ profile.strain?.name || '-' }}</span>
          <span>{{ profile.sex || '-' }}</span>
          <span>{{ profile.age || '-' }}</span>
          <span>{{ profile.genotype || '-' }}</span>
          <span>{{ profile.treatment || '-' }}</span>
          <span>
            <v-chip
              size="small"
              label
              :color="
                profile.status === 'draft'
                  ? 'grey'
                  : profile.status === 'validated'
                    ? 'green'
                    : 'blue'
              "
            >
              {{ profile.status }}
            </v-chip>
          </span>
          <span class="ap-tools">
            <template v-if="profile.status === 'draft'">
              <v-btn
                icon="mdi-pencil-outline"
                size="small"
                variant="text"
                color="grey-darken-1"
                aria-label="Edit profile"
                @click.stop="handleEdit(profile)"
              />
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="grey-darken-1"
                aria-label="Delete profile"
                @click.stop="handleDelete(profile)"
              />
            </template>
          </span>
        </div>
      </div>

      <v-pagination
        v-model="currentPage"
        :length="totalPages"
        :total-visible="7"
        class="mt-2"
        color="primary"
      />

      <template #actions>
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="
            profileToEdit = null;
            showCreateModal = true;
          "
        >
          Create a profile
        </v-btn>
      </template>
    </PickerFrame>

    <CreateAnimalProfileModal
      v-model="showCreateModal"
      :profile-to-edit="profileToEdit"
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
          <v-btn variant="text" @click="showConfirmDelete = false">Cancel</v-btn>
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
.ap-filter {
  flex: 1 1 150px;
  min-width: 140px;
  max-width: 220px;
}
.ap-filter--search {
  flex-basis: 220px;
  max-width: 280px;
}
.ap-filter--small {
  flex-basis: 110px;
  min-width: 100px;
}
.ap-table {
  overflow-x: auto;
}
.ap-row {
  display: grid;
  grid-template-columns: minmax(200px, 3fr) 1.6fr 0.8fr 0.9fr 1.4fr 1.2fr 1.4fr 84px;
  align-items: center;
  gap: 8px;
  min-width: 860px;
  padding: 6px 8px;
  font-size: 0.9rem;
}
.ap-row--head {
  color: #777;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #e4e4e4;
}
.ap-row--item {
  min-height: 52px;
  border-bottom: 1px solid #f0f0f0;
  border-left: 4px solid transparent;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.ap-row--item:hover {
  background: #fafafa;
}
.ap-row--item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
.ap-row--selected,
.ap-row--selected:hover {
  background: #fdf4f3;
  border-left-color: rgb(var(--v-theme-primary));
}
.ap-name {
  display: flex;
  align-items: center;
  min-width: 0;
}
.truncate-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ap-tools {
  display: flex;
  justify-content: flex-end;
}
</style>
