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
const filesCount = computed(() => fileStore.files.length);

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
  },
  {
    name: 'protocol',
    label: 'Protocol',
    component: markRaw(ProtocolTab),
    disabled: true,
    hasErrors: false,
    errorMessage: '',
  },
  {
    name: 'animalProfile',
    label: 'Animal Profile',
    component: markRaw(AnimalProfileTab),
    disabled: true,
    hasErrors: false,
    errorMessage: '',
  },
  {
    name: 'file',
    label: 'File',
    component: markRaw(FileTab),
    disabled: true,
    hasErrors: false,
    errorMessage: '',
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
function onSessionSelected(payload: {
  sessionId: number | null;
  protocolId: number | null;
  animalProfileId: number | null;
}) {
  selectedRecordingSessionId.value = payload?.sessionId ?? null;
  selectedProtocolId.value = payload?.protocolId ?? null;
  selectedAnimalProfileId.value = payload?.animalProfileId ?? null;
  animalProfileSaved.value = false; // reset save on session change
}

function onAnimalSelected(payload: { animalProfileId: number | null }) {
  selectedAnimalProfileId.value = payload?.animalProfileId ?? null;
  // keep saved as is, it will be set to true after save
}

function onAnimalSaved(saved: boolean) {
  animalProfileSaved.value = saved;
}

// === TOOLTIP MESSAGES ===
function getTooltipMessage(tabName: string) {
  if (tabName === 'protocol') return 'Please create or select a Recording Session first';
  if (tabName === 'animalProfile') return 'Please create or select a Protocol first';
  if (tabName === 'file') return 'Please save an Animal Profile first';
  return '';
}
</script>

<template>
  <v-container fluid>
    <v-card variant="flat" class="mx-auto mt-16 mb-4" max-width="1000">
      <div class="d-flex align-center mt-1 mb-4">
        <h1><AudioLines class="mr-2" /> New Vocalization</h1>
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

              <v-icon v-if="item.hasErrors" color="warning" class="ms-2">
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
            v-bind="{
              ...(item.name === 'protocol'
                ? {
                    selectedProtocolId: safeSelectedProtocolId,
                    selectedRecordingSessionId: safeSelectedRecordingSessionId,
                  }
                : {}),
              ...(item.name === 'animalProfile'
                ? {
                    selectedProtocolId: safeSelectedProtocolId,
                    selectedRecordingSessionId: safeSelectedRecordingSessionId,
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
