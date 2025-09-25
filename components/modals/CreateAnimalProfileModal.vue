<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useAnimalProfileStore } from '~/stores/animalProfile';
import { useStrainStore, type Strain } from '~/stores/strain';
import CreateStrainModal from '@/components/modals/CreateStrainModal.vue';
import type { AnimalProfile } from '~/stores/animalProfile';
import SelectStrainModal from '@/components/modals/StrainSelectionModal.vue';

const props = defineProps<{
  modelValue: boolean;
  profileToEdit?: AnimalProfile | null;
}>();
const emit = defineEmits(['update:modelValue', 'created', 'updated']);

const animalProfileStore = useAnimalProfileStore();
const strainStore = useStrainStore();
const showStrainSelectModal = ref(false);

const formData = ref<Partial<AnimalProfile>>({
  name: '',
  description: '',
  strain: null,
  sex: '',
  genotype: '',
  treatment: '',
  status: 'draft',
});

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    strain: null,
    sex: '',
    genotype: '',
    treatment: '',
    status: 'draft',
  };
}

const strainOptions = ref<Strain[]>([]);
const showCreateStrainModal = ref(false);

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
        genotype: profile.genotype ?? '',
        treatment: profile.treatment ?? '',
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
        genotype: formData.value.genotype ?? '',
        treatment: formData.value.treatment ?? '',
        status: formData.value.status ?? 'draft',
        strain: formData.value.strain ?? null,
      });
      emit('created', created);
    }
    emit('update:modelValue', false);
    resetForm();
  } catch (e) {
    console.error(e);
    alert('Error saving animal profile.');
  }
}

function handleStrainCreated(newStrain: Strain) {
  strainOptions.value.push(newStrain);
  formData.value.strain = newStrain;
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
      <v-card-title>{{
        props.profileToEdit ? 'Edit Animal Profile' : 'Create Animal Profile'
      }}</v-card-title>
      <v-card-text>
        <v-text-field v-model="formData.name" outlined required class="mb-4">
          <template #label>Name <span style="color: red">*</span></template>
        </v-text-field>

        <v-textarea v-model="formData.description" outlined class="mb-4">
          <template #label>Description</template>
        </v-textarea>

        <v-text-field
          :model-value="formData.strain ? formData.strain.name : ''"
          label="Strain"
          outlined
          required
          readonly
          class="mb-4"
          @click="showStrainSelectModal = true"
        >
          <template #append>
            <v-btn text @click.stop="showStrainSelectModal = true"> Select </v-btn>
          </template>
        </v-text-field>

        <v-select
          v-model="formData.sex"
          :items="['male', 'female']"
          label="Sex"
          outlined
          required
          class="mb-4"
        >
          <template #label>Sex <span style="color: red">*</span></template>
        </v-select>

        <v-text-field v-model="formData.genotype" outlined required class="mb-4">
          <template #label>Genotype <span style="color: red">*</span></template>
        </v-text-field>

        <v-text-field v-model="formData.treatment" outlined class="mb-4">
          <template #label>Treatment</template>
        </v-text-field>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="emit('update:modelValue', false)">Close</v-btn>
        <v-btn color="primary" @click="handleSubmit">
          {{ props.profileToEdit ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <CreateStrainModal
      :show="showCreateStrainModal"
      @update:show="showCreateStrainModal = $event"
      @created="handleStrainCreated"
    />
    <SelectStrainModal
      :show="showStrainSelectModal"
      @update:show="showStrainSelectModal = $event"
      @selected="
        (
          strain:
            | {
                id: number;
                name: string;
                background?: string | null | undefined;
                species?:
                  | {
                      id: number;
                      name: string;
                      created_at?: string | null | undefined;
                      modified_at?: string | null | undefined;
                      created_by?: number | null | undefined;
                    }
                  | null
                  | undefined;
                bibliography?: string | null | undefined;
                created_at?: string | null | undefined;
                created_by?: number | null | undefined;
                modified_at?: string | null | undefined;
              }
            | null
            | undefined
        ) => {
          formData.strain = strain;
          showStrainSelectModal = false;
        }
      "
    />
  </v-dialog>
</template>
