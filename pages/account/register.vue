<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
const apiBaseUrl = useApiBaseUrl();
const route = useRoute();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

const loginForm = ref(null);
const showPassword = ref(false);
const showPassword2 = ref(false);

const requiredRule = (v) => (!!v && v.trim() !== '') || 'This field is required';
const emailRule = (v) => /.+@.+\..+/.test(v) || 'This does not look like an email address';
const usernameRule = (v) =>
  /^[\w.@+-]+$/.test(v) || 'Use only letters, digits and the characters @ . + - _';
const passwordLengthRule = (v) => (v || '').length >= 8 || 'Use at least 8 characters';
const passwordDigitsRule = (v) => !/^\d+$/.test(v || '') || 'Do not use digits only';

// Personal providers (gmail, outlook...) are refused. The list comes from the API, which
// enforces the same rule on its side; this only gives instant feedback.
const personalDomains = ref(new Set());
const institutionalOnly = ref(false);
const isPersonalEmail = (email) => {
  const parts = email.split('@').pop().trim().toLowerCase().split('.');
  return parts.some((_, i) => personalDomains.value.has(parts.slice(i).join('.')));
};
const institutionalRule = (v) =>
  !institutionalOnly.value ||
  !v ||
  !isPersonalEmail(v) ||
  'This looks like a personal address (Gmail, Outlook, Yahoo...). Use your institutional address.';

const serverMessage = ref('');
const submitting = ref(false); // request in progress: blocks double clicks
const registered = ref(false); // account request sent: the form is done
const submittedEmail = ref('');
const resendMessage = ref('');
const resendWait = ref(0); // seconds before the confirmation e-mail can be sent again
let resendTimer = null;
const hasOrcid = ref(false);

const form = ref({
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  orcid: '',
  orcid_proof: '',
  password: '',
  password2: '',
});

const errors = ref({
  username: [],
  email: [],
  first_name: [],
  last_name: [],
  orcid: [],
  password: [],
  password2: [],
});

const hasFieldErrors = computed(() => Object.values(errors.value).some((m) => m.length > 0));

const passwordError = computed(
  () => form.value.password !== form.value.password2 && form.value.password2.length > 0
);

// Rough guide only: the API applies the real password rules.
const passwordScore = computed(() => {
  const p = form.value.password;
  return [
    p.length >= 8,
    p.length >= 12,
    /[a-z]/.test(p) && /[A-Z]/.test(p),
    /\d/.test(p),
    /[^A-Za-z0-9]/.test(p),
  ].filter(Boolean).length;
});
const passwordStrength = computed(
  () =>
    [
      { label: '', color: 'grey-lighten-2' },
      { label: 'Weak', color: 'error' },
      { label: 'Weak', color: 'error' },
      { label: 'Fair', color: 'warning' },
      { label: 'Good', color: 'success' },
      { label: 'Strong', color: 'success' },
    ][passwordScore.value]
);

// Current step shown in the progress header: 1 = form, 2 = e-mail, 3 = admin review
const step = computed(() => (registered.value ? 2 : 1));

const handleRegister = async () => {
  serverMessage.value = '';
  // Reset errors
  Object.keys(errors.value).forEach((key) => {
    errors.value[key] = [];
  });

  const result = await loginForm.value?.validate();
  if (!result?.valid || passwordError.value) return;

  submitting.value = true;
  try {
    await axios.post(`${baseUrl.value}/auth/users/`, {
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
      first_name: form.value.first_name,
      last_name: form.value.last_name,
      orcid_proof: form.value.orcid_proof,
    });
    submittedEmail.value = form.value.email;
    registered.value = true;
    startResendWait();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    const data = error?.response?.data;
    if (error?.response?.status === 429) {
      serverMessage.value = 'Too many attempts. Please wait a minute and try again.';
    } else if (data && typeof data === 'object') {
      Object.entries(data).forEach(([field, messages]) => {
        const key = field === 'orcid_proof' ? 'orcid' : field;
        if (key in errors.value) {
          errors.value[key] = Array.isArray(messages) ? messages : [String(messages)];
        }
      });
      if (!hasFieldErrors.value) {
        serverMessage.value = 'The registration could not be completed. Please try again.';
      }
    } else {
      serverMessage.value = 'A network error occurred. Please check your connection and retry.';
    }
  } finally {
    submitting.value = false;
  }
};

