<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { type File as StoreFile, useFileStore } from '~/stores/file';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';

const props = defineProps<{
  modelValue: StoreFile | null;
  recordingSessionId?: number | null;
  repository?: { id: number; name: string; logo_url?: string | null } | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);
const fileStore = useFileStore();
const { currentUser, fetchUser } = useAuth();
const isAdmin = ref(false);

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
  spectrogram: globalThis.File | null;
  plot: globalThis.File | null;
  number: number | null;
  file: globalThis.File | null;
  uploadedUrl: string | null;
  link: string | null;
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
  spectrogram: null,
  plot: null,
  number: null,
  file: null,
  uploadedUrl: null,
  link: null,
});

const uploading = ref(false);
const isEditMode = computed(() => !!props.modelValue?.id);
const isDoiOnly = computed(
  () => !isEditMode.value && (!!formData.value.doi || !!formData.value.link)
);

const canSave = computed(() => {
  if (isEditMode.value) {
    return !!formData.value.name;
  } else if (isDoiOnly.value) {
    return !!formData.value.name && !!formData.value.doi && !!formData.value.link;
  } else {
    return !!formData.value.file && !!formData.value.name;
  }
});

// Regex DOI
const doiPattern = /^10.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;

// Regex URL
const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/[\w-.,@?^=%&:/~+#]*)?$/i;

// Rules
const doiRules = [(v: string) => !v || doiPattern.test(v) || 'Invalid DOI format'];

const linkRules = [
  (v: string) => !formData.value.doi || !!v || 'Link is required when DOI is set',
  (v: string) => !v || urlPattern.test(v) || 'Invalid URL format',
];

// ✅ Load existing file data into form when in edit mode
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
        spectrogram: file.spectrogram || null,
        plot: file.plot || null,
        link: file.link || null,
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
        spectrogram: null,
        plot: null,
        link: null,
        number: null,
        file: null,
        uploadedUrl: null,
      };
    }
  },
  { immediate: true }
);

