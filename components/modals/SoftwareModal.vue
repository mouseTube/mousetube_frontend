<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSoftwareStore } from '@/stores/software';
import type { VForm } from 'vuetify/components';
import { nextTick } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  softwareId?: number | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const store = useSoftwareStore();

const formData = ref({
  name: '',
  type: null as 'acquisition' | 'analysis' | 'acquisition and analysis' | null,
  made_by: '',
  description: '',
  technical_requirements: '',
});

const loading = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref('');
const formRef = ref<VForm | null>(null);

// Validation rules
const nameRule = (v: string) => !!v || 'Name is required';
const typeRule = (v: string | null) =>
  v === 'acquisition' || v === 'analysis' || v === 'acquisition and analysis' || 'Type is required';

async function loadSoftwareData() {
  if (props.softwareId) {
    loading.value = true;
    try {
      const data = await store.fetchSoftwareById(props.softwareId);
      if (data) {
        formData.value = {
          name: data.name || '',
          type: data.type ?? null,
          made_by: data.made_by || '',
          description: data.description || '',
          technical_requirements: data.technical_requirements || '',
        };
      }
    } catch {
      snackbarMessage.value = 'Failed to load software data';
      snackbar.value = true;
    } finally {
      loading.value = false;
    }
  } else {
    formData.value = {
      name: '',
      type: null,
      made_by: '',
      description: '',
      technical_requirements: '',
    };
  }
  await nextTick();
  formRef.value?.resetValidation();
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) loadSoftwareData();
  },
  { immediate: true }
);

async function submit() {
  const result = await formRef.value?.validate();
  if (!result?.valid) return;

  loading.value = true;
  try {
    if (props.softwareId) {
      await store.updateSoftware(props.softwareId, formData.value);
    } else {
      await store.createSoftware(formData.value);
    }
    emit('saved');
    emit('update:modelValue', false);
  } catch (e) {
    snackbarMessage.value = store.error ?? 'Error saving software';
    snackbar.value = true;
  } finally {
    loading.value = false;
  }
}

function close() {
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        {{ softwareId ? 'Edit Software' : 'Create Software' }}
        <v-spacer />
        <v-btn icon @click="close" :disabled="loading">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" lazy-validation>
          <v-text-field
            v-model="formData.name"
            label="Name"
            outlined
            required
            :rules="[nameRule]"
            :disabled="loading"
            class="mb-4"
          />

          <v-select
            v-model="formData.type"
            :items="['acquisition', 'analysis', 'acquisition and analysis']"
            label="Type"
            outlined
            required
            :rules="[typeRule]"
            :disabled="loading"
            class="mb-4"
          />

          <v-text-field
            v-model="formData.made_by"
            label="Made By"
            outlined
            :disabled="loading"
            class="mb-4"
          />

          <v-textarea
            v-model="formData.description"
            label="Description"
            outlined
            :disabled="loading"
            rows="3"
            class="mb-4"
          />

          <v-textarea
            v-model="formData.technical_requirements"
            label="Technical Requirements"
            outlined
            :disabled="loading"
            rows="3"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close" :disabled="loading">Cancel</v-btn>
        <v-btn color="primary" @click="submit" :loading="loading" :disabled="loading">
          {{ softwareId ? 'Save Changes' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-snackbar v-model="snackbar" color="error" timeout="6000" top>
      {{ snackbarMessage }}
      <template #actions>
        <v-btn color="white" variant="text" @click="snackbar = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </v-dialog>
</template>
