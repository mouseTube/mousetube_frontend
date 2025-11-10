<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useSpeciesStore } from '@/stores/species';
import { useStrainStore, type Strain } from '@/stores/strain';

// Props
const props = defineProps<{
  show: boolean;
  strain?: Strain | null;
}>();

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

const formRef = ref();
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

// Snackbar helper
function showSnackbar(message: string, color: string) {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

// Species options
const speciesOptions = ref<{ label: string; value: number }[]>([]);
const speciesLoading = ref(true);

// Fetch species
async function fetchSpecies() {
  try {
    speciesLoading.value = true;
    await speciesStore.fetchSpecies();
    speciesOptions.value = speciesStore.species.map((s) => ({
      label: s.name,
      value: s.id,
    }));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching species:', err);
    speciesOptions.value = [];
  } finally {
    speciesLoading.value = false;
  }
}

// Reset form data
function resetForm() {
  formData.value = { name: '', background: '', bibliography: '', species: null };
}

// Watch props
watch(
  () => props.strain,
  (strain) => {
    if (strain) {
      formData.value = {
        name: strain.name || '',
        background: strain.background || '',
        bibliography: strain.bibliography || '',
        species: strain.species?.id ?? null,
      };
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

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
    resetForm();
  }
});

// Submit form
async function submit() {
  const result = await formRef.value?.validate();
  const isValid = typeof result === 'boolean' ? result : result?.valid;

  if (!isValid) {
    showSnackbar('Please fill in all required fields.', 'error');
    return;
  }

  if (!formData.value.species) {
    showSnackbar('Please select a species.', 'error');
    return;
  }

  const payload = {
    name: formData.value.name,
    background: formData.value.background,
    bibliography: formData.value.bibliography,
    species_id: formData.value.species,
  };

  try {
    let result: Strain;
    if (props.strain) {
      result = await strainStore.updateStrain(props.strain.id, payload);
    } else {
      result = await strainStore.createStrain(payload);
    }

    emit('created', result);
    localShow.value = false;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    showSnackbar('Error saving strain.', 'error');
  }
}

onMounted(() => {
  fetchSpecies();
});
</script>

<template>
  <v-dialog v-model="localShow" max-width="600px">
    <v-card>
      <v-card-title>{{ props.strain ? 'Edit Strain' : 'Create New Strain' }}</v-card-title>

      <v-card-text>
        <template v-if="speciesLoading">
          <v-progress-circular indeterminate color="primary" class="mx-auto my-6" />
        </template>

        <template v-else>
          <v-form ref="formRef">
            <v-text-field
              v-model="formData.name"
              outlined
              required
              class="mb-4"
              :rules="[(v) => !!v || 'Name is required']"
            >
              <template #label>Name <span style="color: red">*</span></template>
            </v-text-field>

            <v-text-field
              v-model="formData.background"
              outlined
              required
              class="mb-4"
              :rules="[(v) => !!v || 'Background is required']"
            >
              <template #label>Genetic Background <span style="color: red">*</span></template>
            </v-text-field>

            <v-textarea
              v-model="formData.bibliography"
              label="Bibliography"
              outlined
              class="mb-4"
            />

            <v-select
              v-model="formData.species"
              :items="speciesOptions"
              item-title="label"
              item-value="value"
              label="Species"
              outlined
              required
              class="mb-4"
              :rules="[(v) => !!v || 'Species is required']"
            >
              <template #label>Species <span style="color: red">*</span></template>
            </v-select>
          </v-form>
        </template>
      </v-card-text>

      <v-card-actions v-if="!speciesLoading">
        <v-btn text @click="localShow = false">Close</v-btn>
        <v-btn color="primary" @click="submit">
          {{ props.strain ? 'Save' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="top right">
    {{ snackbarMessage }}
  </v-snackbar>
</template>
