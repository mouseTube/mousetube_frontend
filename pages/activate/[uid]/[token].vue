<script setup>
import { useRoute } from 'vue-router';
import axios from 'axios';
import { ref, computed, onMounted } from 'vue';

const route = useRoute();
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

// loading | confirmed | active | invalid | network
const state = ref('loading');

const confirm = async () => {
  state.value = 'loading';
  try {
    await axios.post(`${baseUrl.value}/auth/users/activation/`, {
      uid: route.params.uid,
      token: route.params.token,
    });
    state.value = 'confirmed';
  } catch (error) {
    if (!error.response) state.value = 'network';
    else if (error.response.status === 403) state.value = 'active';
    else state.value = 'invalid';
  }
};

// Expired or invalid link: ask for a new one
const resendEmail = ref('');
const resendMessage = ref('');
const resending = ref(false);
const resend = async () => {
  if (!/.+@.+\..+/.test(resendEmail.value)) {
    resendMessage.value = 'Enter the email address you registered with.';
    return;
  }
  resending.value = true;
  try {
    // 204 whether or not the address is registered (no account enumeration)
    await axios.post(`${baseUrl.value}/auth/users/resend_activation/`, {
      email: resendEmail.value,
    });
    resendMessage.value =
      'If this address has a pending request, a new link is on its way. It can take a few minutes.';
  } catch (error) {
    resendMessage.value =
      error.response?.status === 429
        ? 'Too many attempts. Please wait a minute.'
        : 'The email could not be sent. Please try again later.';
  } finally {
    resending.value = false;
  }
};

// Progress header: 1 details (done) - 2 confirm email - 3 administrator review
const step = computed(() => (state.value === 'confirmed' ? 3 : 2));

onMounted(confirm);
</script>

<template>
  <v-main
    class="d-flex flex-column align-center justify-center py-8 px-3"
    style="min-height: 100vh; background-color: white"
  >
    <img
      src="/logo_mousetube_big.png"
      alt="mouseTube Logo"
      style="width: 300px; max-width: 80%; margin-bottom: 12px"
    />

    <v-stepper
      :model-value="step"
      flat
      hide-actions
      alt-labels
      class="mb-4"
      style="max-width: 560px; width: 100%; background: transparent"
    >
      <v-stepper-header style="box-shadow: none">
        <v-stepper-item :value="1" title="Your details" complete color="primary" />
        <v-divider />
        <v-stepper-item
          :value="2"
          title="Confirm your email"
          :complete="state === 'confirmed'"
          :error="state === 'invalid' || state === 'network'"
          color="primary"
        />
        <v-divider />
        <v-stepper-item :value="3" title="Administrator review" color="primary" />
      </v-stepper-header>
    </v-stepper>

    <v-card
      class="pa-6 text-center"
      style="border-radius: 20px; max-width: 480px; width: 100%; box-shadow: 0 4px 16px #00000015"
      aria-live="polite"
    >
      <template v-if="state === 'loading'">
        <v-progress-circular indeterminate color="primary" size="48" />
        <h1 class="text-h6 mt-4">Confirming your email address...</h1>
      </template>

      <template v-else-if="state === 'confirmed'">
        <v-icon size="56" color="success">mdi-check-circle-outline</v-icon>
        <h1 class="text-h6 mt-2 mb-2">Your email address is confirmed</h1>
        <p class="text-body-2 mb-4">
          Thank you. An administrator will now review your request. You will receive an email as
          soon as your account is active. You do not need to do anything else.
        </p>
        <v-btn color="primary" variant="tonal" to="/">Back to home</v-btn>
      </template>

      <template v-else-if="state === 'active'">
        <v-icon size="56" color="success">mdi-account-check-outline</v-icon>
        <h1 class="text-h6 mt-2 mb-2">Your account is already active</h1>
        <p class="text-body-2 mb-4">This link was already used. You can log in.</p>
        <v-btn color="primary" to="/account/login">Log in</v-btn>
      </template>

      <template v-else-if="state === 'network'">
        <v-icon size="56" color="warning">mdi-wifi-off</v-icon>
        <h1 class="text-h6 mt-2 mb-2">We could not reach the server</h1>
        <p class="text-body-2 mb-4">Check your connection and try again.</p>
        <v-btn color="primary" @click="confirm">Try again</v-btn>
      </template>

      <template v-else>
        <v-icon size="56" color="error">mdi-link-off</v-icon>
        <h1 class="text-h6 mt-2 mb-2">This link is no longer valid</h1>
        <p class="text-body-2 mb-4">
          Confirmation links expire after 3 days. Enter the email address you registered with and we
          send you a new one.
        </p>
        <v-text-field
          v-model="resendEmail"
          label="Institutional email"
          type="email"
          variant="outlined"
          density="comfortable"
          autocomplete="email"
          autocapitalize="none"
          spellcheck="false"
          @keyup.enter="resend"
        />
        <v-btn color="primary" :loading="resending" @click="resend">Send a new link</v-btn>
        <div v-if="resendMessage" class="text-body-2 mt-3" role="status">{{ resendMessage }}</div>
        <div class="mt-4">
          <v-btn variant="text" size="small" to="/account/register">Back to registration</v-btn>
        </div>
      </template>
    </v-card>
  </v-main>
</template>