// =====================================================
// Upload and creation (Only in creation)
// =====================================================
async function uploadFileAndCreate() {
  if (!formData.value.file) return;
  uploading.value = true;

  try {
    const { temp_path, task_id } = await fileStore.uploadFile(formData.value.file);

    const apiBaseUrl = useApiBaseUrl();
    const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
    const filenameSafe = encodeURIComponent(temp_path.replace(/^\/?media\//, ''));
    const publicUrl = `${baseUrl}/media/${filenameSafe}`;

    const formPayload = new FormData();

    formPayload.append('name', formData.value.name || formData.value.file.name);
    formPayload.append('date', formData.value.date ?? '');
    if (formData.value.duration != null)
      formPayload.append('duration', String(formData.value.duration));
    if (formData.value.format) formPayload.append('format', formData.value.format);
    if (formData.value.sampling_rate != null)
      formPayload.append('sampling_rate', String(formData.value.sampling_rate));
    if (formData.value.bit_depth != null)
      formPayload.append('bit_depth', String(formData.value.bit_depth));
    formPayload.append('notes', formData.value.notes || '');
    formPayload.append('size', String(formData.value.file.size));
    formPayload.append('doi', formData.value.doi || '');
    if (formData.value.number != null) formPayload.append('number', String(formData.value.number));
    if (props.recordingSessionId)
      formPayload.append('recording_session_id', String(props.recordingSessionId));
    if (props.repository?.id) formPayload.append('repository_id', String(props.repository.id));
    formPayload.append('link', publicUrl);
    formPayload.append('celery_task_id', task_id);

    if (formData.value.spectrogram) {
      formPayload.append('spectrogram', formData.value.spectrogram as globalThis.File);
    }
    if (formData.value.plot) {
      formPayload.append('plot', formData.value.plot as globalThis.File);
    }

    // const newFile = await fileStore.createFile(formPayload);
    const newFile = await fileStore.createFileMultipart(formPayload);
    emit('saved', newFile);
    emit('update:modelValue', null);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Erreur upload ou file creation:', err);
  } finally {
    uploading.value = false;
  }
}

// =====================================================
// Save metadata (Edition only)
// =====================================================
async function handleSubmit() {
  try {
    const { file, uploadedUrl, doi, spectrogram, plot, ...rest } = formData.value;
    const payload = {
      ...rest,
      doi: formData.value.doi,
      recording_session_id: props.recordingSessionId ?? null,
      repository_id: props.repository?.id ?? null,
      link: formData.value.link || uploadedUrl || null,
    };

    let saved;
    if (isEditMode.value && props.modelValue?.id) {
      saved = await fileStore.updateFile(props.modelValue.id, payload);
    } else {
      saved = await fileStore.createFile(payload);
    }

    emit('saved', saved);
    emit('update:modelValue', null);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

function extractFileName(path: string | null) {
  if (!path) return '';
  return path.split('/').pop() || '';
}

watch(
  () => formData.value.file,
  (file) => {
    if (file && !formData.value.name) {
      formData.value.name = file.name;
    }
  }
);

onMounted(async () => {
  try {
    const user = await fetchUser();
    isAdmin.value = user?.is_staff || user?.is_admin || false;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('not able to retrieve user info', e);
  }
});
</script>

<template>
  <v-card class="pa-4" max-width="600">
    <v-card-title class="d-flex justify-space-between align-center">
      <span>{{ isEditMode ? 'Edit File' : 'Create File' }}</span>
      <div v-if="props.repository && !formData.doi" class="d-flex align-center">
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

      <v-text-field v-model="formData.name" label="File Name *" outlined required class="mb-3" />

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

      <!-- DOI -->
      <v-text-field
        v-model="formData.doi"
        label="DOI"
        outlined
        class="mb-3"
        :readonly="isEditMode"
        :rules="doiRules"
        hint="Editable only when creating a new file"
      />

      <div v-if="isAdmin">
        <h3 class="mt-6 mb-3">Admin Only – Images for Datasets</h3>

        <!-- Spectrogram -->
        <template
          v-if="isEditMode && formData.spectrogram && typeof formData.spectrogram === 'string'"
        >
          <v-text-field
            label="Spectrogram actuel"
            :model-value="extractFileName(formData.spectrogram)"
            readonly
            prepend-icon="mdi-image"
            class="mb-3"
          />
        </template>
        <template v-else>
          <v-file-input
            v-model="formData.spectrogram"
            label="Spectrogram Image"
            prepend-icon="mdi-image"
            accept="image/*"
            outlined
            class="mb-3"
          />
        </template>

        <!-- Plot -->
        <template v-if="isEditMode && formData.plot && typeof formData.plot === 'string'">
          <v-text-field
            label="Plot actuel"
            :model-value="extractFileName(formData.plot)"
            readonly
            prepend-icon="mdi-chart-line"
            class="mb-3"
          />
        </template>
        <template v-else>
          <v-file-input
            v-model="formData.plot"
            label="Data Plot File"
            prepend-icon="mdi-chart-line"
            accept="image/*"
            outlined
            class="mb-3"
          />
        </template>
      </div>

      <!-- Link -->

      <v-text-field
        v-model="formData.link"
        label="Donwload Link (required if DOI is set)"
        outlined
        class="mb-3"
        :disabled="isEditMode"
        :rules="linkRules"
        hint="URL of the file associated with the DOI"
      />

      <v-text-field
        v-model="formData.number"
        label="File Number"
        type="number"
        outlined
        class="mb-3"
      />

      <v-textarea v-model="formData.notes" label="Notes" outlined class="mb-3" />

      <!-- DOI given -->
      <v-alert v-if="isDoiOnly" type="info" class="mb-4" border="start" variant="tonal">
        This file will be linked to an external resource via its DOI and link.
        <br />
        No upload will be performed — please ensure that both fields (“DOI” and “External Link”) are
        correctly filled.
      </v-alert>

      <!-- upload file -->
      <template v-else-if="!isEditMode">
        <h3 class="mt-6 mb-3">Upload File</h3>

        <v-file-input
          v-model="formData.file"
          label="Select File"
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
          @click="uploadFileAndCreate"
        >
          {{ uploading ? 'Uploading...' : 'Upload & Create File' }}
        </v-btn>

        <v-progress-linear
          v-if="uploading"
          :model-value="fileStore.uploadProgress"
          height="6"
          color="primary"
          class="mb-3"
        />
      </template>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn color="primary" :disabled="!canSave" @click="handleSubmit">
        {{ isEditMode ? 'Save Metadata' : 'Save without Upload' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
