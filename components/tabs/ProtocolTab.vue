<script setup lang="ts">
////////////////////////////////
// IMPORTS
////////////////////////////////
import { ref, computed, watch, onMounted } from 'vue';
import { useProtocolStore, type Protocol } from '@/stores/protocol';
import { useRecordingSessionStore } from '@/stores/recordingSession';
import { type Species, useSpeciesStore } from '@/stores/species';
import ProtocolSelectModal from '@/components/modals/ProtocolSelectModal.vue';

////////////////////////////////
// PROPS
////////////////////////////////
const props = defineProps<{
  selectedProtocolId: number | null;
  selectedRecordingSessionId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:selectedProtocolId', value: number | null): void;
}>();

////////////////////////////////
// STORES
////////////////////////////////
const protocolStore = useProtocolStore();
const recordingSessionStore = useRecordingSessionStore();
const speciesStore = useSpeciesStore();

////////////////////////////////
// STATE
////////////////////////////////
const selectedProtocolIdRef = ref<'new' | 'select' | number>(props.selectedProtocolId ?? 'new');
const selectedProtocolObject = ref<Protocol | null>(null);
const showProtocolSelectModal = ref(false);
const isSaveEnabled = ref(false);
const initialFormData = ref('');

const formData = ref({
  name: '',
  description: '',
  animals: { sex: '', age: '', housing: '', species: 1 },
  context: {
    number_of_animals: null as number | null,
    duration: '',
    cage: '',
    bedding: '',
    light_cycle: '',
    temperature: { value: '' as string | number | null, unit: '' },
    brightness: null as number | null,
  },
});

const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

////////////////////////////////
// COMPUTED
////////////////////////////////
const selectItems = computed(() => {
  const items: Array<{ id: string | number; name: string }> = [
    { id: 'new', name: 'Create New Protocol' },
    { id: 'select', name: 'Select Existing Protocol' },
  ];
  if (selectedProtocolObject.value && typeof selectedProtocolObject.value.id === 'number') {
    items.push({
      id: selectedProtocolObject.value.id,
      name: selectedProtocolObject.value.name,
    });
  }

  return items;
});

////////////////////////////////
// FUNCTIONS
////////////////////////////////
function resetForm() {
  formData.value = {
    name: '',
    description: '',
    animals: { sex: '', age: '', housing: '', species: 1 },
    context: {
      number_of_animals: null,
      duration: '',
      cage: '',
      bedding: '',
      light_cycle: '',
      temperature: { value: '', unit: '' },
      brightness: null,
    },
  };
  selectedProtocolObject.value = null;
  initialFormData.value = snapshotFormData(formData.value);
  selectedProtocolIdRef.value = 'new';
  emit('update:selectedProtocolId', null);
}

function mapProtocolToFormData(protocol: Protocol) {
  return {
    name: protocol.name,
    description: protocol.description ?? '',
    animals: {
      sex: (protocol as any).animals_sex ?? protocol.animals?.sex ?? '',
      age: (protocol as any).animals_age ?? protocol.animals?.age ?? '',
      housing: (protocol as any).animals_housing ?? protocol.animals?.housing ?? '',
      species: (protocol as any).animals_species?.id ?? protocol.animals?.species?.id ?? null,
    },
    context: {
      number_of_animals:
        (protocol as any).context_number_of_animals ?? protocol.context?.number_of_animals ?? null,
      duration: (protocol as any).context_duration ?? protocol.context?.duration ?? '',
      cage: (protocol as any).context_cage ?? protocol.context?.cage ?? '',
      bedding: (protocol as any).context_bedding ?? protocol.context?.bedding ?? '',
      light_cycle: (protocol as any).context_light_cycle ?? protocol.context?.light_cycle ?? '',
      temperature: {
        value:
          (protocol as any).context_temperature_value ?? protocol.context?.temperature?.value ?? '',
        unit:
          (protocol as any).context_temperature_unit ?? protocol.context?.temperature?.unit ?? '',
      },
      brightness: (protocol as any).context_brightness ?? protocol.context?.brightness ?? null,
    },
  };
}

