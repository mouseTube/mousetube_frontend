<script setup lang="ts">
// Download the account and everything the user added, as a JSON file (right of access).
import { ref } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

const { token } = useAuth();
const apiBaseUrl = useApiBaseUrl();
const loading = ref(false);
const error = ref('');

const download = async () => {
  loading.value = true;
  error.value = '';
  try {
    // the file is asked with the token (a plain link would not carry it), then saved from memory
    const res = await axios.get(`${apiBaseUrl}/my-data/`, {
      headers: { Authorization: `Bearer ${token.value}` },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mousetube-my-data.json';
    link.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    error.value =
      (e as { response?: { status?: number } }).response?.status === 429
        ? 'Wait a minute before asking again.'
        : 'The file could not be made. Try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <p class="text-body-2 mb-3">
      Download your profile and everything you added to mouseTube (sessions, files, hardware,
      software...), as a JSON file.
    </p>
    <v-btn
      variant="outlined"
      color="primary"
      prepend-icon="mdi-download"
      :loading="loading"
      @click="download"
    >
      Download my data
    </v-btn>
    <p v-if="error" class="text-caption text-error mt-2 mb-0" role="alert">{{ error }}</p>
  </div>
</template>
