<script setup>
import { ref, watch, onMounted } from 'vue';
import { useProtocolStore } from '@/stores/protocol';

const props = defineProps({
  selectedProtocolId: {
    type: [Number, String],
    default: null,
  },
});

const protocolStore = useProtocolStore();

const { selectedProtocolId } = props;
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

// Charger la liste des protocoles au montage
onMounted(() => {
  protocolStore.fetchProtocols();
});

watch(
  () => selectedProtocolId,
  (newId) => {
    if (!newId) {
      resetForm();
    } else {
      const protocol = protocolStore.getProtocolById(newId);
      if (protocol) {
        formData.value = JSON.parse(JSON.stringify(protocol));
      }
    }
  },
  { immediate: true }
);

// Met à jour formData quand l'utilisateur change de protocole sélectionné
watch(selectedProtocolId, (newId) => {
  if (newId === null) {
    // Réinitialiser le formulaire pour créer un nouveau protocole
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
  } else {
    const protocol = protocolStore.getProtocolById(newId);
    if (protocol) {
      // Clone profond pour éviter les références partagées
      formData.value = JSON.parse(JSON.stringify(protocol));
    }
  }
});

// Soumission du formulaire
async function onSubmit() {
  try {
    if (selectedProtocolId.value) {
      await protocolStore.updateProtocol(selectedProtocolId.value, formData.value);
      alert('Protocol updated.');
    } else {
      const created = await protocolStore.createProtocol(formData.value);
      selectedProtocolId.value = created.id;
      alert('Protocol created.');
    }
    await protocolStore.fetchProtocols();
  } catch (e) {
    alert('Error saving protocol.');
    console.error(e);
  }
}

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
}
</script>

<template>
  <v-container>
    <!-- Sélection du protocole -->
    <v-select
      v-model="selectedProtocolId"
      :items="protocolStore.protocols"
      item-title="name"
      item-value="id"
      label="Select Protocol to Edit or Create New"
      outlined
      class="mb-4"
    >
      <template #prepend-item>
        <v-list-item @click="selectedProtocolId = null" title="-- Create New Protocol --" />
      </template>
    </v-select>

    <!-- Formulaire -->
    <v-card class="pa-6" outlined>
      <v-card-title>Protocol Form</v-card-title>
      <v-card-text>
        <!-- Nom du protocole -->
        <v-text-field
          v-model="formData.name"
          label="Protocol Name"
          outlined
          required
          class="mb-4"
        />

        <!-- Description -->
        <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />

        <!-- Informations sur les animaux -->
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

        <!-- Contexte expérimental -->
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
      <v-card-actions>
        <v-btn color="primary" @click="onSubmit">Save Protocol</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>
