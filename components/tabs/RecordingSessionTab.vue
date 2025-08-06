<script setup lang="ts">
////////////////////////////////
// IMPORTS
////////////////////////////////
import { ref, computed, onMounted, watch } from 'vue';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { useAuth } from '@/composables/useAuth';
import { useRecordingSessionStore } from '@/stores/recordingSession';
import { useHardwareStore } from '@/stores/hardware';
import { useSoftwareStore } from '@/stores/software';
import SoftwareModal from '@/components/modals/SoftwareModal.vue';
import CreateSoftwareVersionModal from '@/components/modals/CreateSoftwareVersionModal.vue';
import LaboratoryModal from '@/components/modals/LaboratoryModal.vue';
import HardwareModal from '@/components/modals/HardwareModal.vue';

////////////////////////////////
// STORES
////////////////////////////////
const apiBaseUrl: string = useApiBaseUrl();
const { token } = useAuth();
const recordingSessionStore = useRecordingSessionStore();
const hardwareStore = useHardwareStore();
const softwareStore = useSoftwareStore();

////////////////////////////////
// EMITS
////////////////////////////////
const emit = defineEmits(['validate', 'session-selected']);

////////////////////////////////
// DATA & STATE
////////////////////////////////
const formRef = ref();
const dateMenu = ref(false);
const date = ref<string | null>(null);
const time = ref<string | null>(null);

const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

const selectedSessionId = ref<'new' | number>('new');
const recordingSessionsOptions = computed(() => recordingSessionStore.sessions);

const laboratoriesOptions = ref<any[]>([]);
const studiesOptions = ref<any[]>([]);
const hardwareOptions = ref<any[]>([]);
const softwareOptions = ref<any[]>([]);

const newHardwareDialog = ref(false);
const editHardwareDialog = ref(false);
const editHardwareId = ref<number | null>(null);
const hardwareTypeForModal = ref<'soundcard' | 'microphone' | 'speaker' | 'amplifier' | ''>('');

const formData = ref({
  name: '',
  description: '',
  date: null as string | null,
  duration: null as number | null,
  studies: [] as number[],
  context: {
    temperature: { value: null as string | null, unit: '°C' as '°C' | '°F' },
    brightness: null as number | null,
  },
  equipment: {
    channels: '' as '' | 'mono' | 'stereo' | 'more than 2',
    sound_isolation: '' as
      | ''
      | 'soundproof room'
      | 'soundproof cage'
      | 'no specific sound isolation',
    soundcards: [] as number[],
    microphones: [] as number[],
    amplifiers: [] as number[],
    speakers: [] as number[],
    acquisition_software: [] as number[],
  },
  laboratory: null as number | null,
});

const showSoftwareModal = ref(false);
const showSoftwareVersionModal = ref(false);
const createdSoftwareId = ref<number | null>(null);
const editSoftwareId = ref<number | null>(null);

const newLabDialog = ref(false);
const editLabDialog = ref(false);
const editLabId = ref<number | null>(null);

////////////////////////////////
// COMPUTED
////////////////////////////////
const formattedDate = computed(() => {
  if (date.value && time.value) {
    return `${date.value} ${time.value}`;
  }
  return '';
});

////////////////////////////////
// METHODS
////////////////////////////////
function showSnackbar(message: string, color: string) {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    date: null,
    duration: null,
    studies: [],
    context: {
      temperature: { value: null, unit: '°C' },
      brightness: null,
    },
    equipment: {
      channels: '',
      sound_isolation: '',
      soundcards: [],
      microphones: [],
      amplifiers: [],
      speakers: [],
      acquisition_software: [],
    },
    laboratory: null,
  };
  date.value = null;
  time.value = null;
  emit('session-selected', null);
}

function updateDate(newDate: string | null) {
  date.value = newDate;
  tryMergeDateTime();
}

function updateTime(newTime: string) {
  time.value = newTime;
  tryMergeDateTime();
}

function tryMergeDateTime() {
  if (date.value && time.value) {
    formData.value.date = new Date(`${date.value}T${time.value}`).toISOString();
    dateMenu.value = false;
  }
}

