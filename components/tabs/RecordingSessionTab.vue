<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import Vjsf from '@koumoul/vjsf';
import {
  VForm,
  VSnackbar,
  VBtn,
  VIcon,
  VSelect,
  VAutocomplete,
  VToolbar,
  VSpacer,
} from 'vuetify/components';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { useAuth } from '@/composables/useAuth';

const data = ref({});
const schema = ref(null);
const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();

const vjsfRef = ref(null);
const formRef = ref(null);
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');
const isSaving = ref(false);

const recordId = ref(null);
const recordingSessions = ref([]);
const selectedRecordingSession = ref(null);

// --- Études déjà existantes
const studiesOptions = ref([]); // tableau d'objets {id, name}
const studySearch = ref('');

// Fetch études depuis API
async function fetchStudies() {
  try {
    const headers = token ? { Authorization: `Bearer ${token.value}` } : {};
    const res = await fetch(`${apiBaseUrl}/study/`, { headers });
    if (res.ok) {
      const json = await res.json();
      studiesOptions.value = json.results ?? json;
    }
  } catch (e) {
    console.error(e);
    showSnackbar('Error fetching studies', 'error');
  }
}

// Fonction création nouvelle étude
async function createNewStudy(name) {
  if (!name || name.trim() === '') return;
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token.value}` } : {}),
    };
    const res = await fetch(`${apiBaseUrl}/study/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create study');
    const newStudy = await res.json();
    studiesOptions.value.push(newStudy);
    if (!data.value.studies) data.value.studies = [];
    // Ajouter objet complet (pas seulement l'id)
    data.value.studies.push(newStudy);
    studySearch.value = '';
    showSnackbar(`Study "${name}" created`, 'success');
  } catch (e) {
    console.error(e);
    showSnackbar('Error creating study', 'error');
  }
}

// Computed list pour VAutocomplete avec option création dynamique
const computedStudies = computed(() => {
  const searchLower = studySearch.value.toLowerCase();
  const filtered = studiesOptions.value.filter((s) => s.name.toLowerCase().includes(searchLower));
  const exactMatch = filtered.some(
    (s) => s.name.toLowerCase() === searchLower && searchLower !== ''
  );
  if (studySearch.value !== '' && !exactMatch) {
    return [...filtered, { id: -1, name: `Create new study "${studySearch.value}"` }];
  }
  return filtered;
});

// Watcher pour gérer sélection option "Créer"
function onStudiesChange(newValue) {
  if (!Array.isArray(newValue)) return;
  if (newValue.some((item) => item.id === -1)) {
    // Retirer l'option "Créer"
    const filtered = newValue.filter((item) => item.id !== -1);
    data.value.studies = filtered;
    createNewStudy(studySearch.value);
  } else {
    data.value.studies = newValue;
  }
}

// --- Utils & fonctions restantes

const baseUrl = `${apiBaseUrl}/schema/`;

async function resolveRefs(obj, baseUrl) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (obj.$ref && !obj.$ref.startsWith('http')) {
    const refUrl = baseUrl + obj.$ref;
    const refSchema = await fetch(refUrl).then((res) => res.json());
    delete refSchema.$schema;
    return resolveRefs(refSchema, baseUrl);
  }
  for (const key in obj) {
    obj[key] = await resolveRefs(obj[key], baseUrl);
  }
  delete obj.$schema;
  return obj;
}

function removeIdFieldsFromSchema(schema) {
  if (schema.type === 'object' && schema.properties) {
    const newSchema = { ...schema, properties: { ...schema.properties } };
    delete newSchema.properties.id;
    if (newSchema.required) {
      newSchema.required = newSchema.required.filter((field) => field !== 'id');
    }
    for (const key in newSchema.properties) {
      newSchema.properties[key] = removeIdFieldsFromSchema(newSchema.properties[key]);
    }
    return newSchema;
  } else if (schema.type === 'array' && schema.items) {
    return { ...schema, items: removeIdFieldsFromSchema(schema.items) };
  }
  return schema;
}

function convertToIdFields(payload) {
  const newPayload = { ...payload };
  const idMappings = [
    ['protocol', 'protocol_id'],
    ['studies', 'study_ids'],
    ['laboratory', 'laboratory_id'],
    ['animal_profiles', 'animal_profile_ids'],
    ['equipment_acquisition_software', 'equipment_acquisition_software_ids'],
    ['equipment_acquisition_hardware_soundcards', 'equipment_acquisition_hardware_soundcard_ids'],
    ['equipment_acquisition_hardware_speakers', 'equipment_acquisition_hardware_speaker_ids'],
    ['equipment_acquisition_hardware_amplifiers', 'equipment_acquisition_hardware_amplifier_ids'],
    ['equipment_acquisition_hardware_microphones', 'equipment_acquisition_hardware_microphone_ids'],
  ];

  idMappings.forEach(([field, idField]) => {
    if (newPayload[field]) {
      if (Array.isArray(newPayload[field])) {
        newPayload[idField] = newPayload[field].map((item) => item.id ?? item);
      } else if (newPayload[field]?.id) {
        newPayload[idField] = newPayload[field].id;
      }
      delete newPayload[field];
    }
  });

  return newPayload;
}

