<script setup lang="ts">
import ReviewStatus from '@/components/ReviewStatus.vue';
import OntologyField from '@/components/OntologyField.vue';
import { ref, watch, onMounted } from 'vue';
import { useAnimalProfileStore } from '~/stores/animalProfile';
import { useStrainStore, type Strain } from '~/stores/strain';
import CreateStrainModal from '@/components/modals/CreateStrainModal.vue';
import SelectStrainModal from '@/components/modals/StrainSelectionModal.vue';
import type { AnimalProfile } from '~/stores/animalProfile';

const props = defineProps<{
  modelValue: boolean;
  profileToEdit?: AnimalProfile | null;
}>();
const emit = defineEmits(['update:modelValue', 'created', 'updated']);

const animalProfileStore = useAnimalProfileStore();
const strainStore = useStrainStore();

const showStrainSelectModal = ref(false);
const showCreateStrainModal = ref(false);

const formRef = ref<any>(null);
const formValid = ref(false);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref<'success' | 'error'>('success');

function showSnackbar(message: string, color: 'success' | 'error') {
  snackbarText.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

const formData = ref<Partial<AnimalProfile>>({
  name: '',
  description: '',
  strain: null,
  sex: '',
  age: '',
  genotype: '',
  treatment: '',
  age_term: null,
  treatment_term: null,
  status: 'draft',
});

// The stage of each age class, as the server fills it in: the mouse developmental stages for a
// mouse, the generic stages of Uberon for another species. Shown at once, so what is saved is seen.
const AGE_TERMS: Record<string, Record<string, { curie: string; label: string }>> = {
  mouse: {
    pup: { curie: 'MmusDv:0000177', label: 'infant stage' },
    juvenile: { curie: 'MmusDv:0000178', label: 'juvenile stage' },
    adult: { curie: 'MmusDv:0000110', label: 'mature stage' },
  },
  other: {
    pup: { curie: 'UBERON:0034920', label: 'infant stage' },
    juvenile: { curie: 'UBERON:0034919', label: 'juvenile stage' },
    adult: { curie: 'UBERON:0000113', label: 'post-juvenile adult stage' },
  },
};
const isClassStage = (term: { curie: string } | null | undefined) =>
  !!term &&
  Object.values(AGE_TERMS).some((set) => Object.values(set).some((t) => t.curie === term.curie));

function fillStage() {
  const species = (formData.value.strain as any)?.species?.name;
  const age = formData.value.age;
  // a precise stage chosen by hand is never overwritten, only the one of an age class
  if (!age || !species || (formData.value.age_term && !isClassStage(formData.value.age_term))) {
    return;
  }
  const set = AGE_TERMS[/^mus musculus$/i.test(species) ? 'mouse' : 'other'];
  formData.value.age_term = set[age] ?? null;
}

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    strain: null,
    sex: '',
    age: '',
    genotype: '',
    treatment: '',
    age_term: null,
    treatment_term: null,
    status: 'draft',
  };
}

const strainOptions = ref<Strain[]>([]);

async function fetchStrains() {
  if (strainStore.strains.length === 0) {
    await strainStore.fetchStrains();
  }
  strainOptions.value = strainStore.strains;
}

onMounted(fetchStrains);