async function loadProtocol(protocolId: number) {
  const protocol = await protocolStore.getProtocolById(protocolId);

  if (protocol) {
    selectedProtocolObject.value = protocol;
    selectedProtocolIdRef.value = protocol.id;
    formData.value = mapProtocolToFormData(protocol);
    initialFormData.value = snapshotFormData(formData.value);
  } else {
    resetForm();
  }
}

function onProtocolSelected(protocol: Protocol) {
  selectedProtocolObject.value = protocol;
  selectedProtocolIdRef.value = protocol.id;
  formData.value = mapProtocolToFormData(protocol);
  initialFormData.value = snapshotFormData(formData.value);
  showProtocolSelectModal.value = false;
}

function handleProtocolSelection(newId: 'new' | 'select' | number) {
  if (newId === 'new') {
    resetForm();
  } else if (newId === 'select') {
    showProtocolSelectModal.value = true;
  } else {
    loadProtocol(Number(newId));
  }
}

async function onSubmit() {
  try {
    let protocolId: number;
    const payload = {
      ...formData.value,
      animals: {
        ...formData.value.animals,
        species: formData.value.animals.species
          ? speciesStore.getSpeciesById(formData.value.animals.species)
          : null,
      },
    };

    if (selectedProtocolIdRef.value !== 'new' && typeof selectedProtocolIdRef.value === 'number') {
      const updated = await protocolStore.updateProtocol(selectedProtocolIdRef.value, payload);
      protocolId = updated.id;
      selectedProtocolObject.value = updated;
      formData.value = mapProtocolToFormData(updated);
      initialFormData.value = snapshotFormData(formData.value);
      snackbarMessage.value = 'Protocol updated successfully.';
      snackbarColor.value = 'success';
    } else {
      const created = await protocolStore.createProtocol(payload);
      protocolId = created.id;
      selectedProtocolObject.value = created;
      selectedProtocolIdRef.value = created.id;
      formData.value = mapProtocolToFormData(created);
      initialFormData.value = snapshotFormData(formData.value);
      snackbarMessage.value = 'Protocol created successfully.';
      snackbarColor.value = 'success';
    }

    snackbar.value = true;
    initialFormData.value = snapshotFormData(formData.value);
    if (props.selectedRecordingSessionId !== null) {
      await recordingSessionStore.updateSessionProtocol(
        props.selectedRecordingSessionId,
        protocolId
      );
      snackbarMessage.value += ' Linked to recording session.';
    }
  } catch (err: any) {
    snackbarMessage.value = 'Error saving protocol.';
    snackbarColor.value = 'error';
    snackbar.value = true;
    console.error(err);
  }
}

function snapshotFormData(data: typeof formData.value) {
  return JSON.stringify(JSON.parse(JSON.stringify(data)));
}

////////////////////////////////
// WATCHERS
////////////////////////////////
watch(
  () => props.selectedProtocolId,
  (newId) => {
    if (newId !== null) loadProtocol(newId);
    else resetForm();
  },
  { immediate: true }
);

watch(
  () => props.selectedRecordingSessionId,
  async (newId) => {
    if (newId !== null) {
      const session = await recordingSessionStore.getSessionById(newId);
      if (session?.protocol) {
        await loadProtocol(session.protocol.id);
      }
    }
  },
  { immediate: true }
);

watch(
  formData,
  (newVal) => {
    isSaveEnabled.value = snapshotFormData(newVal) !== initialFormData.value;
  },
  { deep: true }
);

////////////////////////////////
// ON MOUNT
////////////////////////////////
onMounted(async () => {
  await speciesStore.fetchSpecies();
  if (!props.selectedProtocolId && !selectedProtocolObject.value) {
    const defaultSpecies = speciesStore.getSpeciesById(1);
    if (defaultSpecies) formData.value.animals.species = defaultSpecies.id;
  }
  let protocolIdToLoad: number | null = null;
  if (props.selectedProtocolId) {
    protocolIdToLoad = props.selectedProtocolId;
  } else if (props.selectedRecordingSessionId) {
    const session = await recordingSessionStore.getSessionById(props.selectedRecordingSessionId);
    protocolIdToLoad = session?.protocol?.id ?? null;
  }
  if (protocolIdToLoad) {
    const protocol = await protocolStore.getProtocolById(protocolIdToLoad);
    if (protocol) {
      selectedProtocolObject.value = protocol;
      selectedProtocolIdRef.value = protocol.id;
      formData.value = mapProtocolToFormData(protocol);
      initialFormData.value = snapshotFormData(formData.value);
    } else {
      resetForm();
    }
  } else {
  }
});
</script>

