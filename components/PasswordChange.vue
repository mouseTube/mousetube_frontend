<script setup lang="ts">
// Change the password of the signed-in user: the current password is asked, so a stolen session is not
// enough, and it works without e-mail (the reset by e-mail is for a forgotten password). The new one
// follows the rules of the registration form; the API applies the real ones.
import { ref, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { passwordHint, passwordLengthRule, passwordDigitsRule } from '@/composables/passwordRules';

const router = useRouter();
const { token, currentUser, login, logout } = useAuth();
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

const form = ref<{ validate: () => Promise<{ valid: boolean }>; reset: () => void } | null>(null);
const current = ref('');
const password = ref('');
const password2 = ref('');
const showCurrent = ref(false);
const showPassword = ref(false);
const showPassword2 = ref(false);
const loading = ref(false);
const done = ref(false);
const errors = ref<string[]>([]);

const required = (v: string) => !!v || 'This field is required';
const mismatchRule = (v: string) => v === password.value || 'Passwords do not match';

const labels: Record<string, string> = {
  current_password: 'Current password',
  new_password: 'New password',
  re_new_password: 'Confirmation',
};
// what the API answers (a list of messages by field) as lines to show
const messages = (data: unknown): string[] => {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data as Record<string, unknown>).flatMap(([field, value]) =>
    (Array.isArray(value) ? value : [value]).map((m) =>
      labels[field] ? `${labels[field]}: ${m}` : String(m)
    )
  );
};

const submit = async () => {
  done.value = false;
  errors.value = [];
  if (!(await form.value?.validate())?.valid) return;
  loading.value = true;
  try {
    await axios.post(
      `${baseUrl.value}/auth/users/set_password/`,
      {
        current_password: current.value,
        new_password: password.value,
        re_new_password: password2.value,
      },
      { headers: { Authorization: `Bearer ${token.value}` } }
    );
    // a new password ends every sign-in made with the old one, this one included: sign in again
    const username = currentUser.value;
    const newPassword = password.value;
    form.value?.reset();
    try {
      await login(username as string, newPassword);
      done.value = true;
    } catch {
      logout();
      router.push('/account/login');
    }
  } catch (error) {
    const response = (error as { response?: { status?: number; data?: unknown } }).response;
    errors.value =
      response?.status === 429
        ? ['Too many attempts. Try again in a minute.']
        : response?.status === 401
          ? ['Your session has ended. Sign in again.']
          : messages(response?.data);
    if (!errors.value.length) errors.value = ['The password could not be changed.'];
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-form ref="form" class="password-change" @submit.prevent="submit">
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
    <v-text-field
      v-model="password"
      :type="showPassword ? 'text' : 'password'"
      label="New password"
      variant="outlined"
      density="comfortable"
      autocomplete="new-password"
      :hint="passwordHint"
      persistent-hint
      :rules="[required, passwordLengthRule, passwordDigitsRule]"
      validate-on="blur lazy"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      class="mb-2"
      @click:append-inner="showPassword = !showPassword"
    />
    <v-text-field
      v-model="password2"
      :type="showPassword2 ? 'text' : 'password'"
      label="Confirm the new password"
      variant="outlined"
      density="comfortable"
      autocomplete="new-password"
      :rules="[required, mismatchRule]"
      validate-on="blur lazy"
      :append-inner-icon="showPassword2 ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="showPassword2 = !showPassword2"
    />
    <v-alert v-if="errors.length" type="error" variant="tonal" density="compact" class="mb-3">
      <div v-for="message in errors" :key="message">{{ message }}</div>
    </v-alert>
    <v-alert v-if="done" type="success" variant="tonal" density="compact" class="mb-3">
      Your password has been changed.
    </v-alert>
    <v-btn type="submit" color="primary" :loading="loading">Change the password</v-btn>
  </v-form>
</template>

<style scoped>
.password-change {
  max-width: 460px;
}
</style>
