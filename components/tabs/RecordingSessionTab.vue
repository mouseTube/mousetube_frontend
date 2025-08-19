<script setup lang="ts">
////////////////////////////////
// IMPORTS
////////////////////////////////
import { ref, computed, onMounted, watch } from 'vue';
import { useRecordingSessionStore, type RecordingSession } from '@/stores/recordingSession';
import { useHardwareStore } from '@/stores/hardware';
import { useSoftwareStore } from '@/stores/software';
import { useStudyStore } from '@/stores/study';
import { useLaboratoryStore } from '~/stores/laboratory';
import SoftwareSelectionModal from '../modals/SoftwareSelectionModal.vue';
import LaboratoryModal from '@/components/modals/LaboratoryModal.vue';
import HardwareModal from '@/components/modals/HardwareModal.vue';
import SelectSessionModal from '@/components/modals/SessionModal.vue';
import StudyModal from '@/components/modals/CreateStudyModal.vue';
import HardwareSelectionModal from '@/components/modals/HardwareSelectionModal.vue';
import type { SoftwareVersion } from '@/stores/software';
import { useAuth } from '@/composables/useAuth';
import { useRouter } from 'vue-router';
import StudySelectionModal from '@/components/modals/StudySelectionModal.vue';

////////////////////////////////
// STORES
////////////////////////////////
const recordingSessionStore = useRecordingSessionStore();
const studyStore = useStudyStore();
const laboratoryStore = useLaboratoryStore();
const hardwareStore = useHardwareStore();
const softwareStore = useSoftwareStore();
const auth = useAuth();
const router = useRouter();

////////////////////////////////
// EMITS
////////////////////////////////
const emit = defineEmits(['validate', 'session-selected']);

////////////////////////////////
// DATA & STATE
////////////////////////////////
const formRef = ref<any>();
const dateMenu = ref(false);
const date = ref<Date | null>(null);
const time = ref<string | null>(null);

const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

const selectedSessionId = ref<'new' | 'select' | number>('new');

const selectedSessionObject = ref<RecordingSession | null>(null);
const selectedSessionName = ref<string>('');

const formattedDate = ref('');

