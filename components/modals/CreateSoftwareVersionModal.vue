<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSoftwareStore } from '@/stores/software';

interface SoftwareVersionPayload {
  version: string;
  release_date: string;
  software: number;
}

const props = defineProps<{
  modelValue: boolean;
  softwareId: number;
  softwareVersionId?: number | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const store = useSoftwareStore();

const loading = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref('');
const formRef = ref();

const formData = ref<SoftwareVersionPayload>({
  version: '',
  release_date: '',
  software: props.softwareId,
});

// Validation rules
const versionRule = (v: string) => !!v || 'Version is required';
const dateRule = (v: string) =>
  !v || /^(\d{4})-(\d{2})-(\d{2})$/.test(v) || 'Date must be YYYY-MM-DD';

async function loadVersionData() {
  if (props.softwareVersionId) {
    loading.value = true;
    try {
      const data = await store.fetchSoftwareVersionById(props.softwareVersionId);
      if (data) {
        formData.value = {
          version: data.version || '',
          release_date: data.release_date || '',
          software: data.software?.id ?? props.softwareId,
        };
      }
    } catch {
      snackbarMessage.value = 'Failed to load software version data';
      snackbar.value = true;
    } finally {
      loading.value = false;
    }
  } else {
    // Nouvelle création : reset
    formData.value = {
      version: '',
      release_date: '',
      software: props.softwareId,
    };
  }
  formRef.value?.resetValidation();
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) loadVersionData();
  },
  { immediate: true }
);

watch(
  () => props.softwareVersionId,
  () => {
    if (props.modelValue) loadVersionData();
  }
);

async function submit() {
  if (!(formRef.value as any).validate()) return;

  loading.value = true;
  try {
    if (props.softwareVersionId) {
      await store.updateSoftwareVersion(
        props.softwareVersionId,
        formData.value as SoftwareVersionPayload
      );
    } else {
      await store.createSoftwareVersion(formData.value as SoftwareVersionPayload);
    }
    emit('saved');
    emit('update:modelValue', false);
  } catch (e) {
    snackbarMessage.value = store.error ?? 'Error saving software version';
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
    max-width="500"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        {{ softwareVersionId ? 'Edit Software Version' : 'Create Software Version' }}
        <v-spacer />
        <v-btn icon @click="close" :disabled="loading">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" lazy-validation>
          <v-text-field
            v-model="formData.version"
            label="Version"
            outlined
            required
            :rules="[versionRule]"
            :disabled="loading"
            class="mb-4"
          />
          <v-text-field
            v-model="formData.release_date"
            label="Release Date (YYYY-MM-DD)"
            outlined
            required
            :rules="[dateRule]"
            placeholder="YYYY-MM-DD"
            :disabled="loading"
            class="mb-4"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close" :disabled="loading">Cancel</v-btn>
        <v-btn color="primary" @click="submit" :loading="loading" :disabled="loading">
          {{ softwareVersionId ? 'Save Changes' : 'Create' }}
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
