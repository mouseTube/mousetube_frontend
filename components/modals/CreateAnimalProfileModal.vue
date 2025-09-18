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
  species: null as number | null,
});

// Species options pour le v-select
const speciesOptions = ref<{ label: string; value: number }[]>([]);
const speciesLoading = ref(true);

// Fetch species depuis le store
async function fetchSpecies() {
  try {
    speciesLoading.value = true;
    await speciesStore.fetchSpecies();
    speciesOptions.value =
      speciesStore.species.map((s) => ({
        label: s.name,
        value: s.id,
      })) || [];
  } catch (err) {
    console.error('Error fetching species:', err);
    speciesOptions.value = [];
  } finally {
    speciesLoading.value = false;
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
      species: formData.value.species,
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
  <v-dialog v-model="localShow" max-width="600px">
    <v-card>
      <v-card-title>Create New Strain</v-card-title>

      <v-card-text>
        <template v-if="speciesLoading">
          <v-progress-circular indeterminate color="primary" class="mx-auto my-6" />
        </template>

        <template v-else>
          <v-text-field
            v-model="formData.name"
            label="Strain Name"
            outlined
            required
            class="mb-4"
          />
          <v-text-field
            v-model="formData.background"
            label="Genetic Background"
            outlined
            required
            class="mb-4"
          />
          <v-textarea v-model="formData.bibliography" label="Bibliography" outlined class="mb-4" />
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
        </template>
      </v-card-text>

      <v-card-actions v-if="!speciesLoading">
        <v-btn color="primary" @click="submit">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
