<script setup lang="ts">
import { ref, reactive, computed, watch, markRaw, defineAsyncComponent } from 'vue';
import { AudioLines } from '@lucide/vue';

import { useRoute } from 'vue-router';
import { useFileStore } from '@/stores/file';

// Lazy load components for better initial performance
const RecordingSessionTab = defineAsyncComponent(
  () => import('@/components/tabs/RecordingSessionTab.vue')
);
const ProtocolTab = defineAsyncComponent(() => import('@/components/tabs/ProtocolTab.vue'));
const AnimalProfileTab = defineAsyncComponent(
  () => import('@/components/tabs/AnimalProfileTab.vue')
);
const FileTab = defineAsyncComponent(() => import('@/components/tabs/FileTab.vue'));

// === STATE ===
const route = useRoute();
// "My vocalizations" opens a session: ?session=<id>, and &step=file for its files and deposit
const initialSessionId = Number(route.query.session) || undefined;
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
    unsaved: false,
  },
  {
    name: 'protocol',
    label: 'Protocol',
    component: markRaw(ProtocolTab),
    disabled: true,
    hasErrors: false,
    errorMessage: '',
    unsaved: false,
  },
  {
    name: 'animalProfile',
    label: 'Animal Profile',
    component: markRaw(AnimalProfileTab),
    disabled: true,
    hasErrors: false,
    errorMessage: '',
    unsaved: false,
  },
  {
    name: 'file',
    label: 'File',
    component: markRaw(FileTab),
    disabled: true,
    hasErrors: false,
    errorMessage: '',
    unsaved: false,
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

// once the opened session is loaded, go to its files when asked to
let jumpedToFiles = false;
watch(
  () => tabs.find((t) => t.name === 'file')?.disabled,
  (disabled) => {
    if (disabled === false && route.query.step === 'file' && !jumpedToFiles) {
      jumpedToFiles = true;
      goToFileTab();
    }
  }
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
// called only once the profiles are saved (a fresh tab must not look unsaved)
function onAnimalSavedFlag(payload: { saved: boolean }) {
  setTabUnsaved('animalProfile', !payload.saved);
}

// === STEPS ===
// A step is "done" once what it produces exists: used by the numbered header.
function stepDone(name: string) {
  if (name === 'recordingSession') return !!selectedRecordingSessionId.value;
  if (name === 'protocol') return !!selectedProtocolId.value;
  if (name === 'animalProfile') return animalProfileSaved.value;
  return filesCount.value > 0;
}
const doneCount = computed(() => tabs.filter((t) => stepDone(t.name)).length);

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
  <v-main class="w-100">
    <v-container fluid>
      <v-card variant="flat" class="mx-auto" max-width="1000">
        <div class="eyebrow">
          <span class="title-bar" aria-hidden="true"></span>
          <span class="text-overline">New recording</span>
        </div>
        <h1 class="d-flex align-center"><AudioLines class="mr-2" /> Add a vocalization</h1>
        <p class="create-lead">
          Describe how the recording was made, then add its files. Each step unlocks the next one,
          and you can come back to any step you have already saved.
        </p>

        <!-- STEPS -->
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
          <span class="text-caption text-medium-emphasis" aria-live="polite">
            {{ doneCount }} of {{ tabs.length }} steps done
          </span>
        </div>
        <v-tabs
          v-model="tab"
          class="steps w-100 overflow-x-auto"
          color="primary"
          hide-slider
          show-arrows
        >
          <v-tooltip
            v-for="(item, index) in tabs"
            :key="item.name"
            :text="getTooltipMessage(item.name)"
            :disabled="!item.disabled"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <div v-bind="tipProps" class="step-wrap">
                <v-tab :value="index" :disabled="item.disabled" class="step">
                  <span class="step-badge" :class="{ done: stepDone(item.name) }">
                    <v-icon v-if="stepDone(item.name)" size="16">mdi-check</v-icon>
                    <v-icon v-else-if="item.disabled" size="14">mdi-lock-outline</v-icon>
                    <template v-else>{{ index + 1 }}</template>
                  </span>
                  <span class="step-label">{{ item.label }}</span>
                  <v-chip
                    v-if="item.name === 'file' && !item.disabled && filesCount > 0"
                    size="x-small"
                    class="ms-2"
                    color="primary"
                    variant="tonal"
                  >
                    {{ filesCount }}
                  </v-chip>
                  <v-icon
                    v-if="item.unsaved"
                    color="warning"
                    size="small"
                    class="ms-1"
                    title="Unsaved changes"
                  >
                    mdi-content-save-alert-outline
                  </v-icon>
                  <v-icon
                    v-if="item.hasErrors"
                    color="error"
                    size="small"
                    class="ms-1"
                    :title="item.errorMessage || 'To complete'"
                  >
                    mdi-alert-circle-outline
                  </v-icon>
                </v-tab>
              </div>
            </template>
          </v-tooltip>
        </v-tabs>

        <!-- TAB CONTENT -->
        <v-card variant="outlined" rounded="xl" class="step-card mt-4">
          <v-window v-model="tab">
            <v-window-item v-for="(item, index) in tabs" :key="item.name" :value="index">
              <component
                :is="item.component"
                @validate="onValidate(item.name, $event)"
                @session-selected="onSessionSelected"
                @animal-selected="onAnimalSelected"
                @animal-saved="
                  (e: { saved: boolean }) => {
                    onAnimalSaved(e.saved);
                    if (e.saved) onAnimalSavedFlag(e);
                  }
                "
                @update:selected-protocol-id="selectedProtocolId = $event"
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
                        initialSessionId,
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
      </v-card>
    </v-container>
  </v-main>
</template>

<style scoped>
:deep(.v-row) {
  margin: 0 !important;
}

.create-lead {
  max-width: 46rem;
  margin: 4px 0 20px;
  color: #555;
  line-height: 1.6;
}

/* numbered steps: the active one is underlined in red, locked ones are greyed */
.steps :deep(.v-slide-group__content) {
  gap: 8px;
}
.step-wrap {
  display: inline-flex;
}
.step {
  min-width: 0;
  padding: 0 14px;
  border-radius: 12px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  font-size: 0.95rem;
}
.step.v-tab--selected {
  background: #f6f6f6;
}
.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 8px;
  border-radius: 50%;
  border: 1.5px solid #bdbdbd;
  color: #666;
  font-size: 0.8rem;
}
/* the current step: red disc with a white number (or check). This rule must not be outranked by
   .done below, or a completed current step is red on red and shows nothing */
.step.v-tab--selected .step-badge,
.step.v-tab--selected .step-badge.done {
  background: #c62828;
  border-color: #c62828;
  color: #fff;
}
.step-badge.done {
  background: #c62828;
  border-color: #c62828;
  color: #fff;
}

.step-card {
  border-color: #e4e4e4;
  overflow: hidden;
}
/* the boxes inside the four steps: same soft look as the rest of the site */
.step-card :deep(.v-card.v-card--variant-elevated) {
  box-shadow: none;
  border: 1px solid #e4e4e4;
  border-radius: 12px;
  background: #fafafa;
}
</style>