const laboratoriesOptions = ref<any[]>([]);
const studiesOptions = ref<any[]>([]);
const hardwareOptions = ref<any[]>([]);
const softwareOptions = ref<any[]>([]);
const showSoftwareSelectionModal = ref(false);
const newHardwareDialog = ref(false);
const editHardwareDialog = ref(false);
const editHardwareId = ref<number | null>(null);
const hardwareTypeForModal = ref<'soundcard' | 'microphone' | 'speaker' | 'amplifier' | ''>('');
const acquisitionSoftwareDisplay = ref<{ id: number; label: string }[]>([]);
const formData = ref({
  name: '',
  description: '',
  date: null as string | null,
  duration: null as number | null,
  studies: [] as number[],
  context: {
    temperature: { value: '' as string | null, unit: '' as '' | '°C' | '°F' },
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
const newStudyDialog = ref(false);
const newLabDialog = ref(false);
const editLabDialog = ref(false);
const editLabId = ref<number | null>(null);

const showSessionSelectModal = ref(false);
const showHardwareSelectionModal = ref(false);
const selectedHardwareList = computed(
  () => formData.value.equipment[currentHardwareCategory.value]
);

const soundcardsDisplay = ref<{ id: number; label: string }[]>([]);
const microphonesDisplay = ref<{ id: number; label: string }[]>([]);
const amplifiersDisplay = ref<{ id: number; label: string }[]>([]);
const speakersDisplay = ref<{ id: number; label: string }[]>([]);
type HardwareTypeKeys = 'soundcard' | 'microphone' | 'speaker' | 'amplifier';
type HardwareArrayKeys = 'soundcards' | 'microphones' | 'amplifiers' | 'speakers';

////////////////////////////////
// COMPUTED
////////////////////////////////
// const formattedDate = computed(() => {
//   if (date.value && time.value) {
//     return `${date.value} ${time.value}`;
//   }
//   return '';
// });

const selectItems = computed(() => {
  const items: Array<{ id: string | number; name: string }> = [
    { id: 'new', name: 'Create New Session' },
    { id: 'select', name: 'Select Existing Session' },
  ];
  if (selectedSessionObject.value) {
    items.push({ id: selectedSessionObject.value.id, name: selectedSessionObject.value.name });
  }
  return items;
});

////////////////////////////////
// METHODS
////////////////////////////////

const hardwareTypeForSelection = ref<HardwareTypeKeys | ''>('');
const currentHardwareCategory = ref<HardwareArrayKeys>('soundcards');

function openHardwareSelectionModal(type: HardwareTypeKeys, category: HardwareArrayKeys) {
  hardwareTypeForSelection.value = type;
  currentHardwareCategory.value = category;
  showHardwareSelectionModal.value = true;
}

function updateSelectedHardwareIds(field: HardwareArrayKeys, ids: number[]) {
  formData.value.equipment[field] = ids;

  const displayList = ids
    .map((id) => {
      const hw = hardwareStore.hardwares.find((h) => h.id === id);
      return hw ? { id: hw.id!, label: hw.name } : null;
    })
    .filter((x): x is { id: number; label: string } => x !== null);

  if (field === 'soundcards') soundcardsDisplay.value = displayList;
  if (field === 'microphones') microphonesDisplay.value = displayList;
  if (field === 'amplifiers') amplifiersDisplay.value = displayList;
  if (field === 'speakers') speakersDisplay.value = displayList;
}

function removeHardware(field: HardwareArrayKeys, id: number) {
  formData.value.equipment[field] = formData.value.equipment[field].filter((i) => i !== id);
  updateSelectedHardwareIds(field, formData.value.equipment[field]);
}

/* Show a snackbar notification with the given message and color. */
function showSnackbar(message: string, color: string) {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

/* Reset the form to empty values (used when 'new' is selected). */
function resetForm() {
  formData.value = {
    name: '',
    description: '',
    date: null,
    duration: null,
    studies: [],
    context: {
      temperature: { value: '', unit: '' },
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
  selectedSessionObject.value = null;
  selectedSessionName.value = '';
  emit('session-selected', null);
}

function updateDate(newDate: Date | null) {
  date.value = newDate;
  tryMergeDateTime();
}

function updateTime(newTime: string | null) {
  time.value = newTime;
  tryMergeDateTime();
}

// ----- merge date + time -----
function tryMergeDateTime() {
  let dateStr = '';
  let timeStr = '';

  if (date.value) {
    dateStr = date.value.toISOString().slice(0, 10); // YYYY-MM-DD
    timeStr = time.value || date.value.toTimeString().slice(0, 5); // HH:mm
  } else if (time.value) {
    timeStr = time.value;
  }

  // Affichage lisible immédiat
  formattedDate.value = dateStr ? `${dateStr} ${timeStr || '00:00'}` : timeStr || '';

  // Stockage ISO backend
  if (!date.value) {
    formData.value.date = null;
    return;
  }

  const isoTime = timeStr || '00:00';
  const datetime = new Date(`${dateStr}T${isoTime}`);
  formData.value.date = !isNaN(datetime.getTime()) ? datetime.toISOString() : null;
}

/* Fetch lists used to populate selects (studies, hardware, software, labs). */
async function fetchSelectableData() {
  try {
    await Promise.all([
      hardwareStore.fetchAllHardware(),
      softwareStore.fetchAllSoftware(),
      studyStore.fetchAllStudies(),
      laboratoryStore.fetchAllLaboratories(),
    ]);
    hardwareOptions.value = hardwareStore.hardwares;
    softwareOptions.value = softwareStore.softwares;
    studiesOptions.value = studyStore.studies;
    laboratoriesOptions.value = laboratoryStore.laboratories;
  } catch (e) {
    showSnackbar('Error loading selectable data.', 'error');
  }
}

/* Open edit dialog for the selected laboratory. */
function openEditLabDialog() {
  const selectedLab = laboratoriesOptions.value.find((lab) => lab.id === formData.value.laboratory);
  if (!selectedLab) {
    showSnackbar('No laboratory selected to edit.', 'error');
    return;
  }
  editLabId.value = selectedLab.id;
  editLabDialog.value = true;
}

/* Save or update the session using the store. Handles both 'new' and existing sessions. */
async function saveSession() {
  // Valide le formulaire
  const isValid = await formRef.value?.validate?.();
  if (!isValid) {
    showSnackbar('Please fill in all required fields.', 'error');
    return;
  }

  // Prépare la date ISO pour le backend
  if (date.value) {
    const dateStr = date.value.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = time.value || '00:00'; // si aucune heure, 00:00 par défaut
    const datetime = new Date(`${dateStr}T${timeStr}`);
    if (!isNaN(datetime.getTime())) {
      formData.value.date = datetime.toISOString();
    } else {
      formData.value.date = null;
      console.error('Invalid date/time combination:', dateStr, timeStr);
      showSnackbar('Invalid date or time selected.', 'error');
      return;
    }
  } else {
    formData.value.date = null;
  }

  try {
    if (selectedSessionId.value === 'new') {
      // Création d’une nouvelle session
      const created = await recordingSessionStore.createSession(formData.value);
      showSnackbar('Session created successfully!', 'success');
      selectedSessionId.value = created.id;
      selectedSessionObject.value = created as RecordingSession;
      selectedSessionName.value = created.name ?? '';

      emit('session-selected', {
        sessionId: created.id,
        protocolId: created.protocol?.id || null,
      });
    } else {
      // Mise à jour d’une session existante
      await recordingSessionStore.updateSession(Number(selectedSessionId.value), formData.value);
      showSnackbar('Session updated successfully!', 'success');

      // Rafraîchit l’objet sélectionné depuis le store
      const updated = await recordingSessionStore.getSessionById(Number(selectedSessionId.value));
      if (updated) {
        selectedSessionObject.value = updated;
        selectedSessionName.value = updated.name ?? '';
      }

      const session = await recordingSessionStore.getSessionById(Number(selectedSessionId.value));
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

function onSessionSelected(session: RecordingSession) {
  selectedSessionId.value = session.id;
  selectedSessionObject.value = session;
  selectedSessionName.value = session.name ?? '';

  formData.value = {
    ...formData.value,
    name: session.name ?? '',
    description: session.description ?? '',
    duration: session.duration ?? null,
    date: session.date ?? null,
    studies: session.studies?.map((s) => s.id) ?? [],
    context: {
      ...formData.value.context,
      temperature: {
        value: session.context_temperature_value ?? '',
        unit: session.context_temperature_unit ?? '',
      },
      brightness: session.context_brightness ?? null,
    },
    equipment: {
      ...formData.value.equipment,
      channels: session.equipment_channels ?? '',
      sound_isolation: session.equipment_sound_isolation ?? '',
      soundcards: session.equipment_acquisition_hardware_soundcards?.map((h) => h.id) ?? [],
      microphones: session.equipment_acquisition_hardware_microphones?.map((h) => h.id) ?? [],
      amplifiers: session.equipment_acquisition_hardware_amplifiers?.map((h) => h.id) ?? [],
      speakers: session.equipment_acquisition_hardware_speakers?.map((h) => h.id) ?? [],
      acquisition_software:
        session.equipment_acquisition_software?.map((soft: SoftwareVersion) => soft.id) ?? [],
    },
    laboratory: session.laboratory?.id ?? null,
  };

  if (session.date) {
    const d = new Date(session.date);
    if (!isNaN(d.getTime())) {
      date.value = d; // <-- objet Date
      time.value = d.toTimeString().slice(0, 5); // string HH:mm
      formattedDate.value = `${d.toISOString().slice(0, 10)} ${time.value}`; // string pour affichage
    } else {
      date.value = null;
      time.value = null;
      formattedDate.value = '';
    }
  } else {
    date.value = null;
    time.value = null;
    formattedDate.value = '';
  }

  (['soundcards', 'microphones', 'amplifiers', 'speakers'] as HardwareArrayKeys[]).forEach(
    (key) => {
      updateSelectedHardwareIds(key, formData.value.equipment[key]);
    }
  );

  acquisitionSoftwareDisplay.value =
    session.equipment_acquisition_software?.map((soft: SoftwareVersion) => {
      const softwareName = soft.software?.name || 'Unknown';
      const versionName = soft.version || '';
      return {
        id: soft.id,
        label: `${softwareName}${versionName ? ' – ' + versionName : ''}`,
      };
    }) ?? [];

  emit('session-selected', {
    sessionId: session.id,
    protocolId: session.protocol?.id ?? null,
  });
}

function removeSoftware(softwareId: number) {
  acquisitionSoftwareDisplay.value = acquisitionSoftwareDisplay.value.filter(
    (soft) => soft.id !== softwareId
  );

  formData.value.equipment.acquisition_software =
    formData.value.equipment.acquisition_software.filter((id) => id !== softwareId);
}

function clearHardware(type: 'soundcards' | 'microphones' | 'amplifiers' | 'speakers') {
  formData.value.equipment[type] = [];
  updateSelectedHardwareIds(type, []); // <-- vide aussi la sélection affichée
}

function clearSoftware() {
  formData.value.equipment.acquisition_software = [];
  acquisitionSoftwareDisplay.value = []; // <-- vide aussi l'affichage
}
////////////////////////////////
// STUDIES HANDLING
////////////////////////////////

// Affichage des études sélectionnées sous forme de chips
const selectedStudiesDisplay = computed(() => {
  return formData.value.studies
    .map((id) => studiesOptions.value.find((s) => s.id === id))
    .filter((s): s is { id: number; name: string } => !!s);
});

// Ouvre la modale de sélection des études
const showStudySelectionModal = ref(false);

function openStudySelectionModal() {
  showStudySelectionModal.value = true;
}

// Supprime une étude de la sélection
function removeStudy(id: number) {
  formData.value.studies = formData.value.studies.filter((sId) => sId !== id);
}

function clearAllStudies() {
  formData.value.studies = [];
}

////////////////////////////////
// WATCHERS
////////////////////////////////

watch(selectedSessionId, (newId, oldId) => {
  if (newId === 'select') {
    showSessionSelectModal.value = true;
    selectedSessionId.value = oldId ?? 'new';
    return;
  }
  if (!newId || newId === 'new') {
    resetForm();
    emit('session-selected', null);
    return;
  }
  const idNum = Number(newId);
});

function handleSessionSelection(newId: 'new' | 'select' | number) {
  if (newId === 'select') {
    showSessionSelectModal.value = true;
    selectedSessionId.value = selectedSessionObject.value?.id ?? 'new';
  } else if (newId === 'new') {
    resetForm();
  } else {
    recordingSessionStore.getSessionById(Number(newId)).then((session) => {
      if (session) {
        onSessionSelected(session);
      }
    });
  }
}

function onUpdateSelectedSoftwareVersions(val: number[]) {
  formData.value.equipment.acquisition_software = [...val];
  acquisitionSoftwareDisplay.value = val
    .map((id) => {
      const sv = softwareStore.getSoftwareVersionById(id);
      if (!sv) return null;
      return {
        id: sv.id,
        label: `${sv.software.name}${sv.version ? ' – ' + sv.version : ''}`,
      };
    })
    .filter(Boolean) as { id: number; label: string }[];
}

////////////////////////////////
// LIFECYCLE
////////////////////////////////

/* Component mounted: fetch lists and prefetch first page of sessions for modal */
onMounted(async () => {
  if (!auth.loggedIn.value) {
    router.push('/account/login');
    return;
  }
  await fetchSelectableData();
  // Prefetch first page for modal convenience (modal also fetches on open)
  await recordingSessionStore.fetchSessionsPage(1);
});
</script>

<template>
  <v-container>
    <v-select
      v-model="selectedSessionId"
      :items="selectItems"
      item-title="name"
      item-value="id"
      label="Select Recording Session"
      outlined
      dense
      class="mb-4"
      :value-comparator="(a, b) => a === b"
      @change="handleSessionSelection"
    >
    </v-select>

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

          <!-- Date / Time -->
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
            class="mb-1"
          />

          <!-- Studies -->
          <v-row class="mb-4" align="center">
            <v-col cols="12" md="12" class="pa-0">
              <v-card outlined class="pa-3 mb-5">
                <v-card-subtitle class="mb-2">Studies</v-card-subtitle>

                <div class="chip-list d-flex flex-wrap align-center">
                  <!-- Chips des études sélectionnées -->
                  <v-chip
                    v-for="study in selectedStudiesDisplay"
                    :key="study.id"
                    variant="outlined"
                    closable
                    @click:close="removeStudy(study.id)"
                    class="ma-1"
                  >
                    {{ study.name }}
                  </v-chip>

                  <!-- Chip spéciale Clear All -->
                  <v-chip
                    v-if="selectedStudiesDisplay.length > 0"
                    color="primary"
                    variant="outlined"
                    class="ma-1"
                    @click="clearAllStudies"
                  >
                    <v-icon start>mdi-close</v-icon>
                    Clear All
                  </v-chip>

                  <!-- Chip pour ajouter -->
                  <v-chip
                    color="primary"
                    variant="flat"
                    class="ma-1"
                    @click="openStudySelectionModal"
                  >
                    <v-icon start>mdi-plus</v-icon>
                    Select
                  </v-chip>
                </div>
              </v-card>
            </v-col>
          </v-row>

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
                class="mr-2"
                title="Add new laboratory"
                @click="newLabDialog = true"
              >
                <v-icon start>mdi-plus</v-icon> Add
              </v-btn>
              <v-btn
                color="secondary"
                variant="flat"
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
              <v-row class="g-4">
                <!-- g-4 ajoute un gap horizontal et vertical entre les colonnes -->
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
                    v-model.number="formData.context.brightness"
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
              <!-- soundcards -->
              <v-card outlined class="pa-3 mb-5">
                <v-card-subtitle class="mb-2">Soundcards</v-card-subtitle>

                <div class="chip-list d-flex flex-wrap align-center">
                  <!-- Chips -->
                  <v-chip
                    v-for="item in soundcardsDisplay"
                    :key="item.id"
                    variant="outlined"
                    closable
                    @click:close="removeHardware('soundcards', item.id)"
                    class="ma-1"
                  >
                    {{ item.label }}
                  </v-chip>

                  <!-- Clear All -->
                  <v-chip
                    v-if="soundcardsDisplay.length > 0"
                    color="primary"
                    variant="outlined"
                    class="ma-1"
                    @click="clearHardware('soundcards')"
                  >
                    <v-icon start>mdi-close</v-icon> Clear All
                  </v-chip>

                  <!-- Add -->
                  <v-chip
                    color="primary"
                    variant="flat"
                    class="ma-1"
                    @click="openHardwareSelectionModal('soundcard', 'soundcards')"
                  >
                    <v-icon start>mdi-plus</v-icon> Select
                  </v-chip>
                </div>
              </v-card>

              <!-- microphones -->
              <v-card outlined class="pa-3 mb-5">
                <v-card-subtitle class="mb-2">Microphones</v-card-subtitle>

                <div class="chip-list d-flex flex-wrap align-center">
                  <v-chip
                    v-for="item in microphonesDisplay"
                    :key="item.id"
                    variant="outlined"
                    closable
                    @click:close="removeHardware('microphones', item.id)"
                    class="ma-1"
                  >
                    {{ item.label }}
                  </v-chip>

                  <v-chip
                    v-if="microphonesDisplay.length > 0"
                    color="primary"
                    variant="outlined"
                    class="ma-1"
                    @click="clearHardware('microphones')"
                  >
                    <v-icon start>mdi-close</v-icon> Clear All
                  </v-chip>

                  <v-chip
                    color="primary"
                    variant="flat"
                    class="ma-1"
                    @click="openHardwareSelectionModal('microphone', 'microphones')"
                  >
                    <v-icon start>mdi-plus</v-icon> Select
                  </v-chip>
                </div>
              </v-card>

              <!-- amplifiers -->
              <v-card outlined class="pa-3 mb-5">
                <v-card-subtitle class="mb-2">Amplifiers</v-card-subtitle>

                <div class="chip-list d-flex flex-wrap align-center">
                  <v-chip
                    v-for="item in amplifiersDisplay"
                    :key="item.id"
                    variant="outlined"
                    closable
                    @click:close="removeHardware('amplifiers', item.id)"
                    class="ma-1"
                  >
                    {{ item.label }}
                  </v-chip>

                  <v-chip
                    v-if="amplifiersDisplay.length > 0"
                    color="primary"
                    variant="outlined"
                    class="ma-1"
                    @click="clearHardware('amplifiers')"
                  >
                    <v-icon start>mdi-close</v-icon> Clear All
                  </v-chip>

                  <v-chip
                    color="primary"
                    variant="flat"
                    class="ma-1"
                    @click="openHardwareSelectionModal('amplifier', 'amplifiers')"
                  >
                    <v-icon start>mdi-plus</v-icon> Select
                  </v-chip>
                </div>
              </v-card>

              <!-- speakers -->
              <v-card outlined class="pa-3 mb-5">
                <v-card-subtitle class="mb-2">Speakers</v-card-subtitle>

                <div class="chip-list d-flex flex-wrap align-center">
                  <v-chip
                    v-for="item in speakersDisplay"
                    :key="item.id"
                    variant="outlined"
                    closable
                    @click:close="removeHardware('speakers', item.id)"
                    class="ma-1"
                  >
                    {{ item.label }}
                  </v-chip>

                  <v-chip
                    v-if="speakersDisplay.length > 0"
                    color="primary"
                    variant="outlined"
                    class="ma-1"
                    @click="clearHardware('speakers')"
                  >
                    <v-icon start>mdi-close</v-icon> Clear All
                  </v-chip>

                  <v-chip
                    color="primary"
                    variant="flat"
                    class="ma-1"
                    @click="openHardwareSelectionModal('speaker', 'speakers')"
                  >
                    <v-icon start>mdi-plus</v-icon> Select
                  </v-chip>
                </div>
              </v-card>

              <!-- acquisition software -->
              <v-card outlined class="pa-3 mb-5">
                <v-card-subtitle class="mb-2">Acquisition Software Versions</v-card-subtitle>

                <div class="chip-list d-flex flex-wrap align-center">
                  <v-chip
                    v-for="soft in acquisitionSoftwareDisplay"
                    :key="soft.id"
                    variant="outlined"
                    closable
                    @click:close="removeSoftware(soft.id)"
                    class="ma-1"
                  >
                    {{ soft.label }}
                  </v-chip>

                  <v-chip
                    v-if="acquisitionSoftwareDisplay.length > 0"
                    color="primary"
                    variant="outlined"
                    class="ma-1"
                    @click="clearSoftware"
                  >
                    <v-icon start>mdi-close</v-icon> Clear All
                  </v-chip>

                  <v-chip
                    color="primary"
                    variant="flat"
                    class="ma-1"
                    @click="showSoftwareSelectionModal = true"
                  >
                    <v-icon start>mdi-plus</v-icon> Select
                  </v-chip>
                </div>
              </v-card>

              <StudySelectionModal
                v-model="showStudySelectionModal"
                :selectedStudies="formData.studies"
                @update:selectedStudies="(newIds) => (formData.studies = newIds)"
              />

              <HardwareSelectionModal
                v-model="showHardwareSelectionModal"
                :hardware-type="hardwareTypeForSelection"
                :selectedHardwareIds="selectedHardwareList"
                @update:selectedHardwareIds="
                  updateSelectedHardwareIds(currentHardwareCategory, $event)
                "
              />

              <SoftwareSelectionModal
                v-model="showSoftwareSelectionModal"
                :selectedSoftwareVersions="formData.equipment.acquisition_software"
                @update:selectedSoftwareVersions="onUpdateSelectedSoftwareVersions"
              />
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- Session selection modal (modal handles its own pagination/search using the store) -->
    <SelectSessionModal v-model="showSessionSelectModal" @selected="onSessionSelected" />

    <StudyModal v-model="newStudyDialog" @saved="fetchSelectableData" />

    <!-- Hardware modals -->
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

    <!-- Labs -->
    <LaboratoryModal v-model="newLabDialog" @saved="fetchSelectableData" />
    <LaboratoryModal v-model="editLabDialog" :edit-id="editLabId" @saved="fetchSelectableData" />

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip-spacing {
  margin-right: 2px;
  margin-bottom: 2px;
}
</style>