function showSnackbar(message, color = 'success') {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

async function fetchRecordingSessions() {
  try {
    const headers = token ? { Authorization: `Bearer ${token.value}` } : {};
    const res = await fetch(`${apiBaseUrl}/recording-session/`, { headers });
    const dataRes = await res.json();
    recordingSessions.value = dataRes.results ?? dataRes;
  } catch (e) {
    console.error(e);
    showSnackbar('Error fetching recording sessions', 'error');
  }
}

async function loadSchema() {
  try {
    const res = await fetch(`${baseUrl}recording_session.json`);
    const jsonSchema = await res.json();
    delete jsonSchema.$schema;
    const resolved = await resolveRefs(jsonSchema, baseUrl);
    schema.value = removeIdFieldsFromSchema(resolved);
  } catch (e) {
    console.error(e);
    showSnackbar('Error loading schema', 'error');
  }
}

// Lorsqu'on change de session, charger les données + s'assurer que studies est un tableau d'objets
watch(selectedRecordingSession, async (newId) => {
  if (!newId) {
    data.value = {};
    recordId.value = null;
    return;
  }
  try {
    const res = await fetch(`${apiBaseUrl}/recording-session/${newId}/`, {
      headers: token ? { Authorization: `Bearer ${token.value}` } : {},
    });
    const sessionData = await res.json();

    // S'assurer que studies contient bien des objets complets {id, name}
    if (sessionData.studies && Array.isArray(sessionData.studies)) {
      sessionData.studies = sessionData.studies.map((study) => {
        if (typeof study === 'object') return study;
        return studiesOptions.value.find((s) => s.id === study) || { id: study, name: 'Unknown' };
      });
    }

    data.value = sessionData;
    recordId.value = newId;
    showSnackbar('Recording session loaded', 'success');
  } catch (e) {
    console.error(e);
    showSnackbar('Error loading recording session', 'error');
  }
});

async function saveMetadata() {
  const isValid = await formRef.value.validate();
  if (!isValid) {
    showSnackbar('Form is invalid, please check fields.', 'error');
    return;
  }

  isSaving.value = true;
  const payload = convertToIdFields(data.value);
  const url = recordId.value
    ? `${apiBaseUrl}/recording-session/${recordId.value}/`
    : `${apiBaseUrl}/recording-session/`;
  const method = recordId.value ? 'PATCH' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token.value}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(err);
      showSnackbar('Error saving metadata', 'error');
      return;
    }

    const result = await res.json();
    showSnackbar(recordId.value ? 'Recording session updated!' : 'Recording session created!');

    if (!recordId.value) {
      data.value = {};
      await fetchRecordingSessions();
    } else {
      data.value = result;
    }
  } catch (e) {
    console.error(e);
    showSnackbar('Network error while saving.', 'error');
  } finally {
    isSaving.value = false;
  }
}

// Init
onMounted(async () => {
  await loadSchema();
  await fetchRecordingSessions();
  await fetchStudies();
});
</script>

<template>
  <v-form ref="formRef">
    <!-- Recording Session Selector -->
    <v-select
      class="mb-4 mt-2"
      v-model="selectedRecordingSession"
      :items="recordingSessions.map((s) => ({ title: s.name, value: s.id }))"
      label="Select Recording Session to Edit"
      clearable
    />

    <!-- Study selector multi-creatable -->
    <v-autocomplete
      v-model="data.studies"
      :items="computedStudies"
      item-title="name"
      item-value="id"
      label="Associated Studies"
      multiple
      chips
      deletable-chips
      :search-input.sync="studySearch"
      hide-selected
      clearable
      small-chips
      :filter="
        (item, queryText, itemText) => item.name.toLowerCase().includes(queryText.toLowerCase())
      "
      @change="onStudiesChange"
      class="mb-4"
    />

    <div class="d-none d-sm-flex align-center mb-4" style="width: 100%">
      <h3>Metadata for recording session</h3>
      <v-spacer />
      <v-btn color="primary" :loading="isSaving" @click="saveMetadata">
        <v-icon start>mdi-content-save</v-icon>
        Save
      </v-btn>
    </div>

    <!-- Schema Form (sans studies car géré au-dessus) -->
    <vjsf
      v-if="schema"
      ref="vjsfRef"
      v-model="data"
      :schema="schema"
      :options="{ titleDepth: 4 }"
      style="width: 100%; box-sizing: border-box"
    />
    <div v-else>Loading schema...</div>

    <!-- Save Button Mobile -->
    <v-toolbar app bottom class="d-flex d-sm-none" color="background" elevation="4">
      <v-spacer />
      <v-btn color="primary" :loading="isSaving" @click="saveMetadata">
        <v-icon start>mdi-content-save</v-icon>
        Save
      </v-btn>
      <v-spacer />
    </v-toolbar>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" location="top">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-form>
</template>
