<script setup lang="ts">
import { ref, reactive, computed, watch, markRaw } from 'vue';
import { AudioLines } from 'lucide-vue-next';

import RecordingSessionTab from '@/components/tabs/RecordingSessionTab.vue';
import ProtocolTab from '@/components/tabs/ProtocolTab.vue';
import AnimalProfileTab from '@/components/tabs/AnimalProfileTab.vue';
import FileTab from '@/components/tabs/FileTab.vue';

import { useFileStore } from '@/stores/file';

// === STATE ===
const tab = ref(0);
const selectedRecordingSessionId = ref<number | null>(null);
const selectedProtocolId = ref<number | null>(null);
const selectedAnimalProfileId = ref<number | null>(null);
const animalProfileSaved = ref(false);

const fileStore = useFileStore();
const filesCount = computed(() => fileStore.count);

// === SAFE COMPUTED FOR TS ===
const safeSelectedRecordingSessionId = computed(
  () => selectedRecordingSessionId.value ?? undefined
);
const safeSelectedProtocolId = computed(() => selectedProtocolId.value ?? undefined);
const safeSelectedAnimalProfileId = computed(() => selectedAnimalProfileId.value ?? undefined);

// === TABS ===
const tabs = reactive([
  {
    name: 'recordingSession',
    label: 'Recording Session',
    component: markRaw(RecordingSessionTab),
    disabled: false,
    hasErrors: false,
    errorMessage: '',
    unsaved: false, // <-- ADDED
  },
  {
    name: 'protocol',
    label: 'Protocol',
    component: markRaw(ProtocolTab),
    disabled: true,
    hasErrors: false,
    errorMessage: '',
    unsaved: false, // <-- ADDED
  },
  {
    name: 'animalProfile',
    label: 'Animal Profile',
    component: markRaw(AnimalProfileTab),
    disabled: true,
    hasErrors: false,
    errorMessage: '',
    unsaved: false, // <-- ADDED
  },
  {
    name: 'file',
    label: 'File',
    component: markRaw(FileTab),
    disabled: true,
    hasErrors: false,
    errorMessage: '',
    unsaved: false, // <-- ADDED (optional)
  },
]);

// === WATCHERS TO ENABLE/DISABLE TABS ===
watch(
  [selectedRecordingSessionId, selectedProtocolId, selectedAnimalProfileId, animalProfileSaved],
  async ([sessionId, protocolId, animalId, saved]) => {
    tabs.find((t) => t.name === 'protocol')!.disabled = !sessionId;
    tabs.find((t) => t.name === 'animalProfile')!.disabled = !(sessionId && protocolId);
    // 🔑 File tab enabled only if session, protocol, animal AND saved
    tabs.find((t) => t.name === 'file')!.disabled = !(sessionId && protocolId && animalId && saved);

    if (sessionId) {
      await fileStore.fetchFilesBySessionId(sessionId);
    } else {
      fileStore.files = [];
      animalProfileSaved.value = false;
    }
  },
  { immediate: true }
);

// === VALIDATION HANDLER ===
function onValidate(tabName: string, validation: { hasErrors: boolean; message: string }) {
  const tabToUpdate = tabs.find((t) => t.name === tabName);
  if (!tabToUpdate) return;
  tabToUpdate.hasErrors = validation.hasErrors;
  tabToUpdate.errorMessage = validation.message || '';
}

// === SELECTION HANDLERS ===
function onSessionSelected(
  payload: {
    sessionId: number | null;
    protocolId: number | null;
    animalProfileId: number | null;
  } | null
) {
  if (!payload) {
    selectedRecordingSessionId.value = null;
    selectedProtocolId.value = null;
    selectedAnimalProfileId.value = null;
    animalProfileSaved.value = false;
    return;
  }

  selectedRecordingSessionId.value = payload.sessionId ?? null;
  selectedProtocolId.value = payload.protocolId ?? null;
  selectedAnimalProfileId.value = payload.animalProfileId ?? null;
  animalProfileSaved.value = payload.animalProfileId !== null;
}

function onAnimalSelected(payload: { animalProfileId: number | null }) {
  selectedAnimalProfileId.value = payload?.animalProfileId ?? null;
  // keep saved as is, it will be set to true after save
}

function onAnimalSaved(saved: boolean) {
  animalProfileSaved.value = saved;
}

// === UNSAVED HANDLERS ===
function setTabUnsaved(tabName: string, unsaved: boolean) {
  const t = tabs.find((x) => x.name === tabName);
  if (t) t.unsaved = unsaved;
}

// update handlers to be used by child emits
function onSessionDirty(payload: { dirty: boolean }) {
  setTabUnsaved('recordingSession', !!payload.dirty);
}
function onSessionSaved(payload: { saved: boolean }) {
  setTabUnsaved('recordingSession', !payload.saved);
}
function onProtocolDirty(payload: { dirty: boolean }) {
  setTabUnsaved('protocol', !!payload.dirty);
}
function onProtocolSaved(payload: { saved: boolean }) {
  setTabUnsaved('protocol', !payload.saved);
}
function onAnimalDirty(payload: { dirty: boolean }) {
  setTabUnsaved('animalProfile', !!payload.dirty);
}
function onAnimalSavedFlag(payload: { saved: boolean }) {
  setTabUnsaved('animalProfile', !payload.saved);
}

