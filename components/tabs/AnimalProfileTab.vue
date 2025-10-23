<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { type AnimalProfile } from '@/stores/animalProfile';
import { useRecordingSessionStore } from '@/stores/recordingSession';
import AnimalProfileSelectionModal from '@/components/modals/AnimalProfileSelectionModal.vue';
import { cloneDeep } from 'lodash';

// ----------------------
// Props & Emits
// ----------------------
const props = defineProps<{
  selectedRecordingSessionId: number | null;
  selectedProtocolId?: number | null;
  onGoToFile?: () => void;
}>();

const emit = defineEmits<{
  (e: 'animal-selected', payload: { animalProfileId: number | null }): void;
  (e: 'animal-saved', payload: { saved: boolean }): void;
  (e: 'animal-dirty', payload: { dirty: boolean }): void;
}>();

// ----------------------
// Stores & Refs
// ----------------------
const recordingSessionStore = useRecordingSessionStore();

const showSelectionModal = ref(false);
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');
const selectedAnimalProfiles = ref<AnimalProfile[]>([]);

const saved = ref(false);
const savedSnapshot = ref<number[]>([]);

const isDirty = computed(() => {
  const current = selectedAnimalProfiles.value.map((p) => p.id).sort();
  const snap = [...savedSnapshot.value].sort();
  return JSON.stringify(current) !== JSON.stringify(snap);
});

const currentSession = ref<any>(null);
const isPublished = computed(() => currentSession.value?.status === 'published');

// ----------------------
// Functions
// ----------------------
async function loadAnimalProfilesFromSession(sessionId: number) {
  const session = await recordingSessionStore.getSessionById(sessionId);
  if (!session) return;

  selectedAnimalProfiles.value = session.animal_profiles || [];
  savedSnapshot.value = selectedAnimalProfiles.value.map((p) => p.id);
  saved.value = selectedAnimalProfiles.value.length > 0;

  // Emit selection / saved status
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
  saved.value = false;
  emit('animal-dirty', { dirty: true });

  if (selectedAnimalProfiles.value.length === 0) {
    emit('animal-selected', { animalProfileId: null });
  } else {
    emit('animal-selected', { animalProfileId: selectedAnimalProfiles.value[0].id });
  }
}

function clearAnimalProfiles() {
  selectedAnimalProfiles.value = [];
  saved.value = false;
  emit('animal-dirty', { dirty: true });
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
    snackbarColor.value = 'success';
    snackbar.value = true;

    savedSnapshot.value = selectedAnimalProfiles.value.map((p) => p.id);
    saved.value = true;
    emit('animal-saved', { saved: true });
    emit('animal-dirty', { dirty: false });

    if (selectedAnimalProfiles.value.length > 0) {
      emit('animal-selected', { animalProfileId: selectedAnimalProfiles.value[0].id });
    }
  } catch (err) {
    snackbarText.value = 'Failed to update animal profiles.';
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

function onUpdateSelectedAnimalProfiles(profiles: AnimalProfile[]) {
  selectedAnimalProfiles.value = profiles;
  saved.value = false;
  emit('animal-dirty', { dirty: true });

  if (selectedAnimalProfiles.value.length > 0) {
    emit('animal-selected', { animalProfileId: selectedAnimalProfiles.value[0].id });
  }
}

// ----------------------
// Watchers
// ----------------------
watch(
  () => props.selectedRecordingSessionId,
  async (newId) => {
    if (newId !== null) {
      const session = await recordingSessionStore.getSessionById(newId);
      currentSession.value = session ? cloneDeep(session) : null;
      await loadAnimalProfilesFromSession(newId);
    } else {
      currentSession.value = null;
      selectedAnimalProfiles.value = [];
      saved.value = false;
      emit('animal-selected', { animalProfileId: null });
      emit('animal-saved', { saved: false });
    }
  },
  { immediate: true }
);

watch(
  () => recordingSessionStore.sessions,
  (newSessions) => {
    if (props.selectedRecordingSessionId === null) return;
    const updated = newSessions.find((s) => s.id === props.selectedRecordingSessionId);
    if (!updated) return;

    currentSession.value = cloneDeep(updated);
    loadAnimalProfilesFromSession(props.selectedRecordingSessionId);
  },
  { deep: true }
);
</script>

<template>
  <v-container>
    <v-card outlined class="pa-6 mb-5">
      <v-card-title class="d-flex justify-space-between align-center mb-4">
        <h3>Animal Profiles</h3>
        <v-btn color="primary" @click="updateAnimalProfiles" :disabled="isPublished || !isDirty">
          Save
        </v-btn>
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

    <v-btn
      color="primary"
      variant="text"
      class="mt-2"
      :disabled="
        !props.selectedRecordingSessionId ||
        !props.selectedProtocolId ||
        selectedAnimalProfiles.length === 0 ||
        !saved
      "
      @click="props.onGoToFile?.()"
    >
      Go to File
      <v-icon end>mdi-arrow-right</v-icon>
    </v-btn>

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
