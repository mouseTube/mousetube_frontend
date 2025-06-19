<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
const username = ref('');
const password = ref('');
const router = useRouter();
const auth = useAuth();
const showPassword = ref(false);
const loginErrorMessage = ref('');
const loginForm = ref(null);
const formValid = ref(true);
// const apiBaseUrl = useApiBaseUrl();
const baseUrl = ref('https://dane-aware-vaguely.ngrok-free.app');

const handleLogin = async () => {
  loginErrorMessage.value = ''; // reset

  const validationResult = await loginForm.value?.validate();
  if (!validationResult?.valid) return;

  try {
    const success = await auth.login(username.value, password.value);
    if (success) {
      router.push('/account/details');
    } else {
      loginErrorMessage.value = 'Invalid username or password.';
    }
  } catch (error) {
    const response = error?.response;
    const data = response?.data || error?.data;

    if (data?.detail) {
      loginErrorMessage.value = data.detail;
    } else if (data?.non_field_errors?.length) {
      loginErrorMessage.value = data.non_field_errors[0];
    } else if (typeof data === 'string') {
      loginErrorMessage.value = data;
    } else if (error?.message) {
      loginErrorMessage.value = error.message;
    } else {
      loginErrorMessage.value = 'An unexpected error occurred. Please try again.';
    }
  }
};
const redirectToOrcid = () => {
  window.location.href = `${baseUrl.value}/accounts/orcid/login/`;
};

onMounted(() => {
  const errorParam = route.query.error;
  if (errorParam === 'no_token') {
    loginErrorMessage.value = 'Authentication failed. Please try again.';
  }
});
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
    <h2 class="text-h5 font-weight-medium mb-1">Welcome back to mouseTube</h2>
    <p class="text-body-2 mb-6" style="color: #666">Please sign in to continue.</p>

    <!-- Card -->
    <v-card
      class="pa-6"
      style="border-radius: 20px; max-width: 360px; width: 100%; box-shadow: 0 4px 16px #00000015"
    >
      <v-form ref="loginForm" @submit.prevent="handleLogin" v-model="formValid">
        <v-text-field
          v-model="username"
          :rules="[(v) => !!v || 'Username is required']"
          label="Username"
          variant="outlined"
          density="comfortable"
          class="mb-4"
          required
        />
        <v-text-field
          v-model="password"
          :rules="[(v) => !!v || 'Password is required']"
          :type="showPassword ? 'text' : 'password'"
          label="Password"
          variant="outlined"
          density="comfortable"
          class="mb-4"
          required
        >
          <template #append-inner>
            <v-icon @click="showPassword = !showPassword" class="cursor-pointer">
              {{ showPassword ? 'mdi-eye-off' : 'mdi-eye' }}
            </v-icon>
          </template>
        </v-text-field>
        <p class="text-caption text-end">
          <a href="/account/forgot-password" class="text-primary">Forgot your password?</a>
        </p>

        <v-alert
          v-if="loginErrorMessage"
          type="error"
          variant="tonal"
          class="mb-4"
          border="start"
          color="error"
        >
          {{ loginErrorMessage }}
        </v-alert>

        <!-- Red button -->
        <v-btn
          color="primary"
          class="mt-2"
          style="width: 100%; border-radius: 12px"
          type="submit"
          size="large"
        >
          Log in
        </v-btn>

        <v-divider class="my-4" />
        <p class="text-center text-body-2 mb-4" style="color: #666">
          Don't have an account? <br />
          <span class="font-weight-bold">Create one now!</span>
        </p>
        <v-btn
          variant="outlined"
          color="primary"
          style="width: 100%; border-radius: 12px"
          @click="router.push('/account/register')"
          size="large"
        >
          Create an account
        </v-btn>
        <v-btn
          variant="outlined"
          color="success"
          style="width: 100%; border-radius: 12px; margin-top: 12px"
          @click="redirectToOrcid"
          size="large"
        >
          <v-icon start>mdi-account-circle</v-icon>
          Sign in with ORCID
        </v-btn>
      </v-form>
    </v-card>
  </v-main>
</template>
