<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { useAuth } from '@/composables/useAuth';

const emit = defineEmits(['validate', 'protocol-selected']);

const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();

const formRef = ref(null);
const dateMenu = ref(false);
const date = ref(null);
const time = ref(null);
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

const recordingSessionsOptions = ref([]);
const selectedSessionId = ref('new');

const formData = ref({
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
});

const studiesOptions = ref([]);
const hardwareOptions = ref([]);
const softwareOptions = ref([]);

const formattedDate = computed(() => {
  if (date.value && time.value) {
    return `${date.value} ${time.value}`;
  }
  return '';
});

function showSnackbar(message, color) {
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
  };
  date.value = null;
  time.value = null;
}

function updateDate(val) {
  date.value = val;
}
function updateTime(val) {
  time.value = val;
}
function saveDateTime() {
  if (date.value && time.value) {
    const isoString = new Date(`${date.value}T${time.value}`).toISOString();
    formData.value.date = isoString;
    dateMenu.value = false;
  }
}

async function fetchSelectableData() {
  const headers = token.value ? { Authorization: `Bearer ${token.value}` } : {};
  const fetchAndAssign = async (endpoint, target) => {
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
    fetchAndAssign('recording-session', recordingSessionsOptions),
  ]);
}

// Quand on change la session sélectionnée, on remplit ou reset le formulaire
watch(selectedSessionId, (newId) => {
  if (!newId || newId === 'new') {
    resetForm();
    emit('protocol-selected', null);
    return;
  }
  const session = recordingSessionsOptions.value.find((s) => s.id === newId);
  if (session && session.protocol && session.protocol.id) {
    emit('protocol-selected', session.protocol.id);
  } else {
    emit('protocol-selected', null);
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

  formData.value.studies = Array.isArray(session.studies) ? session.studies.map((s) => s.id) : [];

  formData.value.context.temperature.value = session.context_temperature_value ?? null;
  formData.value.context.temperature.unit = session.context_temperature_unit || '°C';
  formData.value.context.brightness = session.context_brightness ?? null;

  formData.value.equipment.channels = session.equipment_channels || '';
  formData.value.equipment.sound_isolation = session.equipment_sound_isolation || '';

  formData.value.equipment.soundcards = Array.isArray(
    session.equipment_acquisition_hardware_soundcards
  )
    ? session.equipment_acquisition_hardware_soundcards.map((h) => h.id)
    : [];

  formData.value.equipment.microphones = Array.isArray(
    session.equipment_acquisition_hardware_microphones
  )
    ? session.equipment_acquisition_hardware_microphones.map((h) => h.id)
    : [];

  formData.value.equipment.amplifiers = Array.isArray(
    session.equipment_acquisition_hardware_amplifiers
  )
    ? session.equipment_acquisition_hardware_amplifiers.map((h) => h.id)
    : [];

  formData.value.equipment.speakers = Array.isArray(session.equipment_acquisition_hardware_speakers)
    ? session.equipment_acquisition_hardware_speakers.map((h) => h.id)
    : [];

  formData.value.equipment.acquisition_software = Array.isArray(
    session.equipment_acquisition_software
  )
    ? session.equipment_acquisition_software.map((soft) => soft.software?.id || soft.id)
    : [];
});

// Sauvegarde (POST ou PUT selon new ou existant)
async function saveSession() {
  const isValid = await formRef.value.validate();
  if (!isValid) {
    showSnackbar('Please fill in all required fields.', 'error');
    return;
  }

  if (date.value && time.value) {
    formData.value.date = new Date(`${date.value}T${time.value}`).toISOString();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
  };

  const method = selectedSessionId.value === 'new' ? 'POST' : 'PUT';
  const url =
    selectedSessionId.value === 'new'
      ? `${apiBaseUrl}/recording-session/`
      : `${apiBaseUrl}/recording-session/${selectedSessionId.value}/`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(formData.value),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(err);
      showSnackbar(`Error saving session: ${err.detail || 'Unknown error'}`, 'error');
      return;
    }

    showSnackbar(`Session ${method === 'POST' ? 'created' : 'updated'} successfully!`, 'success');

    // Si nouveau, recharger la liste pour inclure le nouvel id
    if (method === 'POST') {
      await fetchSelectableData();
      selectedSessionId.value = 'new';
      resetForm();
    } else {
      // Pour PUT, mettre à jour localement l’option
      await fetchSelectableData();
    }
  } catch (e) {
    console.error('Error saving session', e);
    showSnackbar('Error saving session.', 'error');
  }
}

onMounted(() => {
  fetchSelectableData();
});
</script>

<template>
  <v-container>
    <v-card class="pa-6" max-width="900">
      <v-card-title>Recording Session</v-card-title>
      <v-card-text>
        <v-form ref="formRef" lazy-validation>
          <v-select
            v-model="selectedSessionId"
            :items="[{ id: 'new', name: 'Create New Session' }, ...recordingSessionsOptions]"
            item-title="name"
            item-value="id"
            label="Select Recording Session"
            outlined
            dense
            class="mb-6"
          />

          <!-- Session Name -->
          <v-text-field
            v-model="formData.name"
            label="Session Name"
            outlined
            required
            :rules="[(v) => !!v || 'Name is required']"
            class="mb-4"
          />

          <!-- Description -->
          <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />

          <!-- Date & Time picker -->
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
                label="Recording Date"
                readonly
                outlined
                class="mb-4"
                v-bind="props"
                :rules="[(v) => !!v || 'Recording Date is required']"
              />
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

          <!-- Context -->
          <v-card class="pa-4 mb-4" outlined>
            <v-card-title>Context</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <v-text-field
                    v-model="formData.context.temperature.value"
                    label="Temperature Value"
                    type="number"
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
      <v-card-actions>
        <v-btn color="primary" @click="saveSession">Save</v-btn>
      </v-card-actions>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>
