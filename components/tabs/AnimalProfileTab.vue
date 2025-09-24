<script setup lang="ts">
import { ref, watch } from 'vue';
import { type RecordingSessionPayload, useRecordingSessionStore } from '@/stores/recordingSession';
import { useAnimalProfileStore } from '@/stores/animalProfile';
import AnimalProfileSelectionModal from '@/components/modals/AnimalProfileSelectionModal.vue';

const props = defineProps<{
  selectedRecordingSessionId: number | null;
}>();

const recordingSessionStore = useRecordingSessionStore();
const animalProfileStore = useAnimalProfileStore();

const showSelectionModal = ref(false);
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');
const selectedAnimalProfiles = ref<any[]>([]);
const allAnimalProfiles = ref<
  {
    id: number;
    name: string;
    description: string;
    strain?: { name: string; [key: string]: any } | null;
    sex: string;
    genotype: string;
    treatment: string;
  }[]
>([]);

async function loadAllAnimalProfiles() {
  await animalProfileStore.fetchAnimalProfiles();
  allAnimalProfiles.value = animalProfileStore.animalProfiles;
}

async function loadAnimalProfilesFromSession(sessionId: number) {
  const session = await recordingSessionStore.getSessionById(sessionId);
  if (!session) return;

  selectedAnimalProfiles.value = session.animal_profiles || [];
}

function removeAnimalProfile(id: number) {
  selectedAnimalProfiles.value = selectedAnimalProfiles.value.filter((p) => p.id !== id);
}

// Clear all
function clearAnimalProfiles() {
  selectedAnimalProfiles.value = [];
}

async function updateAnimalProfiles() {
  if (props.selectedRecordingSessionId === null) return;

  try {
    const sessionId = props.selectedRecordingSessionId;
    await recordingSessionStore.updateSessionAnimalProfiles(
      sessionId,
      selectedAnimalProfiles.value.map((p) => p.id)
    );

    snackbarText.value = 'Animal profiles updated successfully.';
    snackbar.value = true;
    snackbarColor.value = 'success';
  } catch (err) {
    snackbarText.value = 'Failed to update animal profiles.';
    snackbar.value = true;
    snackbarColor.value = 'error';
  }
}

function onUpdateSelectedAnimalProfiles(ids: number[]) {
  selectedAnimalProfiles.value = ids.map((id) => {
    const profile = allAnimalProfiles.value.find((profile) => profile.id === id);
    return profile || { id, name: 'Unknown' };
  });
}

watch(
  () => props.selectedRecordingSessionId,
  async (newId) => {
    if (newId !== null) {
      await loadAllAnimalProfiles();
      await loadAnimalProfilesFromSession(newId);
    } else {
      selectedAnimalProfiles.value = [];
    }
  },
  { immediate: true }
);
</script>

<template>
  <v-container>
    <v-card outlined class="pa-6 mb-5">
      <v-card-title class="d-flex justify-space-between align-center mb-4">
        <h3>Animal Profiles</h3>
        <v-btn color="primary" @click="updateAnimalProfiles">Save</v-btn>
      </v-card-title>

      <v-card-text>
        <div class="chip-list d-flex flex-wrap align-center">
          <v-chip
            v-for="profile in selectedAnimalProfiles"
            :key="profile.id"
            variant="outlined"
            closable
            class="ma-1"
            @click:close="removeAnimalProfile(profile.id)"
          >
            {{ profile.name }}
          </v-chip>

          <v-chip
            v-if="selectedAnimalProfiles.length > 0"
            color="primary"
            variant="outlined"
            class="ma-1"
            @click="clearAnimalProfiles"
          >
            <v-icon start>mdi-close</v-icon> Clear All
          </v-chip>

          <v-chip color="primary" variant="flat" class="ma-1" @click="showSelectionModal = true">
            <v-icon start>mdi-plus</v-icon> Select
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <AnimalProfileSelectionModal
      v-model="showSelectionModal"
      :selectedAnimalProfiles="selectedAnimalProfiles.map((profile) => profile.id)"
      @update:selectedAnimalProfiles="onUpdateSelectedAnimalProfiles"
    />

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000" location="top right">
      {{ snackbarText }}
      <template #actions>
        <v-btn icon @click="snackbar = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
