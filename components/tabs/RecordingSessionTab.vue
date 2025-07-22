<script setup lang="ts">
////////////////////////////////
// IMPORTS
////////////////////////////////
import { ref, computed, onMounted, watch } from 'vue';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { useAuth } from '@/composables/useAuth';
import { useRecordingSessionStore } from '@/stores/recordingSession';

////////////////////////////////
// DATA & STATE
////////////////////////////////

const emit = defineEmits(['validate', 'session-selected']);

const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();
const recordingSessionStore = useRecordingSessionStore();

const formRef = ref();
const dateMenu = ref(false);
const date = ref<string | null>(null);
const time = ref<string | null>(null);
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

const selectedSessionId = ref<'new' | number>('new');
const recordingSessionsOptions = computed(() => recordingSessionStore.sessions);

const laboratoriesOptions = ref<
  {
    id: number;
    name: string;
    institution?: string;
    unit?: string;
    address?: string;
    country?: string;
    contact?: string;
  }[]
>([]);

const formData = ref<{
  name: string;
  description: string;
  date: string | null;
  duration: number | null;
  studies: number[];
  context: {
    temperature: { value: string | null; unit: '°C' | '°F' };
    brightness: number | null;
  };
  equipment: {
    channels: '' | 'mono' | 'stereo' | 'more than 2';
    sound_isolation: '' | 'soundproof room' | 'soundproof cage' | 'no specific sound isolation';
    soundcards: number[];
    microphones: number[];
    amplifiers: number[];
    speakers: number[];
    acquisition_software: number[];
  };
  laboratory: number | null;
}>({
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
});

const studiesOptions = ref<{ id: number; name: string }[]>([]);
const hardwareOptions = ref<{ id: number; name: string; type: string }[]>([]);
const softwareOptions = ref<{ id: number; name: string; type: string }[]>([]);

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
    date: '',
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
}

function updateDate(val: string | null) {
  date.value = val;
}

function updateTime(val: string | null) {
  time.value = val;
}

function saveDateTime() {
  if (date.value && time.value) {
    formData.value.date = new Date(`${date.value}T${time.value}`).toISOString();
    dateMenu.value = false;
  }
}

// Récupérer les données des listes
async function fetchSelectableData() {
  const headers: Record<string, string> = {};
  if (token.value) {
    headers.Authorization = `Bearer ${token.value}`;
  }

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

// Watch sélection session
watch(selectedSessionId, (newId) => {
  if (!newId || newId === 'new') {
    resetForm();
    emit('session-selected', null);
    return;
  }

  const idNum = Number(newId);
  const session = recordingSessionStore.getSessionById(idNum);
  if (session && session.id && session.protocol?.id) {
    emit('session-selected', {
      sessionId: session.id,
      protocolId: session.protocol.id,
    });
  } else {
    emit('session-selected', null);
  }

  if (!session) return;

  formData.value.name = session.name || '';
  formData.value.description = session.description || '';
  formData.value.duration = session.duration ?? null;

  formData.value.date = session.date || '';
  if (session.date) {
    const d = new Date(session.date);
    date.value = d.toISOString().slice(0, 10);
    time.value = d.toTimeString().slice(0, 5);
  } else {
    date.value = null;
    time.value = null;
  }

  formData.value.studies = Array.isArray(session.studies)
    ? session.studies.map((s: any) => s.id)
    : [];
  formData.value.context.temperature.value = session.context_temperature_value ?? null;
  formData.value.context.temperature.unit = session.context_temperature_unit || '°C';
  formData.value.context.brightness = session.context_brightness ?? null;

  formData.value.equipment.channels = session.equipment_channels || '';
  formData.value.equipment.sound_isolation = session.equipment_sound_isolation || '';

  formData.value.equipment.soundcards =
    session.equipment_acquisition_hardware_soundcards?.map((h: any) => h.id) ?? [];
  formData.value.equipment.microphones =
    session.equipment_acquisition_hardware_microphones?.map((h: any) => h.id) ?? [];
  formData.value.equipment.amplifiers =
    session.equipment_acquisition_hardware_amplifiers?.map((h: any) => h.id) ?? [];
  formData.value.equipment.speakers =
    session.equipment_acquisition_hardware_speakers?.map((h: any) => h.id) ?? [];
  formData.value.equipment.acquisition_software =
    session.equipment_acquisition_software?.map((soft: any) => soft.software?.id || soft.id) ?? [];

  formData.value.laboratory = session.laboratory?.id ?? null;
});

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
    } else {
      await recordingSessionStore.updateSession(Number(selectedSessionId.value), formData.value);
      showSnackbar('Session updated successfully!', 'success');
    }
  } catch (e) {
    console.error('Error saving session', e);
    showSnackbar('Error saving session.', 'error');
  }
}