<template>
  <v-container>
    <v-select
      v-model="selectedProtocolIdRef"
      :items="selectItems"
      item-title="name"
      item-value="id"
      label="Select Protocol"
      outlined
      dense
      :value-comparator="(a, b) => a === b"
      @update:modelValue="handleProtocolSelection"
    />

    <!-- Form Card -->
    <v-card class="pa-6" outlined>
      <v-card-title class="d-flex justify-space-between align-center mb-4">
        <h3>Protocol Metadata</h3>
        <div>
          <v-btn color="grey" variant="outlined" @click="resetForm" class="mr-2">Reset</v-btn>
          <v-btn color="primary" @click="onSubmit" :disabled="!isSaveEnabled">Save</v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <v-text-field v-model="formData.name" outlined required class="mb-4">
          <template #label>Protocol Name <span style="color: red">*</span></template>
        </v-text-field>
        <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />

        <!-- Animal Information -->
        <v-card class="pa-4 mb-4" outlined>
          <v-card-title>Animal Information</v-card-title>
          <v-card-text>
            <v-select
              v-model="formData.animals.sex"
              :items="['male(s)', 'female(s)', 'male(s) & female(s)']"
              label="Sex"
              outlined
              class="mb-4"
            />
            <v-select
              v-model="formData.animals.age"
              :items="['pup', 'juvenile', 'adult']"
              label="Age"
              outlined
              class="mb-4"
            />
            <v-select
              v-model="formData.animals.housing"
              :items="['grouped', 'isolated', 'grouped & isolated']"
              label="Housing"
              outlined
              class="mb-4"
            />
            <v-select
              v-model="formData.animals.species"
              :items="speciesStore.species"
              item-title="name"
              item-value="id"
              label="Species"
              outlined
              dense
            />
          </v-card-text>
        </v-card>

        <!-- Experimental Context -->
        <v-card class="pa-4 mb-4" outlined>
          <v-card-title>Experimental Context</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="formData.context.number_of_animals"
              label="Number of Animals"
              type="number"
              outlined
              class="mb-4"
              @input="
                (val: string) =>
                  (formData.context.number_of_animals = val === '' ? null : Number(val))
              "
            />
            <v-select
              v-model="formData.context.duration"
              :items="['short term (<1h)', 'mid term (<1day)', 'long term (>=1day)']"
              label="Duration"
              outlined
              class="mb-4"
            />
            <v-select
              v-model="formData.context.cage"
              :items="['unfamiliar test cage', 'familiar test cage', 'home cage']"
              label="Cage Type"
              outlined
              class="mb-4"
            />
            <v-select
              v-model="formData.context.bedding"
              :items="['bedding', 'no bedding']"
              label="Bedding"
              outlined
              class="mb-4"
            />
            <v-select
              v-model="formData.context.light_cycle"
              :items="['day', 'night']"
              label="Light Cycle"
              outlined
              class="mb-4"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="formData.context.temperature.value"
                  label="Temperature Value"
                  type="number"
                  outlined
                  @input="
                    (val: string) =>
                      (formData.context.temperature.value = val === '' ? null : Number(val))
                  "
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
            </v-row>
            <v-text-field
              v-model="formData.context.brightness"
              label="Brightness (Lux)"
              type="number"
              outlined
              class="mb-4"
              @input="
                (val: string) => (formData.context.brightness = val === '' ? null : Number(val))
              "
            />
          </v-card-text>
        </v-card>
      </v-card-text>
    </v-card>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="top right">
      {{ snackbarMessage }}
    </v-snackbar>

    <!-- Protocol Selection Modal -->
    <ProtocolSelectModal v-model="showProtocolSelectModal" @select="onProtocolSelected" />
  </v-container>
</template>
