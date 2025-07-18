<script setup>
import { ref, watch } from 'vue';
import { useStrainStore } from '@/stores/strain'; // Exemple store Pinia pour strains
import { useSpeciesStore } from '@/stores/species'; // Store pour species

const strainStore = useStrainStore();
const speciesStore = useSpeciesStore();

const showCreateStrainModal = ref(false);
const showCreateSpeciesModal = ref(false);

const strainsOptions = ref([]);
const speciesOptions = ref([]);

const formData = ref({
  strain: null, // ID ou objet strain sélectionné
  species: null, // ID ou objet species sélectionné (lié à strain ou séparé)
  sex: '',
  genotype: '',
  treatment: '',
});

// Charger options strains et species au départ
async function fetchOptions() {
  strainsOptions.value = await strainStore.fetchAll(); // Format [{label, value, ...}]
  speciesOptions.value = await speciesStore.fetchAll();
}
fetchOptions();

// Quand on change le strain, on peut mettre à jour species par défaut
watch(
  () => formData.value.strain,
  (newStrain) => {
    if (newStrain?.species) {
      formData.value.species = newStrain.species.id || null;
    } else {
      formData.value.species = null;
    }
  }
);

function onCreatedStrain(newStrain) {
  strainsOptions.value.push({
    label: newStrain.name,
    value: newStrain.id,
    species: newStrain.species,
  });
  formData.value.strain = newStrain.id;
  if (newStrain.species) {
    speciesOptions.value.push({ label: newStrain.species.name, value: newStrain.species.id });
    formData.value.species = newStrain.species.id;
  }
  showCreateStrainModal.value = false;
}

function onCreatedSpecies(newSpecies) {
  speciesOptions.value.push({ label: newSpecies.name, value: newSpecies.id });
  formData.value.species = newSpecies.id;
  showCreateSpeciesModal.value = false;
}

function handleSubmit() {
  console.log('Submit clicked', formData.value);
  // ajoute ici la logique d'envoi / validation
}
</script>

<template>
  <v-container>
    <v-card class="pa-6" max-width="800">
      <v-card-title>Animal Profile Form</v-card-title>
      <v-card-text>
        <!-- Strain -->
        <v-select
          v-model="formData.strain"
          :items="strainsOptions"
          item-title="label"
          item-value="value"
          label="Strain"
          outlined
          required
        />
        <v-btn @click="showCreateStrainModal = true" class="mb-4">Create New Strain</v-btn>

        <!-- Sex -->
        <v-select
          v-model="formData.sex"
          :items="[
            { label: 'male', value: 'male' },
            { label: 'female', value: 'female' },
          ]"
          item-title="label"
          item-value="value"
          label="Sex"
          outlined
          required
          class="mb-4"
        />

        <!-- Genotype -->
        <v-text-field v-model="formData.genotype" label="Genotype" outlined required class="mb-4" />

        <!-- Treatment -->
        <v-textarea v-model="formData.treatment" label="Treatment" outlined class="mb-4" />
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="handleSubmit">Save</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Modales -->
    <CreateStrainModal v-model:show="showCreateStrainModal" @created="onCreatedStrain" />
  </v-container>
</template>