////////////////////////////////
// AJOUT LABORATOIRE À LA VOLÉE
////////////////////////////////

const newLabDialog = ref(false);

const newLabForm = ref({
  name: '',
  institution: '',
  unit: '',
  address: '',
  country: '',
  contact: '',
});

async function createNewLaboratory() {
  if (!newLabForm.value.name.trim()) {
    showSnackbar('Laboratory name is required.', 'error');
    return;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/laboratory/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      },
      body: JSON.stringify(newLabForm.value),
    });

    if (!res.ok) throw new Error('Failed to create laboratory');

    const createdLab = await res.json();

    laboratoriesOptions.value.push(createdLab);
    formData.value.laboratory = createdLab.id;

    newLabDialog.value = false;
    newLabForm.value = {
      name: '',
      institution: '',
      unit: '',
      address: '',
      country: '',
      contact: '',
    };

    showSnackbar('Laboratory created and added successfully.', 'success');
  } catch (e) {
    console.error(e);
    showSnackbar('Error creating laboratory.', 'error');
  }
}

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
          <v-btn color="grey" variant="outlined" @click="resetForm" class="mr-2"> Reset </v-btn>
          <v-btn color="primary" @click="saveSession"> Save </v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" lazy-validation>
          <!-- Nom de la session -->
          <v-text-field
            v-model="formData.name"
            outlined
            required
            :rules="[(v) => !!v || 'Name is required']"
            class="mb-4"
          >
            <template #label> Name <span style="color: red">*</span> </template>
          </v-text-field>

          <!-- Description -->
          <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />

          <!-- Date et heure -->
          <v-menu
            v-model="dateMenu"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
            max-width="300"
            min-width="300"
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
              <v-date-picker v-model="date" @update:modelValue="updateDate" />
              <v-time-picker v-model="time" @update:modelValue="updateTime" />
              <v-card-actions>
                <v-spacer />
                <v-btn text @click="saveDateTime">OK</v-btn>
              </v-card-actions>
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

          <!-- Associated Studies -->
          <v-autocomplete
            v-model="formData.studies as any"
            :items="studiesOptions"
            item-title="name"
            item-value="id"
            label="Associated Studies"
            multiple
            outlined
            chips
            class="mb-4"
          />

          <!-- Laboratories avec ajout à la volée -->
          <v-row class="mb-4" align="center">
            <v-col cols="10">
              <v-select
                v-model="formData.laboratory"
                :items="laboratoriesOptions"
                item-title="name"
                item-value="id"
                label="Laboratory"
                outlined
                clearable
              />
            </v-col>
            <v-col cols="2" class="d-flex justify-center">
              <v-btn
                color="primary"
                variant="outlined"
                title="Add new laboratory"
                @click="newLabDialog = true"
              >
                <v-icon left>mdi-plus</v-icon> Add
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
              <v-autocomplete
                v-model="formData.equipment.soundcards"
                :items="hardwareOptions.filter((h) => h.type === 'soundcard')"
                item-title="name"
                item-value="id"
                label="Soundcards"
                multiple
                outlined
                chips
                class="mb-4"
              />
              <v-autocomplete
                v-model="formData.equipment.microphones"
                :items="hardwareOptions.filter((h) => h.type === 'microphone')"
                item-title="name"
                item-value="id"
                label="Microphones"
                multiple
                outlined
                chips
                class="mb-4"
              />
              <v-autocomplete
                v-model="formData.equipment.amplifiers"
                :items="hardwareOptions.filter((h) => h.type === 'amplifier')"
                item-title="name"
                item-value="id"
                label="Amplifiers"
                multiple
                outlined
                chips
                class="mb-4"
              />
              <v-autocomplete
                v-model="formData.equipment.speakers"
                :items="hardwareOptions.filter((h) => h.type === 'speaker')"
                item-title="name"
                item-value="id"
                label="Speakers"
                multiple
                outlined
                chips
                class="mb-4"
              />
              <v-autocomplete
                v-model="formData.equipment.acquisition_software"
                :items="softwareOptions"
                item-title="name"
                item-value="id"
                label="Acquisition Software"
                multiple
                outlined
                chips
                class="mb-4"
              />
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- Dialog ajout laboratoire -->
    <v-dialog v-model="newLabDialog" max-width="500px">
      <v-card>
        <v-card-title>Add New Laboratory</v-card-title>
        <v-card-text>
          <v-form>
            <v-text-field v-model="newLabForm.name" label="Name *" required autofocus />
            <v-text-field v-model="newLabForm.institution" label="Institution" />
            <v-text-field v-model="newLabForm.unit" label="Unit" />
            <v-text-field v-model="newLabForm.address" label="Address" />
            <v-text-field v-model="newLabForm.country" label="Country" />
            <v-text-field v-model="newLabForm.contact" label="Contact" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="newLabDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="createNewLaboratory">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>
