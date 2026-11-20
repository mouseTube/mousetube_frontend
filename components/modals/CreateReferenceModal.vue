<script setup lang="ts">
import ReviewStatus from '@/components/ReviewStatus.vue';
import { ref, watch } from 'vue';
import { useReferenceStore, type Reference } from '~/stores/reference';

const props = defineProps<{
  modelValue: boolean;
  reference?: {
    id?: number;
    name: string;
    description?: string | null;
    url?: string | null;
    doi?: string | null;
    status?: 'draft' | 'waiting validation' | 'validated' | '';
  };
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved', ref: Reference): void;
}>();

const referenceStore = useReferenceStore();

// Formulaire
const formData = ref({
  id: props.reference?.id,
  name: props.reference?.name || '',
  description: props.reference?.description || '',
  url: props.reference?.url || '',
  doi: props.reference?.doi || '',
  status: props.reference?.status || 'draft',
});

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
});

function resetForm() {
  formData.value = {
    id: undefined,
    name: '',
    description: '',
    url: '',
    doi: '',
    status: 'draft',
  };
}

watch(
  () => props.reference,
  (newRef) => {
    if (newRef) {
      formData.value = {
        id: newRef.id,
        name: newRef.name,
        description: newRef.description || '',
        url: newRef.url || '',
        doi: newRef.doi || '',
        status: newRef.status || 'draft',
      };
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

async function saveReference() {
  if (!formData.value.name.trim()) {
    snackbar.value = { show: true, message: 'Reference name is required.' };
    return;
  }

  try {
    const payload = {
      name: formData.value.name,
      description: formData.value.description || null,
      url: formData.value.url || null,
      doi: formData.value.doi || null,
      status: formData.value.status,
    };

    let savedRef: Reference;
    if (formData.value.id) {
      savedRef = await referenceStore.updateReference(formData.value.id, payload);
    } else {
      savedRef = await referenceStore.createReference(payload);
    }

    emit('saved', savedRef);
    emit('update:modelValue', false);
    resetForm();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    snackbar.value = { show: true, message: 'Error saving reference.' };
  }
}
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="500"
  >
    <v-card>
      <v-card-title class="form-title">
        <span class="form-icon" aria-hidden="true"
          ><v-icon icon="mdi-book-open-page-variant-outline"
        /></span>
        <span>{{ formData.id ? 'Edit Reference' : 'Create Reference' }}</span>
      </v-card-title>
      <div v-if="formData.id" class="px-6 pt-2">
        <ReviewStatus endpoint="reference" :id="formData.id" />
      </div>

      <v-card-text>
        <!-- Name -->
        <v-text-field v-model="formData.name" variant="outlined" required class="mb-4">
          <template #label> Reference Name <span class="text-error">*</span> </template>
        </v-text-field>

        <!-- Description -->
        <v-textarea
          v-model="formData.description"
          label="Description"
          variant="outlined"
          class="mb-4"
        />

        <!-- URL -->
        <v-text-field v-model="formData.url" label="URL" variant="outlined" class="mb-4" />

        <!-- DOI -->
        <v-text-field v-model="formData.doi" label="DOI" variant="outlined" class="mb-4" />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" color="grey-darken-1" @click="emit('update:modelValue', false)"
          >Cancel</v-btn
        >
        <v-btn color="primary" variant="flat" @click="saveReference">
          {{ formData.id ? 'Update' : 'Save' }}
        </v-btn>
      </v-card-actions>

      <!-- Snackbar -->
      <v-snackbar v-model="snackbar.show" :timeout="3000" color="error" location="top">
        {{ snackbar.message }}
        <template #actions>
          <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
        </template>
      </v-snackbar>
    </v-card>
  </v-dialog>
</template>
