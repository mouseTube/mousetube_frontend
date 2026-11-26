<script setup lang="ts">
// Log out of all devices: every sign-in of the user ends, this one included (the server keeps the moment
// up to which the sign-ins are revoked). Useful after a lost phone or a shared computer.
import { ref, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

const router = useRouter();
const { token, logout } = useAuth();
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

const asking = ref(false);
const loading = ref(false);
const error = ref('');

const confirm = async () => {
  loading.value = true;
  error.value = '';
  try {
    await axios.post(
      `${baseUrl.value}/auth/logout_all/`,
      {},
      { headers: { Authorization: `Bearer ${token.value}` } }
    );
    asking.value = false;
    logout(); // this sign-in is revoked too
    router.push('/account/login');
  } catch {
    error.value = 'The sign-outs could not be done. Try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <p class="text-body-2 mb-3">
      Sign out of every device where you are signed in, this one included. Use it if you lost a
      phone or used a shared computer.
    </p>
    <v-btn
      variant="outlined"
      color="primary"
      prepend-icon="mdi-logout-variant"
      @click="asking = true"
    >
      Log out of all devices
    </v-btn>

    <v-dialog v-model="asking" max-width="440">
      <v-card>
        <v-card-title>Log out of all devices?</v-card-title>
        <v-card-text>
          You will be signed out here too, and everywhere else. Sign in again when you need to.
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3">
            {{ error }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="loading" @click="asking = false">Cancel</v-btn>
          <v-btn color="primary" :loading="loading" @click="confirm">Log out everywhere</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