async function fetchSelectableData() {
  const headers: Record<string, string> = {};
  if (token.value) headers.Authorization = `Bearer ${token.value}`;

  const fetchAndAssign = async (endpoint: string, target: any) => {
    try {
      const res = await fetch(`${apiBaseUrl}/${endpoint}/`, { headers });
      const data = await res.json();
      target.value = data.results ?? data;
    } catch (e) {
      console.error(`Error loading ${endpoint}`, e);
      showSnackbar(`Error loading ${endpoint}`, 'error');
    }
  };

  await Promise.all([
    fetchAndAssign('study', studiesOptions),
    fetchAndAssign('hardware', hardwareOptions),
    fetchAndAssign('software', softwareOptions),
    fetchAndAssign('laboratory', laboratoriesOptions),
  ]);
}

function onSoftwareCreated() {
  createdSoftwareId.value = softwareStore.softwares.at(-1)?.id ?? null;
  if (createdSoftwareId.value) {
    showSoftwareVersionModal.value = true;
  }
}

const editSoftwareData = computed(() => {
  if (editSoftwareId.value) {
    return softwareOptions.value.find((s) => s.id === editSoftwareId.value) ?? {};
  }
  return {};
});

function openEditSoftDialog() {
  const selectedId = formData.value.equipment.acquisition_software[0];
  if (!selectedId) {
    showSnackbar('No software selected to edit.', 'error');
    return;
  }
  editSoftwareId.value = selectedId;
  showSoftwareModal.value = true;
}

function openEditLabDialog() {
  const selectedLab = laboratoriesOptions.value.find((lab) => lab.id === formData.value.laboratory);
  if (!selectedLab) {
    showSnackbar('No laboratory selected to edit.', 'error');
    return;
  }
  editLabId.value = selectedLab.id;
  editLabDialog.value = true;
}

async function saveSession() {
  const isValid = await formRef.value.validate();
  if (!isValid) {
    showSnackbar('Please fill in all required fields.', 'error');
    return;
  }

  if (date.value && time.value) {
    formData.value.date = new Date(`${date.value}T${time.value}`).toISOString();
  }

  try {
    if (selectedSessionId.value === 'new') {
      const created = await recordingSessionStore.createSession(formData.value);
      showSnackbar('Session created successfully!', 'success');
      selectedSessionId.value = created.id;
      emit('session-selected', {
        sessionId: created.id,
        protocolId: created.protocol?.id || null,
      });
    } else {
      await recordingSessionStore.updateSession(Number(selectedSessionId.value), formData.value);
      showSnackbar('Session updated successfully!', 'success');
      const session = recordingSessionStore.getSessionById(Number(selectedSessionId.value));
      emit('session-selected', {
        sessionId: selectedSessionId.value,
        protocolId: session?.protocol?.id || null,
      });
    }
  } catch (e) {
    console.error('Error saving session', e);
    showSnackbar('Error saving session.', 'error');
  }
}

function openNewHardwareDialog(type: 'soundcard' | 'microphone' | 'speaker' | 'amplifier') {
  hardwareTypeForModal.value = type;
  editHardwareId.value = null;
  newHardwareDialog.value = true;
}

const hardwareFieldMap = {
  soundcard: 'soundcards',
  microphone: 'microphones',
  speaker: 'speakers',
  amplifier: 'amplifiers',
} as const;

function openEditHardwareDialog(type: 'soundcard' | 'microphone' | 'speaker' | 'amplifier') {
  const selectedId = formData.value.equipment[hardwareFieldMap[type]][0];
  if (!selectedId) {
    showSnackbar(`No ${type} selected to edit.`, 'error');
    return;
  }
  editHardwareId.value = selectedId;
  hardwareTypeForModal.value = type;
  editHardwareDialog.value = true;
}

