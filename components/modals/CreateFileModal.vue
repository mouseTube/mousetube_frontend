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
const uploadError = ref('');
const isEditMode = computed(() => !!props.modelValue?.id);
const isDoiOnly = computed(
  () => !isEditMode.value && !formData.value.file && (!!formData.value.doi || !!formData.value.link)
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
  uploadError.value = '';

  try {
    const { temp_path } = await fileStore.uploadFile(formData.value.file);

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
    const e = err as {
      response?: { data?: { error?: string; detail?: string } };
      message?: string;
    };
    uploadError.value =
      e.response?.data?.error || e.response?.data?.detail || e.message || 'The upload failed.';
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

const FORMATS = [
  'WAV',
  'MP3',
  'FLAC',
  'OGG',
  'AIFF',
  'AVI',
  'MP4',
  'MOV',
  'MKV',
  'CSV',
  'TXT',
  'XLSX',
  'XLS',
  'ZIP',
  'JPEG',
  'PNG',
  'PDF',
  'JSON',
];
const EXTENSIONS: Record<string, string> = { JPG: 'JPEG', AIF: 'AIFF' };

// sampling rate, bit depth and duration are in the header of a WAV file
async function readWavHeader(file: globalThis.File) {
  const view = new DataView(await file.slice(0, 65536).arrayBuffer());
  const tag = (at: number) =>
    at + 4 <= view.byteLength ? String.fromCharCode(...new Uint8Array(view.buffer, at, 4)) : '';
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let rate = 0;
  let bits = 0;
  let byteRate = 0;
  for (let at = 12; at + 8 <= view.byteLength;) {
    const id = tag(at);
    let size = view.getUint32(at + 4, true);
    if (id === 'fmt ' && at + 24 <= view.byteLength) {
      rate = view.getUint32(at + 12, true);
      byteRate = view.getUint32(at + 16, true);
      bits = view.getUint16(at + 22, true);
    } else if (id === 'data') {
      // streamed files may leave the size empty
      if (!size || size === 0xffffffff) size = file.size - at - 8;
      return {
        sampling_rate: rate || null,
        bit_depth: [8, 16, 24, 32].includes(bits) ? bits : null,
        duration: byteRate ? Math.round((size / byteRate) * 1000) / 1000 : null,
      };
    }
    at += 8 + size + (size % 2);
  }
  return null;
}

// choosing the file fills what can be read from it; every field stays editable
watch(
  () => formData.value.file,
  async (file) => {
    if (!file) return;
    const form = formData.value;
    if (!form.name) form.name = file.name;
    form.size = file.size;
    const ext = file.name.split('.').pop()?.toUpperCase() ?? '';
    const format = EXTENSIONS[ext] ?? ext;
    if (FORMATS.includes(format)) form.format = format;
    if (format === 'WAV') {
      try {
        const header = await readWavHeader(file);
        if (header && form.file === file) Object.assign(form, header);
      } catch {
        // unreadable header: the user fills the fields
      }
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
      <!-- the file comes first: it fills most of the fields below -->
      <template v-if="!isEditMode && !isDoiOnly">
        <v-file-input
          v-model="formData.file"
          label="Select File"
          prepend-icon="mdi-upload"
          show-size
          accept="audio/*, video/*,
            image/jpeg, image/png,
            text/csv, text/plain,
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
            application/vnd.ms-excel,
            application/zip, application/pdf, application/json"
          variant="outlined"
          hint="Name, format, size and, for WAV files, sampling rate, bit depth and duration are filled from the file. No file to upload? Fill DOI and Download Link below instead."
          persistent-hint
          class="mb-5"
        />
      </template>

      <h3 class="mb-3">File Metadata</h3>

      <v-text-field
        v-model="formData.name"
        label="File Name *"
        variant="outlined"
        required
        class="mb-3"
      />

      <v-row dense>
        <v-col cols="12" sm="6">
          <v-select
            v-model="formData.format"
            :items="FORMATS"
            label="File Format"
            variant="outlined"
            class="mb-0"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="formData.size"
            label="File Size (bytes)"
            type="number"
            variant="outlined"
            class="mb-0"
          />
        </v-col>
      </v-row>

      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="formData.duration"
            label="Duration (seconds)"
            type="number"
            variant="outlined"
            class="mb-0"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="formData.sampling_rate"
            label="Sampling Rate (Hz)"
            type="number"
            variant="outlined"
            class="mb-0"
          />
        </v-col>
      </v-row>

      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="formData.date"
            label="Recording Date"
            type="date"
            variant="outlined"
            class="mb-0"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            v-model="formData.bit_depth"
            :items="[8, 16, 24, 32]"
            label="Bit Depth"
            variant="outlined"
            class="mb-0"
          />
        </v-col>
      </v-row>

      <!-- DOI -->
      <v-text-field
        v-model="formData.doi"
        label="DOI"
        variant="outlined"
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
            variant="outlined"
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
            variant="outlined"
            class="mb-3"
          />
        </template>
      </div>

      <!-- Link -->

      <v-text-field
        v-model="formData.link"
        label="Download Link (required if DOI is set)"
        variant="outlined"
        class="mb-3"
        :disabled="isEditMode"
        :rules="linkRules"
        hint="URL of the file associated with the DOI"
      />

      <v-text-field
        v-model="formData.number"
        label="File Number"
        type="number"
        variant="outlined"
        class="mb-3"
      />

      <v-textarea v-model="formData.notes" label="Notes" variant="outlined" class="mb-3" />

      <!-- DOI given -->
      <v-alert v-if="isDoiOnly" type="info" class="mb-4" border="start" variant="tonal">
        This file will be linked to an external resource via its DOI and link.
        <br />
        No upload will be performed — please ensure that both fields (“DOI” and “External Link”) are
        correctly filled.
      </v-alert>

      <v-alert v-if="uploadError" type="error" variant="tonal" class="mb-3">
        {{ uploadError }}
      </v-alert>

      <p v-if="uploading" class="text-caption mb-1">
        Sending the file to the server… {{ fileStore.uploadProgress }} %. Keep this window open; the
        transfer to the repository then continues in the background.
      </p>
      <v-progress-linear
        v-if="uploading"
        :model-value="fileStore.uploadProgress"
        height="6"
        color="primary"
        class="mb-3"
      />
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn
        v-if="!isEditMode && formData.file"
        color="primary"
        :disabled="!formData.name || uploading"
        @click="uploadFileAndCreate"
      >
        {{ uploading ? 'Uploading...' : 'Upload & Create File' }}
      </v-btn>
      <v-btn v-else color="primary" :disabled="!canSave" @click="handleSubmit">
        {{ isEditMode ? 'Save Metadata' : 'Save without Upload' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
