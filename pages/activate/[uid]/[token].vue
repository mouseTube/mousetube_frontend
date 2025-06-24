<script setup>
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { ref, onMounted } from 'vue';

const route = useRoute();
const router = useRouter();
const status = ref('Activating...');
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

onMounted(async () => {
  try {
    await axios.post(`${baseUrl.value}/auth/users/activation/`, {
      uid: route.params.uid,
      token: route.params.token,
    });
    status.value = 'Your account has been successfully activated. You can now log in.';
  } catch (error) {
    status.value = 'Activation failed: ' + (error.response?.data?.detail || 'Unknown error');
  }
});
</script>

<template>
  <v-main class="d-flex align-center justify-center" style="min-height: 100vh">
    <div>{{ status }}</div>
  </v-main>
</template>
