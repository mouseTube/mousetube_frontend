<script setup lang="ts">
////////////////////////////////
// IMPORT
////////////////////////////////

import { ref, onMounted } from 'vue';
import { useAnimalProfileStore } from '@/stores/animalProfile';
import CreateAnimalProfileModal from '@/components/modals/CreateAnimalProfileModal.vue';

////////////////////////////////
// DATA
////////////////////////////////

const animalProfileStore = useAnimalProfileStore();
const animalProfileOptions = ref<{ id: number; name: string }[]>([]);
const formData = ref({
  animal_profiles: [] as number[],
});

const showCreateModal = ref(false);
const snackbar = ref(false);
const snackbarText = ref('');

async function fetchAnimalProfiles() {
  animalProfileOptions.value = await animalProfileStore.fetchAnimalProfiles();
}

////////////////////////////////
// METHODS
////////////////////////////////

function handleCreated(newAnimalProfile: { id: number; name: string }) {
  animalProfileOptions.value.push({
    id: newAnimalProfile.id,
    name: newAnimalProfile.name,
  });
  formData.value.animal_profiles.push(newAnimalProfile.id);
  snackbarText.value = 'Animal profile created successfully.';
  snackbar.value = true;
}

function handleSubmit() {
  console.log('Animal profiles IDs:', formData.value.animal_profiles);
  snackbarText.value = 'Animal profiles saved.';
  snackbar.value = true;
}

////////////////////////////////
// ON MOUNT
////////////////////////////////

onMounted(fetchAnimalProfiles);
</script>

<template>
  <v-container>
    <v-card class="pa-6" outlined>
      <v-card-title class="d-flex justify-space-between align-center mb-4">
        <h3>Animal Profiles</h3>
        <div>
          <v-btn color="primary" @click="handleSubmit">Save</v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <v-select
          v-model="formData.animal_profiles"
          :items="animalProfileOptions"
          item-title="name"
          item-value="id"
          label="Animal Profiles"
          multiple
          chips
          clearable
          outlined
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="showCreateModal = true">Create New Profile</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Modale de création -->
    <CreateAnimalProfileModal v-model="showCreateModal" @created="handleCreated" />

    <!-- Snackbar feedback -->
    <v-snackbar v-model="snackbar" :timeout="3000" location="top right">
      {{ snackbarText }}
      <template #actions>
        <v-btn icon @click="snackbar = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
