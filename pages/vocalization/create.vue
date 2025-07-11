<script setup>
import { ref, reactive } from 'vue';

import RecordingSessionTab from '@/components/tabs/RecordingSessionTab.vue';
import ProtocolTab from '@/components/tabs/ProtocolTab.vue';
import AnimalProfileTab from '@/components/tabs/AnimalProfileTab.vue';
import FileTab from '@/components/tabs/FileTab.vue';
import SoftwareTab from '@/components/tabs/SoftwareTab.vue';
import HardwareTab from '@/components/tabs/HardwareTab.vue';
import { AudioLines } from 'lucide-vue-next';
import { markRaw } from 'vue';

const tab = ref(0);

const tabs = [
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
    disabled: false,
    hasErrors: false,
    errorMessage: '',
  },
  {
    name: 'animalProfile',
    label: 'Animal Profile',
    component: markRaw(AnimalProfileTab),
    disabled: false,
    hasErrors: false,
    errorMessage: '',
  },
  {
    name: 'file',
    label: 'File',
    component: markRaw(FileTab),
    disabled: false,
    hasErrors: false,
    errorMessage: '',
  },
  {
    name: 'software',
    label: 'Software',
    component: markRaw(SoftwareTab),
    disabled: false,
    hasErrors: false,
    errorMessage: '',
  },
  {
    name: 'hardware',
    label: 'Hardware',
    component: markRaw(HardwareTab),
    disabled: false,
    hasErrors: false,
    errorMessage: '',
  },
];

const validationState = reactive({});

function onValidate(tabName, validation) {
  const tabToUpdate = tabs.find((t) => t.name === tabName);
  if (!tabToUpdate) return;

  tabToUpdate.hasErrors = validation.hasErrors;
  tabToUpdate.errorMessage = validation.message || '';
}

function onSave(tabName) {
  alert(`Save requested for ${tabName}`);
}
</script>

<template>
  <v-container fluid>
    <v-card variant="flat" class="mx-auto mt-16 mb-4" max-width="1000">
      <div class="d-flex align-center mt-1 mb-4">
        <h1><AudioLines /> New Vocalization</h1>
      </div>
      <v-card-text>
        <p>Fill in the details for the new vocalization.</p>
      </v-card-text>
      <v-tabs v-model="tab" background-color="black" dark class="w-100 overflow-x-auto">
        <v-tab
          v-for="(item, index) in tabs"
          :key="item.name"
          :disabled="item.disabled"
          class="d-flex align-center"
        >
          {{ item.label }}
          <v-tooltip v-if="item.hasErrors" bottom>
            <template #activator="{ on, attrs }">
              <v-icon color="warning" class="ms-2" v-bind="attrs" v-on="on"
                >mdi-alert-circle-outline</v-icon
              >
            </template>
            <span>{{ item.errorMessage }}</span>
          </v-tooltip>
        </v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <v-window-item v-for="(item, index) in tabs" :key="item.name" :value="index">
          <component :is="item.component" @validate="onValidate(item.name, $event)" />
          <div class="d-flex justify-end mt-4">
            <v-btn color="primary" @click="onSave(item.name)">Save</v-btn>
          </div>
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
