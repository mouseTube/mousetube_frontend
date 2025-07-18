<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';

const file = ref<File | null>(null);
const uploadedUrl = ref<string | null>(null);

const apiBaseUrl = useApiBaseUrl();

const isAudio = computed(() => {
  return uploadedUrl.value?.match(/\.(mp3|wav|ogg|flac|aiff)$/i);
});

async function uploadFile() {
  if (!file.value) return;

  const formData = new FormData();
  formData.append('file', file.value);

  try {
    const response = await axios.post(`${apiBaseUrl}/file/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    uploadedUrl.value = response.data.file_url || response.data.url || null;
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
</script>

<template>
  <v-container class="d-flex justify-center">
    <v-card class="pa-6" max-width="600">
      <v-card-title>Upload File</v-card-title>
      <v-card-text>
        <!-- File Input -->
        <v-file-input
          v-model="file"
          label="Select a file to upload"
          prepend-icon="mdi-upload"
          show-size
          accept="audio/*,video/*"
          outlined
          class="mb-4"
        />

        <!-- Upload Button -->
        <v-btn :disabled="!file" color="primary" class="mt-2" block @click="uploadFile">
          Upload
        </v-btn>

        <!-- Uploaded File Preview -->
        <div v-if="uploadedUrl" class="mt-4">
          <v-alert type="success" class="mb-4"> File uploaded successfully! </v-alert>
          <audio v-if="isAudio" controls :src="uploadedUrl" class="w-full" />
          <video v-else controls :src="uploadedUrl" class="w-full max-h-64" />
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>
