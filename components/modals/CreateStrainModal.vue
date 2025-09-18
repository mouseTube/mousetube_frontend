<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useSpeciesStore } from '@/stores/species';
import { useStrainStore } from '@/stores/strain';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits(['update:show', 'created']);

// Stores
const speciesStore = useSpeciesStore();
const strainStore = useStrainStore();

// Local dialog state
const localShow = ref(props.show);

// Form data
const formData = ref({
  name: '',
  background: '',
  bibliography: '',
  species: null as number | null, // stocke l'id
});

// Species options pour le v-select
const speciesOptions = ref<{ label: string; value: number }[]>([]);

// Fetch species depuis le store species
async function fetchSpecies() {
  try {
    await speciesStore.fetchSpecies(); // ne retourne rien, on lit juste speciesStore.species
    speciesOptions.value =
      speciesStore.species.map((s) => ({
        label: s.name,
        value: s.id,
      })) ?? [];
  } catch (err) {
    console.error('Error fetching species:', err);
    speciesOptions.value = [];
  }
}

// Submit → crée un strain via le store strain
async function submit() {
  try {
    if (!formData.value.species) {
      alert('Please select a species.');
      return;
    }

    const newStrain = await strainStore.createStrain({
      ...formData.value,
      species: formData.value.species, // on envoie l'id
    });

    emit('created', newStrain);
    localShow.value = false;
  } catch (err) {
    console.error('Error creating strain:', err);
    alert('Error creating strain.');
  }
}

// Watchers pour synchroniser prop et état local
watch(
  () => props.show,
  (val) => {
    localShow.value = val;
  }
);

watch(localShow, async (val) => {
  emit('update:show', val);
  if (!val) {
    await nextTick();
    formData.value = { name: '', background: '', bibliography: '', species: null };
  }
});

onMounted(() => {
  fetchSpecies();
});
</script>

<template>
  <!-- Ne monter le dialog que si nécessaire pour éviter les erreurs de transition -->
  <v-dialog v-if="localShow" v-model="localShow" max-width="600px" persistent>
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
          :items="speciesOptions ?? []"
          item-title="label"
          item-value="value"
          label="Species"
          outlined
          required
          class="mb-4"
        />
      </v-card-text>

      <v-card-actions>
        <v-btn text @click="localShow = false">Cancel</v-btn>
        <v-btn color="primary" @click="submit">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