const startResendWait = (seconds = 60) => {
  clearInterval(resendTimer);
  resendWait.value = seconds;
  resendTimer = setInterval(() => {
    resendWait.value -= 1;
    if (resendWait.value <= 0) clearInterval(resendTimer);
  }, 1000);
};

const resendConfirmation = async () => {
  resendMessage.value = '';
  startResendWait();
  try {
    // The API answers 204 whether or not the address exists (no account enumeration).
    await axios.post(`${baseUrl.value}/auth/users/resend_activation/`, {
      email: submittedEmail.value,
    });
    resendMessage.value = 'A new email has been sent. It can take a few minutes to arrive.';
  } catch (error) {
    resendMessage.value =
      error?.response?.status === 429
        ? 'Too many attempts. Please wait a minute.'
        : 'The email could not be sent. Please try again later.';
  }
};

onBeforeUnmount(() => clearInterval(resendTimer));

onMounted(async () => {
  try {
    const res = await axios.get(`${apiBaseUrl}/personal-email-domains/`);
    personalDomains.value = new Set(res.data.domains);
    institutionalOnly.value = res.data.enforced;
  } catch {
    // the API still refuses personal addresses when the form is submitted
  }
  const q = route.query;
  if (q.first_name) form.value.first_name = q.first_name;
  if (q.last_name) form.value.last_name = q.last_name;
  if (q.orcid) {
    form.value.orcid = q.orcid;
    form.value.orcid_proof = q.orcid_proof || '';
    hasOrcid.value = true;
  }
});
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

    <h1 class="text-h5 font-weight-medium mb-1">Create your mouseTube account</h1>
    <p class="text-body-2 mb-4" style="color: #666">
      {{
        registered
          ? 'One more step: confirm your email address.'
          : 'It takes a minute. An administrator then reviews every request.'
      }}
    </p>

    <!-- Progress: what happens and what is next -->
    <v-stepper
      :model-value="step"
      flat
      hide-actions
      alt-labels
      class="mb-4"
      style="max-width: 560px; width: 100%; background: transparent"
    >
      <v-stepper-header style="box-shadow: none">
        <v-stepper-item :value="1" title="Your details" :complete="step > 1" color="primary" />
        <v-divider />
        <v-stepper-item :value="2" title="Confirm your email" color="primary" />
        <v-divider />
        <v-stepper-item :value="3" title="Administrator review" color="primary" />
      </v-stepper-header>
    </v-stepper>

    <v-card
      class="pa-6"
      style="border-radius: 20px; max-width: 480px; width: 100%; box-shadow: 0 4px 16px #00000015"
    >
      <!-- ============ Step 2: request sent ============ -->
      <div v-if="registered" aria-live="polite">
        <div class="text-center">
          <v-icon size="56" color="primary">mdi-email-check-outline</v-icon>
          <h2 class="text-h6 mt-2 mb-1">Check your inbox</h2>
          <p class="text-body-2 mb-4">
            We sent a confirmation link to <strong>{{ submittedEmail }}</strong
            >.
          </p>
        </div>

        <ol class="text-body-2 ps-5 mb-4">
          <li class="mb-1">Open the email and click the link to confirm your address.</li>
          <li class="mb-1">An administrator then reviews your request.</li>
          <li>You receive an email as soon as your account is active. Then you can log in.</li>
        </ol>

        <v-divider class="mb-4" />

        <div class="text-center">
          <div class="text-body-2" style="color: #666">Did not receive the email?</div>
          <v-btn
            variant="text"
            color="primary"
            :disabled="resendWait > 0"
            @click="resendConfirmation"
          >
            {{ resendWait > 0 ? `Resend the email in ${resendWait} s` : 'Resend the email' }}
          </v-btn>
          <div v-if="resendMessage" class="text-body-2 mt-1" role="status">
            {{ resendMessage }}
          </div>
          <div class="text-caption mt-2" style="color: #666">
            Check your spam folder too. The link is valid for 3 days.
          </div>
          <v-btn variant="text" size="small" class="mt-4" to="/">Back to home</v-btn>
        </div>
      </div>

      <!-- ============ Step 1: form ============ -->
      <v-form v-else ref="loginForm" novalidate @submit.prevent="handleRegister">
        <v-alert v-if="hasOrcid" type="info" variant="tonal" density="compact" class="mb-4">
          No mouseTube account is linked to this ORCID iD yet. Complete this form to create one.
          Already have an account?
          <nuxt-link to="/account/login">Log in</nuxt-link>, then link your ORCID from your profile.
        </v-alert>

        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          <strong>Use your institutional email address</strong> (university, research institute or
          hospital). Personal addresses such as Gmail, Outlook or Yahoo are not accepted.
        </v-alert>

        <div aria-live="polite">
          <v-alert
            v-if="serverMessage || hasFieldErrors"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            {{ serverMessage || 'Please correct the highlighted fields.' }}
          </v-alert>
        </div>

        <div class="text-subtitle-2 mb-2">About you</div>
        <v-row dense>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.first_name"
              label="First name"
              variant="outlined"
              density="comfortable"
              autocomplete="given-name"
              :error-messages="errors.first_name"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.last_name"
              label="Last name"
              variant="outlined"
              density="comfortable"
              autocomplete="family-name"
              :error-messages="errors.last_name"
            />
          </v-col>
        </v-row>

        <v-text-field
          v-if="hasOrcid"
          v-model="form.orcid"
          label="ORCID iD"
          readonly
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-orcid"
          hint="Verified by ORCID"
          persistent-hint
          :error-messages="errors.orcid"
          class="mb-2"
        />

        <div class="text-subtitle-2 mb-2 mt-2">Your account</div>
        <v-text-field
          v-model="form.email"
          label="Institutional email *"
          type="email"
          variant="outlined"
          density="comfortable"
          autocomplete="email"
          inputmode="email"
          autocapitalize="none"
          spellcheck="false"
          hint="For example name@your-institution.org. We send the confirmation link here."
          persistent-hint
          :rules="[requiredRule, emailRule, institutionalRule]"
          :error-messages="errors.email"
          validate-on="blur lazy"
          class="mb-2"
        />
        <v-text-field
          v-model="form.username"
          label="Username *"
          variant="outlined"
          density="comfortable"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          hint="Used to log in. Letters, digits and @ . + - _"
          persistent-hint
          :rules="[requiredRule, usernameRule]"
          :error-messages="errors.username"
          validate-on="blur lazy"
          class="mb-2"
        />
        <v-text-field
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          label="Password *"
          variant="outlined"
          density="comfortable"
          autocomplete="new-password"
          hint="At least 8 characters, not only digits, not a common password."
          persistent-hint
          :rules="[requiredRule, passwordLengthRule, passwordDigitsRule]"
          :error-messages="errors.password"
          validate-on="blur lazy"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showPassword = !showPassword"
        />
        <div v-if="form.password" class="mb-3 mt-1">
          <v-progress-linear
            :model-value="passwordScore * 20"
            :color="passwordStrength.color"
            height="6"
            rounded
          />
          <div class="text-caption" style="color: #666">Strength: {{ passwordStrength.label }}</div>
        </div>
        <v-text-field
          v-model="form.password2"
          :type="showPassword2 ? 'text' : 'password'"
          label="Confirm password *"
          variant="outlined"
          density="comfortable"
          autocomplete="new-password"
          :error="passwordError"
          :error-messages="passwordError ? ['Passwords do not match'] : errors.password2"
          :append-inner-icon="showPassword2 ? 'mdi-eye-off' : 'mdi-eye'"
          class="mb-1"
          @click:append-inner="showPassword2 = !showPassword2"
        />

        <p class="text-caption mb-3" style="color: #666">* Required field</p>

        <v-btn
          color="primary"
          size="large"
          style="width: 100%; border-radius: 12px"
          type="submit"
          :loading="submitting"
          :disabled="submitting"
        >
          Create account
        </v-btn>

        <p class="text-center text-body-2 mt-4 mb-0">
          Already have an account?
          <nuxt-link to="/account/login">Log in</nuxt-link>
        </p>
      </v-form>
    </v-card>
  </v-main>
</template>
