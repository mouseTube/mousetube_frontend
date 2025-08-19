<script setup lang="ts">
import { ref, watch } from 'vue';
import { useStudyStore } from '@/stores/study';

const props = defineProps<{
  modelValue: boolean;
  study?: {
    id?: number;
    name: string;
    description?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  };
}>();

const emit = defineEmits(['update:modelValue']);

const studyStore = useStudyStore();

// Formulaire
const formData = ref({
  id: props.study?.id,
  name: props.study?.name || '',
  description: props.study?.description || '',
  start_date: props.study?.start_date || '',
  end_date: props.study?.end_date || '',
});

// Snackbar pour les erreurs
const snackbar = ref({
  show: false,
  message: '',
});

// Helper pour formater les dates
function formatDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  return dateString.split('T')[0];
}

async function saveStudy() {
  if (!formData.value.name.trim()) {
    snackbar.value = { show: true, message: 'Study Name is required.' };
    return;
  }
  if (!formData.value.start_date) {
    snackbar.value = { show: true, message: 'Start Date is required.' };
    return;
  }

  try {
    const payload = {
      name: formData.value.name,
      description: formData.value.description || null,
      start_date: formatDate(formData.value.start_date),
      end_date: formatDate(formData.value.end_date),
    };

    if (formData.value.id) {
      await studyStore.updateStudy(formData.value.id, payload);
    } else {
      await studyStore.createStudy(payload);
    }

    emit('update:modelValue', false);
    resetForm();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    snackbar.value = { show: true, message: 'Error saving study.' };
  }
}

function resetForm() {
  formData.value = {
    id: undefined,
    name: '',
    description: '',
    start_date: '',
    end_date: '',
  };
}

watch(
  () => props.study,
  (newStudy) => {
    if (newStudy) {
      formData.value = {
        id: newStudy.id,
        name: newStudy.name,
        description: newStudy.description || '',
        start_date: newStudy.start_date || '',
        end_date: newStudy.end_date || '',
      };
    } else {
      resetForm();
    }
  },
  { immediate: true }
);
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="500"
  >
    <v-card>
      <v-card-title>{{ formData.id ? 'Edit Study' : 'Create Study' }}</v-card-title>
      <v-card-text>
        <!-- Study Name -->
        <v-text-field v-model="formData.name" outlined required class="mb-4">
          <template #label> Study Name <span class="text-error">*</span> </template>
        </v-text-field>

        <!-- Description -->
        <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />

        <!-- Start Date -->
        <v-text-field v-model="formData.start_date" type="date" outlined required class="mb-4">
          <template #label> Start Date <span class="text-error">*</span> </template>
        </v-text-field>

        <!-- End Date -->
        <v-text-field
          v-model="formData.end_date"
          label="End Date"
          type="date"
          outlined
          class="mb-4"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="saveStudy">{{ formData.id ? 'Update' : 'Save' }}</v-btn>
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
      </v-card-actions>

      <!-- Snackbar -->
      <v-snackbar v-model="snackbar.show" :timeout="3000" color="error" top>
        {{ snackbar.message }}
        <template #actions>
          <v-btn text @click="snackbar.show = false">Close</v-btn>
        </template>
      </v-snackbar>
    </v-card>
  </v-dialog>
</template>
