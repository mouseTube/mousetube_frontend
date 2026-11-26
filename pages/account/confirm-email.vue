<script setup lang="ts">
// The link sent to the new e-mail address. It works for the signed-in user it was made for: someone
// who is not signed in is sent to the login and brought back here, with the token kept for this tab only.
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

const KEY = 'pending_email_change';
const route = useRoute();
const router = useRouter();
const { token, loggedIn, fetchUser } = useAuth();
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

// loading | login | done | invalid | network
const state = ref('loading');
const email = ref('');

const confirm = async () => {
  let link = String(route.query.token || '');
  if (!link) link = sessionStorage.getItem(KEY) || '';
  if (!link) {
    state.value = 'invalid';
    return;
  }
  if (!loggedIn.value) {
    sessionStorage.setItem(KEY, link);
    state.value = 'login';
    return;
  }
  state.value = 'loading';
  try {
    const res = await axios.post(
      `${baseUrl.value}/auth/users/confirm_email_change/`,
      { token: link },
      { headers: { Authorization: `Bearer ${token.value}` } }
    );
    email.value = res.data.email;
    sessionStorage.removeItem(KEY);
    state.value = 'done';
    fetchUser?.().catch(() => {});
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (!status) state.value = 'network';
    else {
      sessionStorage.removeItem(KEY);
      state.value = 'invalid';
    }
  }
};

onMounted(confirm);
</script>

<template>
  <v-main
    class="d-flex flex-column align-center"
    style="min-height: 100vh; background-color: white"
  >
    <div class="d-flex flex-column align-center my-auto py-8 px-3" style="width: 100%">
      <img
        src="/logo_mousetube_big.png"
        alt="mouseTube Logo"
        style="width: 300px; max-width: 80%; margin-bottom: 12px"
      />
      <v-card
        class="pa-6 text-center"
        style="border-radius: 20px; max-width: 480px; width: 100%; box-shadow: 0 4px 16px #00000015"
        aria-live="polite"
      >
        <template v-if="state === 'loading'">
          <v-progress-circular indeterminate color="primary" size="48" />
          <h1 class="text-h6 mt-4">Confirming your new e-mail address...</h1>
        </template>

        <template v-else-if="state === 'login'">
          <v-icon size="56" color="primary">mdi-account-lock-outline</v-icon>
          <h1 class="text-h6 mt-2 mb-2">Sign in to confirm</h1>
          <p class="text-body-2 mb-4">
            Sign in with the account that asked for this change. You come back here to finish.
          </p>
          <v-btn color="primary" to="/account/login">Sign in</v-btn>
        </template>

        <template v-else-if="state === 'done'">
          <v-icon size="56" color="success">mdi-check-circle-outline</v-icon>
          <h1 class="text-h6 mt-2 mb-2">Your e-mail address is changed</h1>
          <p class="text-body-2 mb-4">
            Your account now uses <strong>{{ email }}</strong
            >. Your previous address was told.
          </p>
          <v-btn color="primary" variant="tonal" to="/account/details">My account</v-btn>
        </template>

        <template v-else-if="state === 'network'">
          <v-icon size="56" color="warning">mdi-wifi-off</v-icon>
          <h1 class="text-h6 mt-2 mb-2">We could not reach the server</h1>
          <p class="text-body-2 mb-4">Check your connection and try again.</p>
          <v-btn color="primary" @click="confirm">Try again</v-btn>
        </template>

        <template v-else>
          <v-icon size="56" color="error">mdi-link-off</v-icon>
          <h1 class="text-h6 mt-2 mb-2">This link cannot be used</h1>
          <p class="text-body-2 mb-4">
            It expired (24 hours), was already used, was made for another account, or your password
            changed since. Ask for a new link from your account page.
          </p>
          <v-btn color="primary" @click="router.push('/account/details')">My account</v-btn>
        </template>
      </v-card>
    </div>
  </v-main>
</template>
