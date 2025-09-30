<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { type AnimalProfile, useAnimalProfileStore } from '@/stores/animalProfile';
import { useFavoriteStore } from '@/stores/favorite';
import { useSpeciesStore } from '@/stores/species';
import { useStrainStore } from '@/stores/strain';
import CreateAnimalProfileModal from '@/components/modals/CreateAnimalProfileModal.vue';

const props = defineProps<{
  modelValue: boolean;
  selectedAnimalProfiles: AnimalProfile[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:selectedAnimalProfiles', value: AnimalProfile[]): void;
}>();

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

const profiles = computed(() => animalProfileStore.animalProfiles);

// ----------------------------
// Filters
// ----------------------------
const searchQuery = ref('');
const selectedSpecies = ref<number | null>(null);
const selectedStrain = ref<number | null>(null);
const selectedSex = ref<string | null>(null);
const selectedStatus = ref<string | null>(null);

const filteredProfiles = computed(() => {
  return profiles.value.filter((p) => {
    const matchSearch =
      debouncedSearchQuery.value === '' ||
      p.name.toLowerCase().includes(debouncedSearchQuery.value.toLowerCase());

    const matchSpecies = !selectedSpecies.value || p.strain?.species?.id === selectedSpecies.value;
    const matchStrain = !selectedStrain.value || p.strain?.id === selectedStrain.value;
    const matchSex = !selectedSex.value || p.sex === selectedSex.value;
    const matchStatus = !selectedStatus.value || p.status === selectedStatus.value;

    return matchSearch && matchSpecies && matchStrain && matchSex && matchStatus;
  });
});

// --- searchQuery ---
const debouncedSearchQuery = ref(searchQuery.value);

let debounceTimeout: number | null = null;

watch(searchQuery, (newVal) => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = window.setTimeout(() => {
    debouncedSearchQuery.value = newVal;
  }, 300);
});

watch([searchQuery, selectedSpecies, selectedStrain, selectedSex, selectedStatus], () => {
  currentPage.value = 1;
});
// ----------------------------
// Load profiles if empty
// ----------------------------
onMounted(async () => {
  if (animalProfileStore.isEmpty()) {
    try {
      await animalProfileStore.fetchAnimalProfiles();
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to fetch animal profiles', 'error');
    }
  }
  // Load favorites, species and strains if empty
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
  if (strainStore.isEmpty()) {
    await strainStore
      .fetchStrains()
      .catch((err: any) => showSnackbar(err.message || 'Failed to fetch strains', 'error'));
  }
});

// -------------------------
//Snackbar
const snackbar = ref(false);
const snackbarColor = ref('success');
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

function handleCreatedOrUpdated(profile: any) {
  const index = animalProfileStore.animalProfiles.findIndex((p) => p.id === profile.id);

  if (index !== -1) {
    animalProfileStore.animalProfiles[index] = profile;
    showSnackbar('Profile updated successfully!', 'success');
  } else {
    animalProfileStore.animalProfiles.push(profile);
    if (!props.selectedAnimalProfiles.some((p) => p.id === profile.id)) {
      emit('update:selectedAnimalProfiles', [...props.selectedAnimalProfiles, profile]);
    }

    showSnackbar('Profile created successfully!', 'success');
  }

  profileToEdit.value = null;
}

// ----------------------------
// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;
const totalPages = computed(() => Math.ceil(filteredProfiles.value.length / itemsPerPage));

const paginatedProfiles = computed(() =>
  filteredProfiles.value.slice(
    (currentPage.value - 1) * itemsPerPage,
    currentPage.value * itemsPerPage
  )
);

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

const isTruncated = (name: string) => {
  return name.length > maxNameLength;
};
</script>

<template>
  <v-dialog v-model="localDialog" max-width="1600px">
    <v-card class="pa-3" min-height="850px" overflow-y="auto">
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
          <v-col cols="2" class="d-flex justify-center"
            ><v-select
              v-model="selectedStrain"
              :items="strainStore.strains"
              item-title="name"
              item-value="id"
              clearable
              density="comfortable"
              label="Strain"
              class="match-search-height select-column"
          /></v-col>
          <v-col cols="1" class="d-flex justify-center"
            ><v-select
              v-model="selectedSex"
              :items="['male', 'female']"
              clearable
              density="comfortable"
              label="Sex"
              style="min-width: 160px"
          /></v-col>
          <v-col cols="2" class="d-flex justify-center">Genotype</v-col>
          <v-col cols="2" class="d-flex justify-center">Treatment</v-col>
          <v-col cols="1" class="d-flex justify-center"
            ><v-select
              v-model="selectedStatus"
              :items="['draft', 'waiting for validation', 'validated']"
              clearable
              density="comfortable"
              label="Status"
              class="select-column"
          /></v-col>
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

                <!-- Strain -->
                <v-col cols="2" class="d-flex justify-center align-center">
                  {{ profile.strain?.name || '-' }}
                </v-col>

                <!-- Sex -->
                <v-col cols="1" class="d-flex justify-center align-center">
                  {{ profile.sex || '-' }}
                </v-col>

                <!-- Genotype -->
                <v-col cols="2" class="d-flex justify-center align-center">
                  {{ profile.genotype || '-' }}
                </v-col>

                <!-- Treatment -->
                <v-col cols="2" class="d-flex justify-center align-center">
                  {{ profile.treatment || '-' }}
                </v-col>

                <!-- Status -->
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

                <!-- Actions -->
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

.pagination-row {
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
</style>
