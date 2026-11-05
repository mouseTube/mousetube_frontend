<script setup>
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { ref, onMounted } from 'vue';

const route = useRoute();
const router = useRouter();
const status = ref('Confirming your email address...');
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

onMounted(async () => {
  try {
    await axios.post(`${baseUrl.value}/auth/users/activation/`, {
      uid: route.params.uid,
      token: route.params.token,
    });
    status.value =
      'Thank you, your email address is confirmed. An administrator will now review your ' +
      'request. You will receive an email when your account is activated.';
  } catch (error) {
    status.value =
      error.response?.status === 403
        ? 'This account is already active. You can log in.'
        : 'This confirmation link is invalid or has expired. Register again or contact us.';
  }
});
</script>

<template>
  <v-main class="d-flex align-center justify-center" style="min-height: 100vh">
    <div>{{ status }}</div>
  </v-main>
</template>
