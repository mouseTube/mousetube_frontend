<script setup lang="ts">
// Change the e-mail address of the account. The address recovers a forgotten password, so the current
// password is asked and a link is sent to the NEW address: the address changes only when the user opens it.
// The API answers the same whether or not the address can be used, so the message says "if".
import { ref, computed } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

const { token } = useAuth();
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

const asking = ref(false);
const form = ref<{ validate: () => Promise<{ valid: boolean }>; reset: () => void } | null>(null);
const newEmail = ref('');
const current = ref('');
const showCurrent = ref(false);
const loading = ref(false);
const sentTo = ref('');
const errors = ref<string[]>([]);

const required = (v: string) => !!v || 'This field is required';
const emailFormat = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim()) || 'Invalid e-mail address';

const open = () => {
  sentTo.value = '';
  errors.value = [];
  asking.value = true;
};

const submit = async () => {
  errors.value = [];
  if (!(await form.value?.validate())?.valid) return;
  loading.value = true;
  try {
    await axios.post(
      `${baseUrl.value}/auth/users/change_email/`,
      { new_email: newEmail.value.trim(), current_password: current.value },
      { headers: { Authorization: `Bearer ${token.value}` } }
    );
    sentTo.value = newEmail.value.trim();
    form.value?.reset();
  } catch (error) {
    const response = (error as { response?: { status?: number; data?: Record<string, string[]> } })
      .response;
    if (response?.status === 429) errors.value = ['Too many attempts. Try again in a minute.'];
    else if (response?.status === 401) errors.value = ['Your session has ended. Sign in again.'];
    else if (response?.status === 503)
      errors.value = ['The e-mail could not be sent. Try again later.'];
    else
      errors.value = [
        ...(response?.data?.current_password ?? []).map((m) => `Password: ${m}`),
        ...(response?.data?.new_email ?? []),
      ];
    if (!errors.value.length) errors.value = ['The change could not be requested.'];
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <v-btn
      variant="text"
      size="small"
      prepend-icon="mdi-email-edit-outline"
      data-test="change-email"
      @click="open"
    >
      Change e-mail
    </v-btn>

    <v-dialog v-model="asking" max-width="480">
      <v-card>
        <v-card-title>Change your e-mail address</v-card-title>
        <v-card-text>
          <template v-if="sentTo">
            <v-alert type="success" variant="tonal" density="compact">
              If <strong>{{ sentTo }}</strong> can be used, a link was sent to it. Open it while
              signed in to mouseTube (valid 24 hours). Your address changes only then, and your
              current address is told.
            </v-alert>
          </template>
          <v-form v-else ref="form" @submit.prevent="submit">
            <p class="text-body-2 mb-3">
              Use your institutional address. A link is sent to the new address to confirm it.
            </p>
            <v-text-field
              v-model="newEmail"
              type="email"
              label="New e-mail address"
              variant="outlined"
              density="comfortable"
              autocomplete="email"
              :rules="[required, emailFormat]"
              validate-on="blur lazy"
            />
            <v-text-field
              v-model="current"
              :type="showCurrent ? 'text' : 'password'"
              label="Current password"
              variant="outlined"
              density="comfortable"
              autocomplete="current-password"
              :rules="[required]"
              validate-on="blur lazy"
              :append-inner-icon="showCurrent ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showCurrent = !showCurrent"
            />
            <v-alert v-if="errors.length" type="error" variant="tonal" density="compact">
              <div v-for="line in errors" :key="line">{{ line }}</div>
            </v-alert>
            <button type="submit" hidden />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="loading" @click="asking = false">
            {{ sentTo ? 'Close' : 'Cancel' }}
          </v-btn>
          <v-btn v-if="!sentTo" color="primary" :loading="loading" @click="submit">
            Send the link
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
