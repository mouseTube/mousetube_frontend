<script setup>
import { ref } from 'vue';
import axios from 'axios';
const email = ref('');
const emailSent = ref(false);
const errorMessage = ref('');
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));
const loading = ref(false);

const sendResetEmail = async () => {
  errorMessage.value = '';
  loading.value = true;
  try {
    await axios.post(`${baseUrl.value}/auth/users/reset_password/`, {
      email: email.value,
    });
    emailSent.value = true;
  } catch (error) {
    errorMessage.value = 'An error occurred. Please check the email address.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-main class="d-flex flex-column align-center justify-center" style="min-height: 100vh">
    <v-card class="pa-6" style="max-width: 400px; width: 100%">
      <h2 class="text-h6 mb-4">Reset your password</h2>
      <p class="text-body-2 mb-4">
        Enter your email address, and we’ll send you a link to reset your password.
      </p>

      <v-form @submit.prevent="sendResetEmail">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          variant="outlined"
          :disabled="emailSent"
          required
          class="mb-4"
        />

        <v-alert v-if="emailSent" type="success" class="mb-4">
          Email sent! Please check your inbox.
        </v-alert>
        <v-alert v-if="errorMessage" type="error" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <v-btn type="submit" color="primary" :loading="loading" block> Send reset link </v-btn>
      </v-form>
    </v-card>
  </v-main>
</template>
