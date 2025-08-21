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
const dateDialog = ref(false);

const formData = ref<SoftwareVersionPayload>({
  version: '',
  release_date: '',
  software: props.softwareId,
});

const versionRule = (v: string) => !!v || 'Version is required';

function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

async function loadVersionData() {
  if (props.softwareVersionId) {
    loading.value = true;
    try {
      const data = await store.fetchSoftwareVersionById(props.softwareVersionId);
      if (data) {
        formData.value = {
          version: data.version || '',
          release_date: data.release_date ? formatDate(data.release_date) : '',
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
  if (!formRef.value) return;
  const validationResult = await (formRef.value as any).validate();

  if (!validationResult.valid) {
    snackbarMessage.value = 'Please fill in the required fields';
    snackbar.value = true;
    return;
  }

  loading.value = true;
  try {
    if (props.softwareVersionId) {
      await store.updateSoftwareVersion(props.softwareVersionId, formData.value);
    } else {
      await store.createSoftwareVersion(formData.value);
    }
    emit('saved');
    emit('update:modelValue', false); // ferme uniquement si tout est OK
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
    persistent
    max-width="500"
    @update:model-value="(val) => emit('update:modelValue', val)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        {{ softwareVersionId ? 'Edit Software Version' : 'Create Software Version' }}
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef">
          <v-text-field
            v-model="formData.version"
            outlined
            :rules="[versionRule]"
            :disabled="loading"
            class="mb-4"
          >
            <template #label> Version <span style="color: red">*</span> </template>
          </v-text-field>

          <v-text-field
            v-model="formData.release_date"
            label="Release Date"
            outlined
            readonly
            @click="dateDialog = true"
            :disabled="loading"
            class="mb-4"
          />

          <v-dialog v-model="dateDialog" width="330">
            <v-card>
              <v-date-picker
                v-model="formData.release_date"
                @update:model-value="formData.release_date = formatDate($event)"
              >
                <v-card-actions>
                  <v-spacer />
                  <v-btn text @click="dateDialog = false">Cancel</v-btn>
                  <v-btn text @click="dateDialog = false">OK</v-btn>
                </v-card-actions>
              </v-date-picker>
            </v-card>
          </v-dialog>
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
        <v-btn color="white" variant="text" @click="snackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-dialog>
</template>
