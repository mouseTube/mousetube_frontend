<script setup>
import { useRoute, useRouter } from 'vue-router';
import { ref, computed } from 'vue';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const uid = route.params.uid;
const token = route.params.token;

const password = ref('');
const password2 = ref('');
const showPassword = ref(false);
const showPassword2 = ref(false);

const errorMessage = ref('');
const successMessage = ref('');
const loading = ref(false);
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

const passwordMismatch = computed(
  () => password.value !== password2.value && password2.value.length > 0
);

const resetPassword = async () => {
  errorMessage.value = '';
  successMessage.value = '';

  if (passwordMismatch.value) {
    errorMessage.value = 'Passwords do not match.';
    return;
  }

  loading.value = true;
  try {
    await axios.post(`${baseUrl.value}/auth/users/reset_password_confirm/`, {
      uid,
      token,
      new_password: password.value,
      re_new_password: password2.value,
    });
    successMessage.value = 'Password reset successful. Redirecting to login...';
    setTimeout(() => {
      router.push('/account/login');
    }, 3000);
  } catch (err) {
    errorMessage.value = 'Invalid or expired link.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-container class="d-flex justify-center align-center" style="min-height: 100vh">
    <v-card class="pa-6" max-width="400" width="100%">
      <h2 class="text-h6 mb-4">Reset your password</h2>

      <v-form @submit.prevent="resetPassword">
        <v-text-field
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          label="New Password"
          variant="outlined"
          required
        >
          <template #append-inner>
            <v-icon @click="showPassword = !showPassword" class="cursor-pointer">
              {{ showPassword ? 'mdi-eye-off' : 'mdi-eye' }}
            </v-icon>
          </template>
        </v-text-field>

        <v-text-field
          v-model="password2"
          :type="showPassword2 ? 'text' : 'password'"
          label="Confirm New Password"
          variant="outlined"
          :error="passwordMismatch"
          :error-messages="passwordMismatch ? ['Passwords do not match'] : []"
          required
        >
          <template #append-inner>
            <v-icon @click="showPassword2 = !showPassword2" class="cursor-pointer">
              {{ showPassword2 ? 'mdi-eye-off' : 'mdi-eye' }}
            </v-icon>
          </template>
        </v-text-field>

        <v-alert v-if="errorMessage" type="error" class="mb-4">{{ errorMessage }}</v-alert>
        <v-alert v-if="successMessage" type="success" class="mb-4">{{ successMessage }}</v-alert>

        <v-btn type="submit" color="primary" block :loading="loading"> Set New Password </v-btn>
      </v-form>
    </v-card>
  </v-container>
</template>
