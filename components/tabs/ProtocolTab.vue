<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useProtocolStore } from '@/stores/protocol';

const props = defineProps<{
  selectedProtocolId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:selectedProtocolId', value: number | null): void;
}>();

const protocolStore = useProtocolStore();

const formData = ref({
  name: '',
  description: '',
  animals: {
    sex: '',
    age: '',
    housing: '',
    species: '',
  },
  context: {
    'number of animals': null,
    duration: '',
    cage: '',
    bedding: '',
    light_cycle: '',
    temperature: {
      value: '',
      unit: '',
    },
    brightness: null,
  },
});

// Snackbar state
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

// selectedId est toujours string ou null
const selectedId = ref<string | null>(
  props.selectedProtocolId !== null ? String(props.selectedProtocolId) : null
);

// Sync local selectedId with parent prop (string conversion)
watch(
  () => props.selectedProtocolId,
  (newId) => {
    const idStr = newId !== null ? String(newId) : null;
    if (selectedId.value !== idStr) {
      selectedId.value = idStr;
    }
  },
  { immediate: true }
);

const protocolsLoaded = computed(
  () => !protocolStore.loading && protocolStore.protocols.results.length > 0
);

watch(
  [selectedId, protocolsLoaded],
  ([newId, loaded]) => {
    if (!loaded) return; // on attend que les protocols soient chargés

    if (newId === 'new') {
      resetForm();
      emit('update:selectedProtocolId', null);
      return;
    }
    if (newId === null) {
      resetForm();
      emit('update:selectedProtocolId', null);
    } else {
      const idNumber = Number(newId);
      if (!isNaN(idNumber)) {
        const protocol = protocolStore.getProtocolById(idNumber);
        console.log('Selected protocol:', protocol);
        if (protocol) {
          formData.value = JSON.parse(JSON.stringify(protocol));
        } else {
          resetForm();
        }
        emit('update:selectedProtocolId', idNumber);
      } else {
        resetForm();
        emit('update:selectedProtocolId', null);
      }
    }
  },
  { immediate: true }
);

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    animals: {
      sex: '',
      age: '',
      housing: '',
      species: '',
    },
    context: {
      'number of animals': null,
      duration: '',
      cage: '',
      bedding: '',
      light_cycle: '',
      temperature: {
        value: '',
        unit: '',
      },
      brightness: null,
    },
  };
  selectedId.value = null;
}

async function onSubmit() {
  try {
    if (selectedId.value !== null && selectedId.value !== 'new') {
      const idNumber = Number(selectedId.value);
      if (isNaN(idNumber)) throw new Error('Invalid protocol ID');
      await protocolStore.updateProtocol(idNumber, formData.value);
      snackbarMessage.value = 'Protocol updated successfully.';
      snackbarColor.value = 'success';
    } else {
      const created = await protocolStore.createProtocol(formData.value);
      selectedId.value = String(created.id);
      snackbarMessage.value = 'Protocol created successfully.';
      snackbarColor.value = 'success';
    }
    snackbar.value = true;
    await protocolStore.fetchAllProtocols();
  } catch (e) {
    snackbarMessage.value = 'Error saving protocol.';
    snackbarColor.value = 'error';
    snackbar.value = true;
    console.error(e);
  }
}

onMounted(async () => {
  await protocolStore.fetchAllProtocols();
});
</script>

<template>
  <v-container>
    <v-select
      v-model="selectedId"
      :items="[
        { id: 'new', name: 'Create New Protocol' },
        ...(protocolStore.protocols.results?.map((p) => ({ id: String(p.id), name: p.name })) ??
          []),
      ]"
      item-title="name"
      item-value="id"
      label="Select Protocol to Edit or Create New"
      outlined
      class="mb-4"
    />

    <!-- Form Card -->
    <v-card class="pa-6" outlined>
      <v-card-title class="d-flex justify-space-between align-center mb-4">
        <h3>Protocol Metadata</h3>
        <div>
          <v-btn color="grey" variant="outlined" @click="resetForm" class="mr-2"> Reset </v-btn>
          <v-btn color="primary" @click="onSubmit"> Save </v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <!-- Nom et description -->
        <v-text-field v-model="formData.name" outlined required class="mb-4">
          <template #label> Protocol Name <span style="color: red">*</span> </template>
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
            <v-text-field
              v-model="formData.animals.species"
              label="Species"
              outlined
              class="mb-4"
            />
          </v-card-text>
        </v-card>

        <!-- Experimental Context -->
        <v-card class="pa-4 mb-4" outlined>
          <v-card-title>Experimental Context</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="formData.context['number of animals']"
              label="Number of Animals"
              type="number"
              outlined
              class="mb-4"
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
            />
          </v-card-text>
        </v-card>
      </v-card-text>
    </v-card>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="top right">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>
