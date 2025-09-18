<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAnimalProfileStore } from '@/stores/animalProfile';
import { useFavoriteStore } from '@/stores/favorite';
import CreateAnimalProfileModal from '@/components/modals/CreateAnimalProfileModal.vue';

const props = defineProps<{
  modelValue: boolean;
  selectedAnimalProfiles: number[]; // IDs
  allAnimalProfiles: {
    id: number;
    name: string;
    strain?: { name: string; [key: string]: any } | null;
    sex?: string;
    genotype?: string;
    treatment?: string;
  }[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:selectedAnimalProfiles', value: number[]): void;
}>();

const animalProfileStore = useAnimalProfileStore();
const favoriteStore = useFavoriteStore();
const showCreateModal = ref(false);

// ----------------------------
// Dialog
// ----------------------------
const localDialog = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});

// ----------------------------
// Profils
// ----------------------------
const profiles = computed(() => props.allAnimalProfiles);

// ----------------------------
// Sélection locale (IDs)
const localSelectedIds = ref([...props.selectedAnimalProfiles]);

watch(
  () => props.selectedAnimalProfiles,
  async (newVal) => {
    if (favoriteStore.isEmpty()) {
      try {
        await favoriteStore.fetchAllFavorites();
      } catch (err: any) {
        showError(err.message || 'Failed to fetch favorites');
      }
    }
    const same =
      newVal.length === localSelectedIds.value.length &&
      newVal.every((id) => localSelectedIds.value.includes(id));
    if (!same) localSelectedIds.value = [...newVal];
  },
  { immediate: true }
);

watch(localSelectedIds, (newVal) => {
  const same =
    newVal.length === props.selectedAnimalProfiles.length &&
    newVal.every((id) => props.selectedAnimalProfiles.includes(id));
  if (!same) {
    console.log('[Modal] Selected IDs updated:', newVal);
    emit('update:selectedAnimalProfiles', [...newVal]);
  }
});

// ----------------------------
// Favoris
function isFavorite(id: number) {
  return favoriteStore.isFavorite('animalprofile', id);
}
function toggleFavorite(id: number) {
  favoriteStore.toggleFavorite('animalprofile', id);
}

// ----------------------------
// Création profil
function handleCreated(newProfile: { id: number; name: string }) {
  const fullProfile = {
    id: newProfile.id,
    name: newProfile.name,
    description: '',
    strain: null,
    sex: '',
    genotype: '',
    treatment: '',
  };
  animalProfileStore.animalProfiles.push(fullProfile);

  if (!localSelectedIds.value.includes(newProfile.id)) {
    localSelectedIds.value.push(newProfile.id);
  }
}

// ----------------------------
// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;
const totalPages = computed(() => Math.ceil(profiles.value.length / itemsPerPage));
const paginatedProfiles = computed(() =>
  profiles.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage)
);

// ----------------------------
// Toggle sélection d’un profil
function toggleProfile(id: number) {
  const index = localSelectedIds.value.indexOf(id);
  if (index === -1) {
    localSelectedIds.value.push(id);
  } else {
    localSelectedIds.value.splice(index, 1);
  }
  console.log('[Modal] Toggled profile ID:', id);
}
</script>

<template>
  <v-dialog v-model="localDialog" max-width="1300">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Animal Profiles</span>
        <v-btn color="primary" @click="showCreateModal = true">
          <v-icon start>mdi-plus</v-icon> Create
        </v-btn>
      </v-card-title>

      <v-card-text>
        <!-- Header -->
        <v-row class="font-weight-bold mb-2">
          <v-col cols="4">Name</v-col>
          <v-col cols="2">Strain</v-col>
          <v-col cols="1">Sex</v-col>
          <v-col cols="2">Genotype</v-col>
          <v-col cols="2">Treatment</v-col>
        </v-row>

        <!-- Liste avec checkbox + favoris -->
        <v-list dense>
          <v-list-item
            v-for="profile in paginatedProfiles"
            :key="profile.id"
            class="align-center"
            @click="toggleProfile(profile.id)"
          >
            <v-row class="align-center" style="width: 100%">
              <v-col cols="4" class="d-flex align-center">
                <!-- Checkbox -->
                <v-checkbox
                  v-model="localSelectedIds"
                  :value="profile.id"
                  hide-details
                  density="compact"
                  @click.stop
                />

                <!-- Favori -->
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  class="ml-1"
                  @click.stop="toggleFavorite(profile.id)"
                >
                  <v-icon :color="isFavorite(profile.id) ? 'yellow' : 'grey'">
                    {{ isFavorite(profile.id) ? 'mdi-star' : 'mdi-star-outline' }}
                  </v-icon>
                </v-btn>

                <!-- Nom -->
                <span class="ml-2">{{ profile.name }}</span>
              </v-col>

              <v-col cols="2">{{ profile.strain?.name || '-' }}</v-col>
              <v-col cols="1">{{ profile.sex || '-' }}</v-col>
              <v-col cols="2">{{ profile.genotype || '-' }}</v-col>
              <v-col cols="2">{{ profile.treatment || '-' }}</v-col>
            </v-row>
          </v-list-item>
        </v-list>

        <!-- Pagination -->
        <v-row class="mt-2" align="center" justify="center">
          <v-btn text :disabled="currentPage === 1" @click="currentPage--"> Prev </v-btn>
          <span class="mx-3">{{ currentPage }} / {{ totalPages }}</span>
          <v-btn text :disabled="currentPage === totalPages" @click="currentPage++"> Next </v-btn>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="localDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>

    <CreateAnimalProfileModal v-model:show="showCreateModal" @created="handleCreated" />
  </v-dialog>
</template>
