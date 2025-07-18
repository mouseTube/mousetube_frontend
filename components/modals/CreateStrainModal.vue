<script setup>
import { ref, onMounted, watch } from 'vue';
import { useStrainStore } from '@/stores/strain';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['update:show', 'created']);

const formData = ref({
  name: '',
  background: '',
  bibliography: '',
  species: null,
});

const speciesOptions = ref([]);

const strainStore = useStrainStore();

async function fetchSpecies() {
  try {
    speciesOptions.value = await strainStore.fetchSpecies(); // [{ label, value }]
  } catch (err) {
    console.error('Error fetching species:', err);
  }
}

onMounted(() => {
  fetchSpecies();
});

watch(
  () => props.show,
  (val) => {
    if (!val) {
      // Reset form when modal is closed
      formData.value = { name: '', background: '', bibliography: '', species: null };
    }
  }
);

async function submit() {
  try {
    const newStrain = await strainStore.createStrain(formData.value);
    emit('created', newStrain);
    emit('update:show', false);
  } catch (err) {
    console.error('Error creating strain:', err);
  }
}
</script>

<template>
  <v-dialog
    :model-value="props.show"
    @update:model-value="emit('update:show', $event)"
    max-width="600px"
    persistent
  >
    <v-card>
      <v-card-title>Create New Strain</v-card-title>
      <v-card-text>
        <!-- Strain Name -->
        <v-text-field v-model="formData.name" label="Strain Name" outlined required class="mb-4" />

        <!-- Genetic Background -->
        <v-text-field
          v-model="formData.background"
          label="Genetic Background"
          outlined
          required
          class="mb-4"
        />

        <!-- Bibliography -->
        <v-textarea v-model="formData.bibliography" label="Bibliography" outlined class="mb-4" />

        <!-- Species -->
        <v-select
          v-model="formData.species"
          :items="speciesOptions"
          item-title="label"
          item-value="value"
          label="Species"
          outlined
          required
          class="mb-4"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="emit('update:show', false)">Cancel</v-btn>
        <v-btn color="primary" @click="submit">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