////////////////////////////////
// WATCHERS
////////////////////////////////
watch(selectedSessionId, (newId) => {
  if (!newId || newId === 'new') {
    resetForm();
    emit('session-selected', null);
    return;
  }

  const idNum = Number(newId);
  const session = recordingSessionStore.getSessionById(idNum);
  if (!session) return;

  formData.value.name = session.name ?? '';
  formData.value.description = session.description ?? '';
  formData.value.duration = session.duration ?? null;
  formData.value.date = session.date ?? null;
  if (session.date) {
    const d = new Date(session.date);
    date.value = d.toISOString().slice(0, 10);
    time.value = d.toTimeString().slice(0, 5);
  }

  formData.value.studies = session.studies?.map((s: any) => s.id) ?? [];
  formData.value.context.temperature.value = session.context_temperature_value ?? null;
  formData.value.context.temperature.unit = session.context_temperature_unit ?? '°C';
  formData.value.context.brightness = session.context_brightness ?? null;
  formData.value.equipment.channels = session.equipment_channels ?? '';
  formData.value.equipment.sound_isolation = session.equipment_sound_isolation ?? '';
  formData.value.equipment.soundcards =
    session.equipment_acquisition_hardware_soundcards?.map((h: any) => h.id) ?? [];
  formData.value.equipment.microphones =
    session.equipment_acquisition_hardware_microphones?.map((h: any) => h.id) ?? [];
  formData.value.equipment.amplifiers =
    session.equipment_acquisition_hardware_amplifiers?.map((h: any) => h.id) ?? [];
  formData.value.equipment.speakers =
    session.equipment_acquisition_hardware_speakers?.map((h: any) => h.id) ?? [];
  formData.value.equipment.acquisition_software =
    session.equipment_acquisition_software?.map((soft: any) => soft.software?.id ?? soft.id) ?? [];
  formData.value.laboratory = session.laboratory?.id ?? null;

  emit('session-selected', {
    sessionId: idNum,
    protocolId: session.protocol?.id || null,
  });
});

////////////////////////////////
// LIFECYCLE
////////////////////////////////
onMounted(async () => {
  await fetchSelectableData();
  await recordingSessionStore.fetchSessions();
});
</script>

