<script setup lang="ts">
import { ref, computed } from 'vue';
import axios, { type AxiosProgressEvent } from 'axios';
import { type File as StoreFile, useFileStore } from '~/stores/file';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';

const props = defineProps<{
  modelValue: StoreFile | null;
  recordingSessionId?: number | null;
}>();
const emit = defineEmits(['update:modelValue', 'saved']);

const fileStore = useFileStore();

interface FormDataType {
  name: string;
  date: string | null;
  duration: number | null;
  format: string | null;
  sampling_rate: number | null;
  bit_depth: number | null;
  notes: string;
  size: number | null;
  doi: string;
  number: number | null;
  file: globalThis.File | null;
  uploadedUrl: string | null;
}

const formData = ref<FormDataType>({
  name: '',
  date: null,
  duration: null,
  format: null,
  sampling_rate: null,
  bit_depth: null,
  notes: '',
  size: null,
  doi: '',
  number: null,
  file: null,
  uploadedUrl: null,
});
const uploading = ref(false);

async function uploadFile() {
  if (!formData.value.file) return;
  uploading.value = true;

  try {
    const task = await fileStore.uploadFile(formData.value.file);
    // le backend renvoie un task_id ou un message
    console.log('Tâche asynchrone lancée :', task);
    formData.value.uploadedUrl = null; // plus d’URL directe
  } catch (err) {
    console.error('Erreur upload:', err);
  } finally {
    uploading.value = false;
  }
}

async function handleSubmit() {
  try {
    const { file, uploadedUrl, ...rest } = formData.value;
    const payload = {
      ...rest,
      recording_session: props.recordingSessionId ?? null,
      link: uploadedUrl ?? null,
    };

    let saved;
    if (props.modelValue && props.modelValue.id) {
      saved = await fileStore.updateFile(props.modelValue.id, payload);
    } else {
      // Statut initial pending
      saved = await fileStore.createFile({ ...payload, status: 'pending' });
      fileStore.addFile(saved); // <-- ajoute le fichier à la liste immédiatement
    }

    emit('update:modelValue', null);
    emit('saved', saved);
  } catch (err) {
    console.error(err);
  }
}

const isAudio = computed(() => formData.value.uploadedUrl?.match(/\.(mp3|wav|ogg|flac|aiff)$/i));
</script>

<template>
  <v-card class="pa-4" max-width="600">
    <v-card-title>
      <span>{{ props.modelValue ? 'Edit File' : 'Create File' }}</span>
    </v-card-title>

    <v-card-text>
      <!-- Métadonnées -->
      <h3 class="mb-3">File Metadata</h3>

      <v-text-field v-model="formData.name" outlined required class="mb-3">
        <template #label> File Name <span style="color: red">*</span> </template>
      </v-text-field>

      <v-text-field
        v-model="formData.date"
        label="Recording Date"
        type="date"
        outlined
        class="mb-3"
      />

      <v-text-field
        v-model="formData.duration"
        label="Duration (seconds)"
        type="number"
        outlined
        class="mb-3"
      />

      <v-select
        v-model="formData.format"
        :items="['WAV', 'MP3', 'FLAC', 'OGG', 'AIFF', 'AVI', 'MP4', 'MOV', 'MKV']"
        label="File Format"
        outlined
        class="mb-3"
      />

      <v-text-field
        v-model="formData.sampling_rate"
        label="Sampling Rate (Hz)"
        type="number"
        outlined
        class="mb-3"
      />

      <v-select
        v-model="formData.bit_depth"
        :items="[8, 16, 24, 32]"
        label="Bit Depth"
        outlined
        class="mb-3"
      />

      <v-text-field
        v-model="formData.size"
        label="File Size (bytes)"
        type="number"
        outlined
        class="mb-3"
      />

      <v-text-field v-model="formData.doi" label="DOI" type="url" outlined class="mb-3" />

      <v-text-field
        v-model="formData.number"
        label="Vocalization Number"
        type="number"
        outlined
        class="mb-3"
      />

      <v-textarea v-model="formData.notes" label="Notes" outlined class="mb-3" />

      <!-- Upload -->
      <h3 class="mt-6 mb-3">Upload File</h3>

      <v-file-input
        v-model="formData.file"
        label="Select Audio/Video File"
        prepend-icon="mdi-upload"
        show-size
        accept="audio/*,video/*"
        outlined
        class="mb-3"
      />

      <v-btn
        :disabled="!formData.file || uploading"
        color="primary"
        block
        class="mb-3"
        @click="uploadFile"
      >
        {{ uploading ? 'Uploading...' : 'Upload & Add to a Repository' }}
      </v-btn>

      <!-- Aperçu -->
      <div v-if="formData.uploadedUrl" class="mb-3">
        <v-alert type="success" class="mb-2">File uploaded successfully!</v-alert>
        <audio v-if="isAudio" controls :src="formData.uploadedUrl" class="w-full" />
        <video v-else controls :src="formData.uploadedUrl" class="w-full max-h-64" />
      </div>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn color="primary" @click="handleSubmit">Save</v-btn>
    </v-card-actions>
  </v-card>
  <v-alert v-if="uploading" type="info" class="mb-2"> Upload in progress — please wait. </v-alert>

  <v-alert v-else-if="formData.uploadedUrl === null" type="success" class="mb-2">
    File sent to server — processing asynchronously.
  </v-alert>
</template>
