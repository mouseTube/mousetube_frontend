<script setup lang="ts">
// Remove the ORCID iD from the account (it can be linked again, or by another account). The password
// is asked: a stolen session must not be enough to change how the account is reached.
import { ref } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

const emit = defineEmits<{ (e: 'unlinked'): void }>();

const { token } = useAuth();
const apiBaseUrl = useApiBaseUrl();

const asking = ref(false);
const password = ref('');
const loading = ref(false);
const error = ref('');

const open = () => {
  password.value = '';
  error.value = '';
  asking.value = true;
};

const submit = async () => {
  if (!password.value) {
    error.value = 'Enter your password.';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await axios.post(
      `${apiBaseUrl}/unlink-orcid/`,
      { current_password: password.value },
      { headers: { Authorization: `Bearer ${token.value}` } }
    );
    asking.value = false;
    emit('unlinked');
  } catch (e) {
    const status = (e as { response?: { status?: number } }).response?.status;
    error.value =
      status === 429
        ? 'Too many attempts. Try again in a minute.'
        : status === 400
          ? 'The password is not correct.'
          : 'The ORCID could not be removed. Try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <span>
    <v-btn size="small" variant="text" prepend-icon="mdi-link-off" @click="open">
      Unlink ORCID
    </v-btn>
    <v-dialog v-model="asking" max-width="440">
      <v-card>
        <v-card-title>Unlink your ORCID iD?</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">
            You will no longer be able to sign in with ORCID; your password still works. You can
            link an ORCID iD again later.
          </p>
          <v-form @submit.prevent="submit">
            <v-text-field
              v-model="password"
              type="password"
              label="Current password"
              variant="outlined"
              density="comfortable"
              autocomplete="current-password"
              :error-messages="error"
              hide-details="auto"
            />
            <button type="submit" hidden />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="loading" @click="asking = false">Cancel</v-btn>
          <v-btn color="primary" :loading="loading" @click="submit">Unlink</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </span>
</template>
