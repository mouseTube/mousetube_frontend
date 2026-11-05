<script setup>
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const username = ref('');
const password = ref('');
const router = useRouter();
const auth = useAuth();
const showPassword = ref(false);
const loginErrorMessage = ref('');
const showInactiveHint = ref(false);
// Set by the API when the password is right but the account is not active yet:
// 'awaiting_review' | 'awaiting_email_confirmation' | ''
const accountStatus = ref('');
const resendEmail = ref('');
const resendMessage = ref('');
const resending = ref(false);
const submitting = ref(false);
const loginForm = ref(null);
const formValid = ref(true);
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

// The API gives the same answer for a wrong password and an inactive account, on purpose:
// otherwise anyone could find out which usernames exist.
const explain = (message) => {
  if (/no active account/i.test(message)) {
    showInactiveHint.value = true;
    return 'Incorrect username or password, or your account is not active yet.';
  }
  if (/throttled/i.test(message)) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  return message;
};

const handleLogin = async () => {
  loginErrorMessage.value = ''; // reset
  showInactiveHint.value = false;
  accountStatus.value = '';
  resendMessage.value = '';

  const validationResult = await loginForm.value?.validate();
  if (!validationResult?.valid) return;

  submitting.value = true;
  try {
    const success = await auth.login(username.value, password.value);
    if (success) {
      router.push('/account/details');
    } else {
      loginErrorMessage.value = explain('No active account');
    }
  } catch (error) {
    if (error?.accountStatus) {
      accountStatus.value = error.accountStatus;
      return;
    }
    const response = error?.response;
    const data = response?.data || error?.data;

    if (data?.detail) {
      loginErrorMessage.value = explain(data.detail);
    } else if (data?.non_field_errors?.length) {
      loginErrorMessage.value = explain(data.non_field_errors[0]);
    } else if (typeof data === 'string') {
      loginErrorMessage.value = explain(data);
    } else if (error?.message) {
      loginErrorMessage.value = explain(error.message);
    } else {
      loginErrorMessage.value = 'An unexpected error occurred. Please try again.';
    }
  } finally {
    submitting.value = false;
  }
};
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
    resendMessage.value = 'A new link is on its way. It can take a few minutes to arrive.';
  } catch (error) {
    resendMessage.value =
      error?.response?.status === 429
        ? 'Too many attempts. Please wait a minute.'
        : 'The email could not be sent. Please try again later.';
  } finally {
    resending.value = false;
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
    class="d-flex flex-column align-center"
    style="min-height: 100vh; background-color: white"
  >
    <div class="d-flex flex-column align-center my-auto py-8 px-3" style="width: 100%">
      <!-- Logo -->
      <img
        src="/logo_mousetube_big.png"
        alt="mouseTube Logo"
        style="width: 300px; max-width: 80%; margin-bottom: 12px"
      />

      <!-- Title -->
      <h1 class="text-h5 font-weight-medium mb-1">Welcome back to mouseTube</h1>
      <p class="text-body-2 mb-6" style="color: #666">Log in to continue.</p>

      <!-- Card -->
      <v-card
        class="pa-6"
        style="border-radius: 20px; max-width: 480px; width: 100%; box-shadow: 0 4px 16px #00000015"
      >
        <v-form ref="loginForm" v-model="formValid" novalidate @submit.prevent="handleLogin">
          <div aria-live="polite">
            <v-alert
              v-if="accountStatus === 'awaiting_review'"
              type="info"
              variant="tonal"
              class="mb-4"
              title="Your request is waiting for administrator review"
            >
              Your email address is confirmed. An administrator will review your request. You
              receive an email as soon as your account is active. Nothing else to do for now.
            </v-alert>
            <v-alert
              v-else-if="accountStatus === 'awaiting_email_confirmation'"
              type="warning"
              variant="tonal"
              class="mb-4"
              title="Please confirm your email address"
            >
              <p class="mb-3">
                Your request is saved, but your email address is not confirmed yet. Open the link in
                the email we sent you (check your spam folder too). Lost it? We send you a new one.
              </p>
              <v-text-field
                v-model="resendEmail"
                label="Institutional email"
                type="email"
                variant="outlined"
                density="compact"
                autocomplete="email"
                autocapitalize="none"
                spellcheck="false"
                hide-details
                class="mb-2"
                @keyup.enter="resend"
              />
              <v-btn size="small" color="primary" :loading="resending" @click="resend">
                Send a new link
              </v-btn>
              <div v-if="resendMessage" class="text-body-2 mt-2" role="status">
                {{ resendMessage }}
              </div>
            </v-alert>
            <v-alert v-if="loginErrorMessage" type="error" variant="tonal" class="mb-4">
              {{ loginErrorMessage }}
              <div v-if="showInactiveHint" class="text-body-2 mt-2">
                Just registered? An account becomes active once you have confirmed your email
                address
                <em>and</em> an administrator has approved your request. You receive an email at
                each step.
              </div>
            </v-alert>
          </div>

          <v-text-field
            v-model="username"
            :rules="[(v) => !!v || 'Username is required']"
            label="Username"
            variant="outlined"
            density="comfortable"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            class="mb-2"
            required
          />
          <v-text-field
            v-model="password"
            :rules="[(v) => !!v || 'Password is required']"
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            variant="outlined"
            density="comfortable"
            autocomplete="current-password"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            class="mb-1"
            required
            @click:append-inner="showPassword = !showPassword"
          />
          <p class="text-body-2 text-end mb-4">
            <nuxt-link class="text-primary" to="/account/forgot-password"
              >Forgot your password?</nuxt-link
            >
          </p>

          <v-btn
            color="primary"
            style="width: 100%; border-radius: 12px"
            type="submit"
            size="large"
            :loading="submitting"
            :disabled="submitting"
          >
            Log in
          </v-btn>

          <v-divider class="my-5" />

          <p class="text-center text-body-2 mb-3" style="color: #666">Or continue with ORCID</p>
          <v-btn
            variant="outlined"
            color="success"
            style="width: 100%; border-radius: 12px"
            size="large"
            @click="redirectToOrcid"
          >
            <v-icon start>mdi-orcid</v-icon>
            Log in with ORCID
          </v-btn>
          <p class="text-caption text-center mt-2 mb-0" style="color: #666">
            If no account is linked to your ORCID iD yet, we take you to the registration form.
          </p>

          <v-divider class="my-5" />

          <p class="text-center text-body-2 mb-0">
            New to mouseTube?
            <nuxt-link class="text-primary" to="/account/register">Create an account</nuxt-link>
            <br />
            <span class="text-caption" style="color: #666">
              An institutional email address is required.
            </span>
          </p>
        </v-form>
      </v-card>
    </div>
  </v-main>
</template>
