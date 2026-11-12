<script setup lang="ts">
import ReviewStatus from '@/components/ReviewStatus.vue';
import OntologyField from '@/components/OntologyField.vue';
import { ref, onMounted, watch } from 'vue';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { useAuth } from '@/composables/useAuth';
import { useLaboratoryStore, type Laboratory } from '@/stores/laboratory';

import countriesList from '@/data/countries';

const formRef = ref<any>(null);

const props = defineProps<{
  modelValue: boolean;
  editId?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved', lab?: Laboratory): void;
}>();

const labStore = useLaboratoryStore();

const loading = ref(false);
const form = ref({
  name: '',
  institution: '',
  unit: '',
  address: '',
  country: '', // ISO code
  organization: null as { curie: string; label: string } | null, // ROR registry
});

const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

function showSnackbar(message: string, color = 'success') {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

async function loadLaboratory() {
  if (!props.editId) return;
  loading.value = true;
  try {
    const lab = await labStore.getLaboratoryById(props.editId);
    if (lab) {
      form.value = {
        name: lab.name || '',
        institution: lab.institution || '',
        unit: lab.unit || '',
        address: lab.address || '',
        country: lab.country || '',
        organization: (lab as any).organization ?? null,
      };
    }
  } catch (e) {
    showSnackbar('Error loading laboratory.', 'error');
    // eslint-disable-next-line no-console
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function save() {
  const { valid } = await formRef.value?.validate();
  if (!valid) {
    showSnackbar('Please fill all required fields.', 'error');
    return;
  }
  if (!form.value.name.trim()) {
    showSnackbar('Name is required.', 'error');
    return;
  }
  loading.value = true;
  try {
    let lab;
    if (props.editId) {
      lab = await labStore.updateLaboratory(props.editId, form.value);
      showSnackbar('Laboratory updated successfully.');
    } else {
      lab = await labStore.createLaboratory(form.value);
      showSnackbar('Laboratory created successfully.');
    }
    emit('saved', lab);
    emit('update:modelValue', false);
  } catch (e) {
    showSnackbar('Error saving laboratory.', 'error');
    // eslint-disable-next-line no-console
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val && !props.editId) {
      form.value = {
        name: '',
        institution: '',
        unit: '',
        address: '',
        country: '',
        organization: null,
      };
    }
  },
  { immediate: true }
);

// choosing the organization in the registry fills the institution when it is empty
watch(
  () => form.value.organization,
  (organization) => {
    if (organization && !form.value.institution) form.value.institution = organization.label;
  }
);

watch(
  () => props.editId,
  (newId) => {
    if (newId != null && props.modelValue) {
      loadLaboratory();
    }
  }
);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="500"
  >
    <v-card>
      <v-card-title>{{ props.editId ? 'Edit Laboratory' : 'Create Laboratory' }}</v-card-title>
      <div v-if="props.editId" class="px-6 pt-2">
        <ReviewStatus endpoint="laboratory" :id="props.editId" />
      </div>
      <v-card-subtitle v-if="!props.editId" class="modal-note">
        Until an administrator validates it, only you can see this entry.
      </v-card-subtitle>
      <v-card-text>
        <v-form ref="formRef" v-slot="{ validate }">
          <v-text-field
            v-model="form.name"
            label="Name *"
            required
            :rules="[(v) => !!v || 'Name is required']"
          />
          <OntologyField
            v-model="form.organization"
            field="organization"
            label="Find your institution (ROR registry)"
            hint="Optional: links the laboratory to its identifier in the Research Organization Registry."
            class="mb-2"
          />
          <v-text-field v-model="form.institution" label="Institution" />
          <v-text-field v-model="form.unit" label="Unit" />
          <v-text-field v-model="form.address" label="Address" />

          <!-- Country select -->
          <v-select
            v-model="form.country"
            :items="countriesList"
            label="Country *"
            item-title="label"
            item-value="value"
            clearable
            required
            :rules="[(v) => !!v || 'Country is required']"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="save">{{
          props.editId ? 'Update' : 'Create'
        }}</v-btn>
      </v-card-actions>
    </v-card>
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{
      snackbarMessage
    }}</v-snackbar>
  </v-dialog>
</template>
