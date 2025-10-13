<script setup lang="ts">
import { ref, watch } from 'vue';
import { type AnimalProfile } from '@/stores/animalProfile';
import { useRecordingSessionStore } from '@/stores/recordingSession';
import AnimalProfileSelectionModal from '@/components/modals/AnimalProfileSelectionModal.vue';

// Props
const props = defineProps<{
  selectedRecordingSessionId: number | null;
}>();

// ✅ declare emit
const emit = defineEmits<{
  (e: 'animal-selected', payload: { animalProfileId: number | null }): void;
  (e: 'animal-saved', payload: { saved: boolean }): void;
}>();

const recordingSessionStore = useRecordingSessionStore();

const showSelectionModal = ref(false);
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');
const selectedAnimalProfiles = ref<AnimalProfile[]>([]);

const saved = ref(false);

async function loadAnimalProfilesFromSession(sessionId: number) {
  const session = await recordingSessionStore.getSessionById(sessionId);
  if (!session) return;

  selectedAnimalProfiles.value = session.animal_profiles || [];

  if (selectedAnimalProfiles.value.length > 0) {
    emit('animal-selected', { animalProfileId: selectedAnimalProfiles.value[0].id });
    emit('animal-saved', { saved: true });
  } else {
    emit('animal-selected', { animalProfileId: null });
    emit('animal-saved', { saved: false });
  }
}

function removeAnimalProfile(id: number) {
  selectedAnimalProfiles.value = selectedAnimalProfiles.value.filter((p) => p.id !== id);
  if (selectedAnimalProfiles.value.length === 0) {
    emit('animal-selected', { animalProfileId: null });
  }
}

// Clear all
function clearAnimalProfiles() {
  selectedAnimalProfiles.value = [];
  emit('animal-selected', { animalProfileId: null });
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

    saved.value = true;
    emit('animal-saved', { saved: true });

    if (selectedAnimalProfiles.value.length > 0) {
      emit('animal-selected', { animalProfileId: selectedAnimalProfiles.value[0].id });
    }
  } catch (err) {
    snackbarText.value = 'Failed to update animal profiles.';
    snackbar.value = true;
    snackbarColor.value = 'error';
  }
}

function onUpdateSelectedAnimalProfiles(profiles: AnimalProfile[]) {
  const current = [...selectedAnimalProfiles.value];

  profiles.forEach((profile) => {
    if (!current.some((p) => p.id === profile.id)) {
      current.push(profile);
    }
  });

  selectedAnimalProfiles.value = current;

  if (selectedAnimalProfiles.value.length > 0) {
    emit('animal-selected', { animalProfileId: selectedAnimalProfiles.value[0].id });
  }
}

const currentSession = ref<any>(null);

watch(
  () => props.selectedRecordingSessionId,
  async (newId) => {
    if (newId !== null) {
      currentSession.value = await recordingSessionStore.getSessionById(newId);
      await loadAnimalProfilesFromSession(newId);
    } else {
      currentSession.value = null;
      selectedAnimalProfiles.value = [];
      emit('animal-selected', { animalProfileId: null });
    }
  },
  { immediate: true }
);

const isPublished = computed(() => currentSession.value?.status === 'published');
</script>

<template>
  <v-container>
    <v-card outlined class="pa-6 mb-5">
      <v-card-title class="d-flex justify-space-between align-center mb-4">
        <h3>Animal Profiles</h3>
        <v-btn color="primary" @click="updateAnimalProfiles" :disabled="isPublished">Save</v-btn>
      </v-card-title>

      <v-card-text>
        <div class="chip-list d-flex flex-wrap align-center">
          <v-chip
            v-for="profile in selectedAnimalProfiles"
            :key="profile.id"
            variant="outlined"
            class="ma-1"
            :closable="!isPublished"
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
            :disabled="isPublished"
          >
            <v-icon start>mdi-close</v-icon> Clear All
          </v-chip>

          <v-chip
            color="primary"
            variant="flat"
            class="ma-1"
            @click="showSelectionModal = true"
            :disabled="isPublished"
          >
            <v-icon start>mdi-plus</v-icon> Select
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <AnimalProfileSelectionModal
      v-model="showSelectionModal"
      :selectedAnimalProfiles="selectedAnimalProfiles"
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
