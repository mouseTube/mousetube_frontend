<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { AnimalProfile } from '@/stores/animalProfile';
import { useRecordingSessionStore } from '@/stores/recordingSession';
import AnimalProfileSelectionModal from '@/components/modals/AnimalProfileSelectionModal.vue';
import AnimalProfileFacts from '@/components/AnimalProfileFacts.vue';
import { cloneDeep } from 'lodash-es';

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
const isShared = computed(() => isLocked(currentSession.value)); // locked while an administrator reviews it

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

/* Put the list back as it is saved for the session: what was added or removed since is dropped. */
async function undoChanges() {
  if (props.selectedRecordingSessionId === null) return;
  await loadAnimalProfilesFromSession(props.selectedRecordingSessionId);
  emit('animal-dirty', { dirty: false });
  snackbarText.value = 'Changes undone.';
  snackbarColor.value = 'info';
  snackbar.value = true;
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
  } catch {
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
    <v-alert v-if="isShared" type="info" variant="tonal" class="mb-4">
      {{ lockedReason(currentSession) }}
    </v-alert>
    <v-card outlined class="pa-6 mb-5">
      <v-card-title class="d-flex justify-space-between align-center mb-4">
        <h3>Animal Profiles</h3>
        <div>
          <v-btn
            color="grey"
            variant="outlined"
            prepend-icon="mdi-undo"
            class="mr-2"
            :disabled="isShared || !isDirty"
            @click="undoChanges"
          >
            Undo changes
          </v-btn>
          <v-btn color="primary" @click="updateAnimalProfiles" :disabled="isShared || !isDirty">
            Save
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <div v-if="selectedAnimalProfiles.length" class="selected-profiles">
          <div v-for="profile in selectedAnimalProfiles" :key="profile.id" class="selected-profile">
            <div class="selected-profile-head">
              <strong class="selected-profile-name">{{ profile.name }}</strong>
              <v-btn
                v-if="!isShared"
                icon="mdi-close"
                size="x-small"
                variant="text"
                color="grey-darken-1"
                :aria-label="`Remove ${profile.name}`"
                @click="removeAnimalProfile(profile.id)"
              />
            </div>
            <AnimalProfileFacts :profile="profile" />
          </div>
        </div>
        <p v-else class="text-body-2 text-medium-emphasis mb-2">No animal profile chosen yet.</p>
        <div class="chip-list d-flex flex-wrap align-center">
          <v-chip
            v-if="selectedAnimalProfiles.length > 0"
            color="primary"
            variant="outlined"
            class="ma-1"
            @click="clearAnimalProfiles"
            :disabled="isShared"
          >
            <v-icon start>mdi-close</v-icon> Clear All
          </v-chip>

          <v-chip
            color="primary"
            variant="flat"
            class="ma-1"
            @click="showSelectionModal = true"
            :disabled="isShared"
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
      :selected-animal-profiles="selectedAnimalProfiles"
      @update:selected-animal-profiles="onUpdateSelectedAnimalProfiles"
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

<style scoped>
.selected-profiles {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}
.selected-profile {
  padding: 10px 14px 12px;
  border: 1px solid #e4e4e4;
  border-left: 4px solid rgb(var(--v-theme-primary));
  border-radius: 12px;
  background: #fff;
}
.selected-profile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.selected-profile-name {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