watch(
  () => props.profileToEdit,
  async (profile) => {
    if (profile) {
      await fetchStrains();
      formData.value = {
        name: profile.name ?? '',
        description: profile.description ?? '',
        strain: profile.strain ?? null,
        sex: profile.sex ?? '',
        age: profile.age ?? '',
        genotype: profile.genotype ?? '',
        treatment: profile.treatment ?? '',
        age_term: profile.age_term ?? null,
        treatment_term: profile.treatment_term ?? null,
        status: profile.status ?? 'draft',
      };
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

watch(
  () => props.modelValue,
  (open) => {
    if (open && !props.profileToEdit) {
      resetForm();
    }
  }
);

async function handleSubmit() {
  if (!formRef.value?.validate) return;

  const result = await formRef.value.validate();
  const isValid = typeof result === 'boolean' ? result : result.valid;

  if (!isValid) {
    showSnackbar('Please fill in all required fields.', 'error');
    return;
  }

  if (!formData.value.strain) {
    showSnackbar('Strain is required', 'error');
    return;
  }

  try {
    if (props.profileToEdit) {
      const updated = await animalProfileStore.updateAnimalProfile(
        props.profileToEdit.id,
        formData.value
      );
      emit('updated', updated);
    } else {
      const created = await animalProfileStore.createAnimalProfile({
        ...formData.value,
        name: formData.value.name ?? '',
        description: formData.value.description ?? '',
        sex: formData.value.sex ?? '',
        age: formData.value.age ?? '',
        genotype: formData.value.genotype ?? '',
        treatment: formData.value.treatment ?? '',
        status: formData.value.status ?? 'draft',
        strain: formData.value.strain,
      });
      emit('created', created);
    }

    emit('update:modelValue', false);
    resetForm();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    showSnackbar('Error saving animal profile', 'error');
  }
}

function handleStrainCreated(newStrain: Strain) {
  strainOptions.value.push(newStrain);
  formData.value.strain = newStrain;
  fillStage();
  showCreateStrainModal.value = false;
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600"
  >
    <v-card>
      <v-card-title>
        {{ props.profileToEdit ? 'Edit Animal Profile' : 'Create Animal Profile' }}
      </v-card-title>
      <div v-if="props.profileToEdit?.id" class="px-6 pt-2">
        <ReviewStatus endpoint="animalprofile" :id="props.profileToEdit?.id" />
      </div>

      <v-card-text>
        <v-form ref="formRef" v-model="formValid">
          <!-- Name -->
          <v-text-field
            v-model="formData.name"
            variant="outlined"
            required
            :rules="[(v) => !!v || 'Name is required']"
            class="mb-4"
          >
            <template #label>Name <span style="color: red">*</span></template>
          </v-text-field>

          <!-- Description -->
          <v-textarea v-model="formData.description" variant="outlined" class="mb-4">
            <template #label>Description</template>
          </v-textarea>

          <!-- Strain -->
          <v-text-field
            :model-value="formData.strain ? formData.strain.name : ''"
            variant="outlined"
            readonly
            required
            :rules="[(v) => !!formData.strain || 'Strain is required']"
            class="mb-4"
            @click="showStrainSelectModal = true"
          >
            <template #label>Strain <span style="color: red">*</span></template>
            <template #append>
              <v-btn variant="text" @click.stop="showStrainSelectModal = true">Select</v-btn>
            </template>
          </v-text-field>

          <!-- Sex -->
          <v-select
            v-model="formData.sex"
            :items="['male', 'female']"
            variant="outlined"
            required
            :rules="[(v) => !!v || 'Sex is required']"
            class="mb-4"
          >
            <template #label>Sex <span style="color: red">*</span></template>
          </v-select>

          <!-- Age -->
          <v-select
            v-model="formData.age"
            :items="['pup', 'juvenile', 'adult']"
            variant="outlined"
            @update:model-value="
              formData.age_term = null;
              fillStage();
            "
            required
            :rules="[(v) => !!v || 'Age is required']"
            class="mb-4"
          >
            <template #label>Age <span style="color: red">*</span></template>
          </v-select>

          <OntologyField
            v-model="formData.age_term"
            field="age"
            label="Developmental stage (optional)"
            hint="Filled in from the age (infant, juvenile or adult stage) once the strain is chosen. Choose a more precise one if you know it."
            class="mb-4"
          />

          <!-- Genotype -->
          <v-text-field
            v-model="formData.genotype"
            variant="outlined"
            required
            :rules="[(v) => !!v || 'Genotype is required']"
            class="mb-4"
          >
            <template #label>Genotype <span style="color: red">*</span></template>
          </v-text-field>

          <!-- Treatment -->
          <v-text-field v-model="formData.treatment" variant="outlined" class="mb-4">
            <template #label>Treatment</template>
          </v-text-field>
          <OntologyField
            v-if="formData.treatment"
            v-model="formData.treatment_term"
            field="treatment"
            label="Compound (ChEBI, optional)"
            hint="Link the treatment to its chemical entity so it can be found by other tools."
            class="mb-2"
          />
          <p class="text-caption text-medium-emphasis mb-0">
            The sex is linked to its PATO term automatically.
          </p>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Close</v-btn>
        <v-btn color="primary" @click="handleSubmit">
          {{ props.profileToEdit ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>

    <CreateStrainModal
      :show="showCreateStrainModal"
      @update:show="showCreateStrainModal = $event"
      @created="handleStrainCreated"
    />

    <SelectStrainModal
      :show="showStrainSelectModal"
      @update:show="showStrainSelectModal = $event"
      @selected="
        (strain) => {
          formData.strain = strain;
          fillStage();
          showStrainSelectModal = false;
        }
      "
    />
  </v-dialog>
</template>
