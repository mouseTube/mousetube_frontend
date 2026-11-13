<script setup lang="ts">
import ReviewStatus from '@/components/ReviewStatus.vue';
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
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
  ontology_term: null as { curie: string; label: string } | null, // EFO
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

// Rats have their own strain vocabulary; the other species use EFO
const isRat = computed(() =>
  /rattus/i.test(speciesStore.species.find((s) => s.id === formData.value.species)?.name || '')
);

// Typing the name searches the vocabulary of the species; picking a term fills the name,
// the background (when empty) and the link. A name nobody finds stays as typed.
const { token } = useAuth();
const apiBaseUrl = useApiBaseUrl();
const suggestions = ref<{ curie: string; label: string; ontology?: string; iri?: string }[]>([]);
const searching = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

async function searchTerms(text: string) {
  if (text.trim().length < 2) {
    suggestions.value = [];
    return;
  }
  searching.value = true;
  try {
    const res = await axios.get(`${apiBaseUrl}/ontology/search/`, {
      params: { field: 'strain', q: text.trim(), ontology: isRat.value ? 'rs' : 'efo' },
      headers: { Authorization: `Bearer ${token.value}` },
    });
    suggestions.value = res.data.results || [];
  } catch {
    suggestions.value = []; // the name can still be typed by hand
  } finally {
    searching.value = false;
  }
}

function onName(value: unknown) {
  if (value && typeof value === 'object') {
    const term = value as { curie: string; label: string };
    formData.value.name = term.label;
    if (!formData.value.background) formData.value.background = term.label;
    formData.value.ontology_term = term;
  } else {
    formData.value.name = (value as string) || '';
  }
}

function onTyping(text: string | null) {
  // picking a term also sends its label back here: nothing to search then
  if (formData.value.ontology_term?.label === text) return;
  formData.value.name = text || '';
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => searchTerms(text || ''), 300);
}

// a term of the other vocabulary no longer fits when the species changes
watch(isRat, (rat) => {
  const curie = formData.value.ontology_term?.curie || '';
  if (curie && curie.startsWith('RS:') !== rat) formData.value.ontology_term = null;
});

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
  formData.value = {
    name: '',
    background: '',
    bibliography: '',
    species: null,
    ontology_term: null,
  };
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
        ontology_term: (strain as any).ontology_term ?? null,
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
    ontology_term: formData.value.ontology_term,
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
      <v-card-title class="form-title">
        <span class="form-icon" aria-hidden="true"><v-icon icon="mdi-dna" /></span>
        <span>{{ props.strain ? 'Edit Strain' : 'Create New Strain' }}</span>
      </v-card-title>
      <div v-if="props.strain?.id" class="px-6 pt-2">
        <ReviewStatus endpoint="strain" :id="props.strain?.id" />
      </div>

      <v-card-text>
        <template v-if="speciesLoading">
          <v-progress-circular indeterminate color="primary" class="mx-auto my-6" />
        </template>

        <template v-else>
          <v-form ref="formRef">
            <v-select
              v-model="formData.species"
              :items="speciesOptions"
              item-title="label"
              item-value="value"
              label="Species"
              variant="outlined"
              required
              class="mb-4"
              :rules="[(v) => !!v || 'Species is required']"
            >
              <template #label>Species <span style="color: red">*</span></template>
            </v-select>

            <v-combobox
              :model-value="formData.name"
              :items="suggestions"
              :loading="searching"
              item-title="label"
              item-value="curie"
              return-object
              no-filter
              hide-no-data
              variant="outlined"
              autocomplete="off"
              class="mb-1"
              :rules="[(v) => !!v || 'Name is required']"
              :hint="
                formData.ontology_term
                  ? ''
                  : `Type to search ${isRat ? 'the Rat Strain Ontology' : 'the Experimental Factor Ontology'}, or write the name as your laboratory does.`
              "
              persistent-hint
              @update:model-value="onName"
              @update:search="onTyping"
            >
              <template #label>Name <span style="color: red">*</span></template>
              <template #item="{ props: itemProps, item }">
                <v-list-item
                  v-bind="itemProps"
                  :title="item.raw.label"
                  :subtitle="item.raw.curie"
                />
              </template>
            </v-combobox>
            <div class="mb-4" style="min-height: 28px">
              <v-chip
                v-if="formData.ontology_term"
                size="small"
                label
                closable
                prepend-icon="mdi-link-variant"
                @click:close="formData.ontology_term = null"
              >
                {{ formData.ontology_term.curie }} · {{ formData.ontology_term.label }}
              </v-chip>
            </div>

            <v-text-field
              v-model="formData.background"
              variant="outlined"
              required
              class="mb-4"
              :rules="[(v) => !!v || 'Background is required']"
            >
              <template #label>Genetic Background <span style="color: red">*</span></template>
            </v-text-field>

            <v-textarea
              v-model="formData.bibliography"
              label="Bibliography"
              variant="outlined"
              class="mb-4"
            />
          </v-form>
        </template>
      </v-card-text>

      <v-card-actions v-if="!speciesLoading">
        <v-btn variant="text" color="grey-darken-1" @click="localShow = false">Close</v-btn>
        <v-btn color="primary" variant="flat" @click="submit">
          {{ props.strain ? 'Save' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="top right">
    {{ snackbarMessage }}
  </v-snackbar>
</template>
