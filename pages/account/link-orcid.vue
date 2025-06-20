<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const auth = useAuth();
const route = useRoute();
const router = useRouter();
const apiBaseUrl = useApiBaseUrl();

const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const orcid = route.query.orcid;
const firstName = route.query.first_name;
const lastName = route.query.last_name;
const userId = route.query.user_id;

const confirmLink = async () => {
  loading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await axios.post(
      `${apiBaseUrl}/link-orcid/`,
      { orcid },
      { headers: { Authorization: `Bearer ${auth.token.value}` } }
    );

    successMessage.value = 'Your ORCID has been successfully linked to your account.';

    setTimeout(() => {
      router.push('/account/details');
    }, 1500);
  } catch (err) {
    errorMessage.value = 'An error occurred while linking your ORCID.';
  } finally {
    loading.value = false;
  }
};

const cancelLink = () => {
  router.push('/account/login');
};
</script>

<template>
  <v-main
    class="d-flex align-center justify-center"
    style="min-height: 100vh; background-color: white"
  >
    <v-card
      class="pa-6"
      style="
        max-width: 500px;
        border-radius: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        width: 100%;
      "
    >
      <v-card-title class="text-h6 font-weight-medium mb-4 d-flex align-center">
        <v-icon color="green darken-2" size="28" class="mr-2">mdi-orcid</v-icon>
        Link your ORCID account
      </v-card-title>

      <v-card-subtitle
        class="mb-6"
        style="white-space: normal; word-break: break-word; overflow-wrap: break-word"
      >
        <strong>{{ firstName }} {{ lastName }}</strong>
        <br />
        Would you like to link your ORCID to your mouseTube account?
        <br />
        <code
          class="d-inline-flex align-center"
          style="
            font-family: monospace;
            font-size: 1.1rem;
            background: #f0f9f0;
            border-radius: 8px;
            padding: 6px 12px;
            margin-top: 6px;
            max-width: 100%;
            white-space: normal;
            overflow-wrap: break-word;
            word-break: break-word;
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style="height: 20px; width: 20px; margin-right: 8px; fill: #4caf50"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 0C5.373 0 0 5.373 0 12a12 12 0 002.763 7.73l.011-.011 1.086-1.08a9.927 9.927 0 01-1.984-6.638c0-5.515 4.484-10 10-10s10 4.485 10 10-4.485 10-10 10c-2.248 0-4.318-.766-5.967-2.04l-1.137 1.13a11.97 11.97 0 007.104 2.22c6.627 0 12-5.373 12-12S18.627 0 12 0z"
            />
            <path
              d="M7.763 12a4.237 4.237 0 014.237-4.237A4.237 4.237 0 0116.237 12a4.237 4.237 0 01-4.237 4.237A4.237 4.237 0 017.763 12zm6.708 0a2.472 2.472 0 10-4.944 0 2.472 2.472 0 004.944 0z"
            />
          </svg>
          {{ orcid }}
        </code>
      </v-card-subtitle>

      <v-alert v-if="errorMessage" type="error" class="mb-4" dense outlined>
        {{ errorMessage }}
      </v-alert>
      <v-alert v-if="successMessage" type="success" class="mb-4" dense outlined>
        {{ successMessage }}
      </v-alert>

      <v-row justify="end" style="gap: 12px">
        <v-btn variant="text" color="grey" @click="cancelLink" :disabled="loading"> Cancel </v-btn>
        <v-btn color="success" @click="confirmLink" :loading="loading" class="ml-2" elevation="2">
          Link ORCID
        </v-btn>
      </v-row>
    </v-card>
  </v-main>
</template>
