<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import axios, { type AxiosProgressEvent } from 'axios';
import { type File as StoreFile, useFileStore } from '~/stores/file';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';

const props = defineProps<{
  modelValue: StoreFile | null;
  recordingSessionId?: number | null;
  repository?: { id: number; name: string; logo_url?: string | null } | null;
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

// ✅ détecte dynamiquement la présence d’un DOI
const hasDOI = computed(() => !!formData.value.doi?.trim());

// reset des données upload si l’utilisateur ajoute un DOI après un upload
watch(
  () => formData.value.doi,
  (newVal) => {
    if (newVal && newVal.trim() !== '') {
      formData.value.file = null;
      formData.value.uploadedUrl = null;
    }
  }
);

// précharger le nom du fichier si aucun nom n'est défini
watch(
  () => formData.value.file,
  (newFile) => {
    if (newFile && !formData.value.name) {
      formData.value.name = newFile.name;
    }
  }
);

watch(
  () => props.modelValue,
  (file) => {
    if (file) {
      formData.value = {
        name: file.name || '',
        date: file.date || null,
        duration: file.duration || null,
        format: file.format || null,
        sampling_rate: file.sampling_rate || null,
        bit_depth: file.bit_depth || null,
        notes: file.notes || '',
        size: file.size || null,
        doi: file.doi || '',
        number: file.number || null,
        file: null,
        uploadedUrl: file.link || null,
      };
    } else {
      formData.value = {
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
      };
    }
  },
  { immediate: true }
);

async function uploadFile() {
  if (!formData.value.file) return;
  uploading.value = true;

  try {
    const { temp_path, task_id } = await fileStore.uploadFile(formData.value.file);
    formData.value.uploadedUrl = temp_path;

    // 🧠 Construire l’URL publique à partir du chemin temporaire
    const apiBaseUrl = useApiBaseUrl();
    const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
    const filenameSafe = encodeURIComponent(temp_path.replace(/^\/?media\//, ''));
    const publicUrl = `${baseUrl}/media/${filenameSafe}`;

    const payload = {
      name: formData.value.name || formData.value.file.name,
      date: formData.value.date,
      duration: formData.value.duration,
      format: formData.value.format,
      sampling_rate: formData.value.sampling_rate,
      bit_depth: formData.value.bit_depth,
      notes: formData.value.notes,
      size: formData.value.file.size,
      doi: formData.value.doi,
      number: formData.value.number,
      recording_session_id: props.recordingSessionId ?? null,
      repository_id: props.repository?.id ?? null,
      link: publicUrl,
      status: 'pending',
      celery_task_id: task_id,
    };

    const newFile = await fileStore.createFile(payload);
    emit('saved', newFile);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Erreur upload ou création du fichier:', err);
  } finally {
    uploading.value = false;
  }
}

async function handleSubmit() {
  try {
    const { file, uploadedUrl, ...rest } = formData.value;
    const payload = {
      ...rest,
      recording_session_id: props.recordingSessionId ?? null,
      repository_id: props.repository?.id ?? null,
      link: uploadedUrl ?? null,
      status: hasDOI.value ? 'shared' : 'pending',
    };

    let saved;
    if (props.modelValue && props.modelValue.id) {
      saved = await fileStore.updateFile(props.modelValue.id, payload);
    } else {
      saved = await fileStore.createFile(payload);
      fileStore.addFile(saved);
    }

    emit('update:modelValue', null);
    emit('saved', saved);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

const isAudio = computed(() => formData.value.uploadedUrl?.match(/\.(mp3|wav|ogg|flac)$/i));
</script>

<template>
  <v-card class="pa-4" max-width="600">
    <v-card-title class="d-flex justify-space-between align-center">
      <span>{{ props.modelValue ? 'Edit File' : 'Create File' }}</span>

      <div v-if="props.repository" class="d-flex align-center">
        <img
          v-if="props.repository.logo_url"
          :src="props.repository.logo_url"
          alt="logo"
          style="width: 32px; height: 32px; margin-left: 8px; object-fit: contain"
        />
        <span class="ml-2">{{ props.repository.name }}</span>
      </div>
    </v-card-title>

    <v-card-text>
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
        label="File Number"
        type="number"
        outlined
        class="mb-3"
      />

      <v-textarea v-model="formData.notes" label="Notes" outlined class="mb-3" />

      <!-- Section Upload -->
      <template v-if="!hasDOI">
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

        <v-progress-linear
          v-if="uploading"
          :model-value="fileStore.uploadProgress"
          height="6"
          color="primary"
          class="mb-3"
        ></v-progress-linear>

        <div v-if="formData.uploadedUrl" class="mb-3">
          <v-alert type="success" class="mb-2">File uploaded successfully!</v-alert>
          <audio v-if="isAudio" controls :src="formData.uploadedUrl" class="w-full" />
          <video v-else controls :src="formData.uploadedUrl" class="w-full max-h-64" />
        </div>
      </template>

      <!-- Alerte DOI -->
      <template v-else>
        <v-alert type="info" class="mt-3">
          DOI specified — file already shared. You can now save the metadata.
        </v-alert>
      </template>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn color="primary" @click="handleSubmit">
        {{ hasDOI ? 'Save Metadata' : 'Save' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