// === TOOLTIP MESSAGES ===
function getTooltipMessage(tabName: string) {
  if (tabName === 'protocol') return 'Please create or select a Recording Session first';
  if (tabName === 'animalProfile') return 'Please create or select a Protocol first';
  if (tabName === 'file') return 'Please save an Animal Profile first';
  return '';
}
// === NAVIGATION HELPERS ===
function goToProtocolTab() {
  const protocolIndex = tabs.findIndex((t) => t.name === 'protocol');
  if (protocolIndex !== -1) {
    tab.value = protocolIndex;
  }
}

function goToAnimalProfileTab() {
  const animalProfileIndex = tabs.findIndex((t) => t.name === 'animalProfile');
  if (animalProfileIndex !== -1) {
    tab.value = animalProfileIndex;
  }
}

function goToFileTab() {
  const fileIndex = tabs.findIndex((t) => t.name === 'file');
  if (fileIndex !== -1) {
    tab.value = fileIndex;
  }
}
</script>

<template>
  <v-container fluid>
    <v-card variant="flat" class="mx-auto mt-16 mb-4" max-width="1000">
      <div class="d-flex align-center mt-1 mb-4">
        <h1><AudioLines class="mr-2" /> New Vocalization Entry</h1>
      </div>

      <v-card-text>
        <p>Fill in the details for the new vocalization.</p>
      </v-card-text>

      <!-- TABS -->
      <v-tabs v-model="tab" background-color="black" dark class="w-100 overflow-x-auto">
        <v-hover v-for="item in tabs" :key="item.name" v-slot="{ isHovering, props }">
          <div class="position-relative">
            <v-tab v-bind="props" :disabled="item.disabled" class="d-flex align-center">
              {{ item.label }}

              <v-icon
                v-if="item.disabled && item.name !== 'recordingSession'"
                color="grey"
                size="small"
                class="ms-1"
              >
                mdi-lock
              </v-icon>

              <v-chip
                v-if="item.name === 'file' && filesCount > 0"
                small
                class="ms-2"
                color="primary"
                text-color="white"
              >
                {{ filesCount }}
              </v-chip>

              <v-icon v-if="item.unsaved" color="primary" size="small" class="ms-1">
                mdi-content-save-outline
              </v-icon>
              <v-icon v-if="item.hasErrors" color="primary" class="ms-2">
                mdi-alert-circle-outline
              </v-icon>
            </v-tab>

            <v-menu
              v-if="item.disabled && item.name !== 'recordingSession'"
              :open="isHovering"
              activator="parent"
              location="bottom"
              max-width="250"
            >
              <v-card class="pa-2 text-body-2">{{ getTooltipMessage(item.name) }}</v-card>
            </v-menu>
          </div>
        </v-hover>
      </v-tabs>

      <!-- TAB CONTENT -->
      <v-window v-model="tab">
        <v-window-item v-for="(item, index) in tabs" :key="item.name" :value="index">
          <component
            :is="item.component"
            @validate="onValidate(item.name, $event)"
            @session-selected="onSessionSelected"
            @animal-selected="onAnimalSelected"
            @animal-saved="onAnimalSaved($event.saved)"
            @update:selectedProtocolId="selectedProtocolId = $event"
            @session-dirty="onSessionDirty($event)"
            @session-saved="onSessionSaved($event)"
            @protocol-dirty="onProtocolDirty($event)"
            @protocol-saved="onProtocolSaved($event)"
            @animal-dirty="onAnimalDirty($event)"
            v-bind="{
              ...(item.name === 'recordingSession'
                ? {
                    selectedRecordingSessionId: selectedRecordingSessionId,
                    onGoToProtocol: goToProtocolTab,
                  }
                : {}),
              ...(item.name === 'protocol'
                ? {
                    selectedProtocolId: safeSelectedProtocolId,
                    selectedRecordingSessionId: safeSelectedRecordingSessionId,
                    onGoToAnimalProfile: goToAnimalProfileTab,
                  }
                : {}),
              ...(item.name === 'animalProfile'
                ? {
                    selectedProtocolId: safeSelectedProtocolId,
                    selectedRecordingSessionId: safeSelectedRecordingSessionId,
                    onGoToFile: goToFileTab,
                  }
                : {}),
              ...(item.name === 'file'
                ? {
                    selectedProtocolId: safeSelectedProtocolId,
                    selectedRecordingSessionId: safeSelectedRecordingSessionId,
                    selectedAnimalProfileId: safeSelectedAnimalProfileId,
                  }
                : {}),
            }"
          />
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>

<style scoped>
:deep(.v-row) {
  margin: 0 !important;
}
</style>
