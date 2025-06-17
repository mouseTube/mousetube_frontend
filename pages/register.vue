<script setup>
import { ref, computed } from 'vue';
import axios from 'axios';
const apiBaseUrl = useApiBaseUrl();

const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));
const showPassword = ref(false);
const showPassword2 = ref(false);
const form = ref({
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  password2: '',
});

const passwordError = computed(
  () => form.value.password !== form.value.password2 && form.value.password2.length > 0
);

const handleRegister = async () => {
  if (passwordError.value) {
    return;
  }
  try {
    await axios.post(`${baseUrl.value}/auth/users/`, {
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
      first_name: form.value.first_name,
      last_name: form.value.last_name,
    });
    alert('Check your email to activate your account.');
  } catch (error) {
    const data = error?.response?.data;
    if (data && typeof data === 'object') {
      const msg = Object.entries(data)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('\n');
      alert(`Registration failed:\n${msg}`);
    } else {
      alert('An unknown error occurred');
    }
  }
};
</script>

<template>
  <v-main
    class="d-flex flex-column align-center justify-center"
    style="min-height: 100vh; background-color: white"
  >
    <!-- Logo -->
    <img
      src="/logo_mousetube_big.png"
      alt="mouseTube Logo"
      style="width: 300px; margin-bottom: 12px"
    />

    <!-- Title -->
    <h2 class="text-h5 font-weight-medium mb-1">Create your mouseTube account</h2>
    <p class="text-body-2 mb-6" style="color: #666">Please fill in the form to register.</p>

    <!-- Card -->
    <v-card
      class="pa-6"
      style="border-radius: 20px; max-width: 360px; width: 100%; box-shadow: 0 4px 16px #00000015"
    >
      <v-form @submit.prevent="handleRegister">
        <v-text-field
          v-model="form.username"
          label="Username"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-4"
          required
        />
        <v-text-field
          v-model="form.email"
          label="Email"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-4"
          required
        />
        <v-text-field
          v-model="form.first_name"
          label="First name"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-4"
          required
        />
        <v-text-field
          v-model="form.last_name"
          label="Last name"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-4"
          required
        />
        <v-text-field
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          label="Password"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-4"
          required
        >
          <template #append-inner>
            <v-icon @click="showPassword = !showPassword" class="cursor-pointer">
              {{ showPassword ? 'mdi-eye-off' : 'mdi-eye' }}
            </v-icon>
          </template>
        </v-text-field>

        <v-text-field
          v-model="form.password2"
          :type="showPassword2 ? 'text' : 'password'"
          label="Confirm Password"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-4"
          :error="passwordError"
          :error-messages="passwordError ? ['Passwords do not match'] : []"
          required
        >
          <template #append-inner>
            <v-icon @click="showPassword2 = !showPassword2" class="cursor-pointer">
              {{ showPassword2 ? 'mdi-eye-off' : 'mdi-eye' }}
            </v-icon>
          </template>
        </v-text-field>
        <v-btn color="primary" style="width: 100%" type="submit" class="mt-2">
          Create Account
        </v-btn>
      </v-form>
    </v-card>
  </v-main>
</template>
