<script setup>
import { ref, reactive, watch, computed } from 'vue';
import { markRaw } from 'vue';
import { AudioLines } from 'lucide-vue-next';

import RecordingSessionTab from '@/components/tabs/RecordingSessionTab.vue';
import ProtocolTab from '@/components/tabs/ProtocolTab.vue';
import AnimalProfileTab from '@/components/tabs/AnimalProfileTab.vue';
import FileTab from '@/components/tabs/FileTab.vue';

import { useFileStore } from '@/stores/file';

const tab = ref(0);
const selectedProtocolId = ref(null);
const selectedRecordingSessionId = ref(null);

const fileStore = useFileStore();

const filesCount = computed(() => fileStore.files.length);

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

watch(selectedRecordingSessionId, async (newId) => {
  const shouldEnable = !!newId;
  tabs.forEach((tabItem) => {
    if (tabItem.name !== 'recordingSession') {
      tabItem.disabled = !shouldEnable;
    }
  });
  if (shouldEnable) {
    await fileStore.fetchFilesBySessionId(newId);
  } else {
    fileStore.files = [];
  }
});

function onValidate(tabName, validation) {
  const tabToUpdate = tabs.find((t) => t.name === tabName);
  if (!tabToUpdate) return;
  tabToUpdate.hasErrors = validation.hasErrors;
  tabToUpdate.errorMessage = validation.message || '';
}

function onSessionSelected(payload) {
  if (!payload) {
    selectedRecordingSessionId.value = null;
    selectedProtocolId.value = null;
  } else {
    selectedRecordingSessionId.value = payload.sessionId;
    selectedProtocolId.value = payload.protocolId ?? null;
  }
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

      <v-tabs v-model="tab" background-color="black" dark class="w-100 overflow-x-auto">
        <v-hover v-for="(item, index) in tabs" :key="item.name" v-slot="{ isHovering, props }">
          <div class="position-relative">
            <v-tab v-bind="props" :disabled="item.disabled" class="d-flex align-center">
              {{ item.label }}
              <v-icon
                v-if="item.disabled && item.name !== 'recordingSession'"
                color="grey"
                size="small"
                class="ms-1"
                >mdi-lock</v-icon
              >

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

            <!-- Tooltip simulation using v-menu + open-on-hover -->
            <v-menu
              v-if="item.disabled && item.name !== 'recordingSession'"
              :open="isHovering"
              activator="parent"
              location="bottom"
              max-width="250"
            >
              <v-card class="pa-2 text-body-2">
                Please create or select a Recording Session first
              </v-card>
            </v-menu>
          </div>
        </v-hover>
      </v-tabs>

      <v-window v-model="tab">
        <v-window-item v-for="(item, index) in tabs" :key="item.name" :value="index">
          <component
            :is="item.component"
            @validate="onValidate(item.name, $event)"
            @session-selected="onSessionSelected"
            v-bind="{
              ...(item.name === 'protocol'
                ? { selectedProtocolId, selectedRecordingSessionId }
                : {}),
              ...(item.name === 'file' ? { recordingSessionId: selectedRecordingSessionId } : {}),
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
