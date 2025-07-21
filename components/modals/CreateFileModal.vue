<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import axios from 'axios';
import { useFileStore } from '~/stores/file';
import { useSubjectStore } from '~/stores/subject';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import CreateSubjectModal from '~/components/modals/CreateSubjectModal.vue';

const props = defineProps<{
  modelValue: any; // utilisé avec v-model="editingFile"
  recordingSessionId?: number | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const fileStore = useFileStore();
const subjectStore = useSubjectStore();
const apiBaseUrl = useApiBaseUrl();

const showCreateSubject = ref(false);

const subjectOptions = ref<{ label: string; value: number }[]>([]);

const formData = ref({
  name: '',
  date: '',
  duration: null,
  format: '',
  sampling_rate: null,
  bit_depth: null,
  notes: '',
  size: null,
  doi: '',
  number: null,
  subjects: [] as number[],
  file: null as File | null, // fichier sélectionné
  uploadedUrl: '' as string | null, // URL après upload
});

// Charger les sujets disponibles
function fetchSubjects() {
  subjectStore.fetchSubjects().then(() => {
    subjectOptions.value = subjectStore.subjects.map((s) => ({
      label: s.name,
      value: s.id,
    }));
  });
}

// Pré-remplissage en édition
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      formData.value = {
        name: newVal.name || '',
        date: newVal.date || '',
        duration: newVal.duration || null,
        format: newVal.format || '',
        sampling_rate: newVal.sampling_rate || null,
        bit_depth: newVal.bit_depth || null,
        notes: newVal.notes || '',
        size: newVal.size || null,
        doi: newVal.doi || '',
        number: newVal.number || null,
        subjects: (newVal.subjects || []).map((s: any) => s.id),
        file: null,
        uploadedUrl: newVal.link || null,
      };
    } else {
      formData.value = {
        name: '',
        date: '',
        duration: null,
        format: '',
        sampling_rate: null,
        bit_depth: null,
        notes: '',
        size: null,
        doi: '',
        number: null,
        subjects: [],
        file: null,
        uploadedUrl: null,
      };
    }
  },
  { immediate: true }
);

onMounted(fetchSubjects);

// Upload le fichier seul puis associe l'URL dans formData.uploadedUrl
async function uploadFile() {
  if (!formData.value.file) return;

  const uploadData = new FormData();
  uploadData.append('file', formData.value.file);

  try {
    const response = await axios.post(`${apiBaseUrl}/file-upload/`, uploadData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    formData.value.uploadedUrl = response.data.file_url || response.data.url || null;
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

// Sauvegarder le File
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
      saved = await fileStore.createFile(payload);
    }

    emit('update:modelValue', null);
    emit('saved', saved);
  } catch (err) {
    console.error(err);
  }
}

// Déterminer si le fichier est audio pour l'aperçu
const isAudio = computed(() => formData.value.uploadedUrl?.match(/\.(mp3|wav|ogg|flac|aiff)$/i));
</script>

<template>
  <v-card class="pa-4" max-width="600">
    <v-card-title>
      <span>{{ props.modelValue ? 'Edit File' : 'Create File' }}</span>
    </v-card-title>

    <v-card-text>
      <!-- Champs texte -->
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
      <v-textarea v-model="formData.notes" label="Notes" outlined class="mb-3" />
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

      <!-- Sélecteur de sujets -->
      <v-select
        v-model="formData.subjects"
        :items="subjectOptions"
        item-title="label"
        item-value="value"
        label="Subjects"
        multiple
        chips
        outlined
        class="mb-3"
      />

      <v-btn color="primary" @click="showCreateSubject = true" class="mb-3">
        <v-icon start>mdi-plus</v-icon> Add Subject
      </v-btn>

      <!-- Upload de fichier -->
      <v-file-input
        v-model="formData.file"
        label="Upload File"
        prepend-icon="mdi-upload"
        show-size
        accept="audio/*,video/*"
        outlined
        class="mb-3"
      />

      <v-btn :disabled="!formData.file" color="primary" block class="mb-3" @click="uploadFile">
        Upload File
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

    <CreateSubjectModal v-model="showCreateSubject" @created="fetchSubjects()" />
  </v-card>
</template>