<template>
  <v-container>
    <!-- Sélection de la session -->
    <v-select
      v-model="selectedSessionId"
      :items="[
        { id: 'new', name: 'Create New Session' },
        ...recordingSessionsOptions.map((s) => ({ id: s.id, name: s.name })),
      ]"
      item-title="name"
      item-value="id"
      label="Select Recording Session"
      outlined
      dense
      class="mb-4"
    />

    <v-card class="pa-6" outlined>
      <v-card-title class="d-flex justify-space-between align-center mb-4">
        <h3>Recording Session Metadata</h3>
        <div>
          <v-btn color="grey" variant="outlined" @click="resetForm" class="mr-2">Reset</v-btn>
          <v-btn color="primary" @click="saveSession">Save</v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" lazy-validation>
          <!-- Name -->
          <v-text-field
            v-model="formData.name"
            outlined
            required
            :rules="[(v) => !!v || 'Name is required']"
            class="mb-4"
          >
            <template #label>Name <span style="color: red">*</span></template>
          </v-text-field>

          <!-- Description -->
          <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />

          <!-- Date -->
          <!-- Date et heure -->
          <v-menu
            v-model="dateMenu"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
          >
            <template #activator="{ props }">
              <v-text-field
                v-model="formattedDate"
                readonly
                outlined
                class="mb-4"
                :rules="[(v) => !!v || 'Recording Date is required']"
                v-bind="props"
              >
                <template #label> Recording Date <span style="color: red">*</span> </template>
              </v-text-field>
            </template>

            <v-card>
              <v-row no-gutters>
                <v-col cols="6">
                  <v-date-picker
                    v-model="date"
                    @update:modelValue="updateDate"
                    show-adjacent-months
                  />
                </v-col>
                <v-col cols="6">
                  <v-time-picker v-model="time" @update:modelValue="updateTime" format="24hr" />
                </v-col>
              </v-row>
            </v-card>
          </v-menu>

          <!-- Duration -->
          <v-text-field
            v-model="formData.duration"
            label="Duration (seconds)"
            type="number"
            outlined
            class="mb-4"
          />

          <!-- Studies -->
          <v-autocomplete
            v-model="formData.studies"
            :items="studiesOptions"
            item-title="name"
            item-value="id"
            label="Associated Studies"
            multiple
            outlined
            chips
            class="mb-4"
          />

          <!-- Laboratory -->
          <v-row class="mb-4" align="center" no-gutters>
            <v-col cols="12" md="9">
              <v-select
                v-model="formData.laboratory"
                :items="laboratoriesOptions"
                item-title="name"
                item-value="id"
                label="Laboratory"
                outlined
                clearable
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="3" class="d-flex justify-end align-center mb-4">
              <v-btn
                color="primary"
                variant="flat"
                size="small"
                class="mr-2"
                title="Add new laboratory"
                @click="newLabDialog = true"
              >
                <v-icon start>mdi-plus</v-icon> Add
              </v-btn>
              <v-btn
                color="secondary"
                variant="flat"
                size="small"
                title="Edit selected laboratory"
                @click="openEditLabDialog"
                :disabled="!formData.laboratory"
              >
                <v-icon start>mdi-pencil</v-icon> Edit
              </v-btn>
            </v-col>
          </v-row>

          <!-- Context -->
          <v-card class="pa-4 mb-4" outlined>
            <v-card-title>Context</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <v-text-field
                    v-model="formData.context.temperature.value"
                    label="Temperature Value"
                    outlined
                  />
                </v-col>
                <v-col cols="6">
                  <v-select
                    v-model="formData.context.temperature.unit"
                    :items="['°C', '°F']"
                    label="Temperature Unit"
                    outlined
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="formData.context.brightness"
                    label="Brightness (Lux)"
                    type="number"
                    outlined
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Equipment -->
          <v-card class="pa-4 mb-4" outlined>
            <v-card-title>Equipment</v-card-title>
            <v-card-text>
              <v-select
                v-model="formData.equipment.channels"
                :items="['mono', 'stereo', 'more than 2']"
                label="Channels"
                outlined
                class="mb-4"
              />
              <v-select
                v-model="formData.equipment.sound_isolation"
                :items="['soundproof room', 'soundproof cage', 'no specific sound isolation']"
                label="Sound Isolation"
                outlined
                class="mb-4"
              />
              <v-row class="mb-4" align="center" no-gutters>
                <v-col cols="12" md="9">
                  <v-autocomplete
                    v-model="formData.equipment.soundcards"
                    :items="hardwareOptions.filter((h) => h.type === 'soundcard')"
                    item-title="name"
                    item-value="id"
                    label="Sound Cards"
                    multiple
                    outlined
                    chips
                    clearable
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="3" class="d-flex justify-end align-center mb-4">
                  <v-btn
                    color="primary"
                    variant="flat"
                    size="small"
                    class="mr-2"
                    @click="openNewHardwareDialog('soundcard')"
                  >
                    <v-icon start>mdi-plus</v-icon> Add
                  </v-btn>
                  <v-btn
                    color="secondary"
                    variant="flat"
                    size="small"
                    @click="openEditHardwareDialog('soundcard')"
                    :disabled="!formData.equipment.soundcards.length"
                  >
                    <v-icon start>mdi-pencil</v-icon> Edit
                  </v-btn>
                </v-col>
              </v-row>
              <v-row class="mb-4" align="center" no-gutters>
                <v-col cols="12" md="9">
                  <v-autocomplete
                    v-model="formData.equipment.microphones"
                    :items="hardwareOptions.filter((h) => h.type === 'microphone')"
                    item-title="name"
                    item-value="id"
                    label="Microphones"
                    multiple
                    outlined
                    chips
                    clearable
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="3" class="d-flex justify-end align-center mb-4">
                  <v-btn
                    color="primary"
                    variant="flat"
                    size="small"
                    class="mr-2"
                    @click="openNewHardwareDialog('microphone')"
                  >
                    <v-icon start>mdi-plus</v-icon> Add
                  </v-btn>
                  <v-btn
                    color="secondary"
                    variant="flat"
                    size="small"
                    @click="openEditHardwareDialog('microphone')"
                    :disabled="!formData.equipment.microphones.length"
                  >
                    <v-icon start>mdi-pencil</v-icon> Edit
                  </v-btn>
                </v-col>
              </v-row>
              <v-row class="mb-4" align="center" no-gutters>
                <v-col cols="12" md="9">
                  <v-autocomplete
                    v-model="formData.equipment.amplifiers"
                    :items="hardwareOptions.filter((h) => h.type === 'amplifier')"
                    item-title="name"
                    item-value="id"
                    label="Amplifiers"
                    multiple
                    outlined
                    chips
                    clearable
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="3" class="d-flex justify-end align-center mb-4">
                  <v-btn
                    color="primary"
                    variant="flat"
                    size="small"
                    class="mr-2"
                    @click="openNewHardwareDialog('amplifier')"
                  >
                    <v-icon start>mdi-plus</v-icon> Add
                  </v-btn>
                  <v-btn
                    color="secondary"
                    variant="flat"
                    size="small"
                    @click="openEditHardwareDialog('amplifier')"
                    :disabled="!formData.equipment.amplifiers.length"
                  >
                    <v-icon start>mdi-pencil</v-icon> Edit
                  </v-btn>
                </v-col>
              </v-row>
              <v-row class="mb-4" align="center" no-gutters>
                <v-col cols="12" md="9">
                  <v-autocomplete
                    v-model="formData.equipment.speakers"
                    :items="hardwareOptions.filter((h) => h.type === 'speaker')"
                    item-title="name"
                    item-value="id"
                    label="Speakers"
                    multiple
                    outlined
                    chips
                    clearable
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="3" class="d-flex justify-end align-center mb-4">
                  <v-btn
                    color="primary"
                    variant="flat"
                    size="small"
                    class="mr-2"
                    @click="openNewHardwareDialog('speaker')"
                  >
                    <v-icon start>mdi-plus</v-icon> Add
                  </v-btn>
                  <v-btn
                    color="secondary"
                    variant="flat"
                    size="small"
                    @click="openEditHardwareDialog('speaker')"
                    :disabled="!formData.equipment.speakers.length"
                  >
                    <v-icon start>mdi-pencil</v-icon> Edit
                  </v-btn>
                </v-col>
              </v-row>

              <!-- Acquisition Software -->
              <v-row class="mb-4" align="center" no-gutters>
                <v-col cols="12" md="9">
                  <v-autocomplete
                    v-model="formData.equipment.acquisition_software"
                    :items="softwareOptions"
                    item-title="name"
                    item-value="id"
                    label="Acquisition Software"
                    multiple
                    outlined
                    chips
                    clearable
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="3" class="d-flex justify-end align-center mb-4">
                  <v-btn
                    color="primary"
                    variant="flat"
                    size="small"
                    class="mr-2"
                    title="Add new software"
                    @click="showSoftwareModal = true"
                  >
                    <v-icon start>mdi-plus</v-icon> Add
                  </v-btn>
                  <v-btn
                    color="secondary"
                    variant="flat"
                    size="small"
                    title="Edit selected software"
                    @click="openEditSoftDialog"
                    :disabled="!formData.equipment.acquisition_software.length"
                  >
                    <v-icon start>mdi-pencil</v-icon> Edit
                  </v-btn>
                </v-col>
              </v-row>

              <!-- Modals software unifiés -->
              <SoftwareModal
                v-model="showSoftwareModal"
                :software-id="editSoftwareId ?? undefined"
                :edit-mode="!!editSoftwareId"
                @saved="fetchSelectableData"
              />
              <CreateSoftwareVersionModal
                v-if="createdSoftwareId"
                v-model="showSoftwareVersionModal"
                :software-id="createdSoftwareId"
                @created="fetchSelectableData"
              />
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>
    </v-card>

    <HardwareModal
      v-model="newHardwareDialog"
      :hardware-type="hardwareTypeForModal"
      @saved="fetchSelectableData"
    />

    <HardwareModal
      v-model="editHardwareDialog"
      :hardware-id="editHardwareId"
      :hardware-type="hardwareTypeForModal"
      @saved="fetchSelectableData"
    />

    <!-- Dialog creation laboratory -->
    <LaboratoryModal v-model="newLabDialog" @saved="fetchSelectableData" />

    <!-- Dialog edition laboratory -->
    <LaboratoryModal v-model="editLabDialog" :edit-id="editLabId" @saved="fetchSelectableData" />
    <!-- Snackbar notifications -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>
