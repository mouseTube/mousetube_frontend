<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

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
    const response = await axios.post(`${apiBaseUrl}/link-orcid/`, {
      orcid: orcid,
      user_id: userId,
    });

    successMessage.value = 'Your ORCID has been successfully linked to your account.';
    // Redirection après succès
    setTimeout(() => {
      router.push('/account/login');
    }, 2000);
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
    <v-card class="pa-6" style="max-width: 500px; border-radius: 20px">
      <v-card-title class="text-h6 font-weight-medium mb-2">Link your ORCID account</v-card-title>
      <v-card-subtitle class="mb-4">
        We found an existing account with the same name:
        <br />
        <strong>{{ firstName }} {{ lastName }}</strong>
        <br />
        Do you want to link your ORCID to it?
        <br />
        <code>{{ orcid }}</code>
      </v-card-subtitle>

      <v-alert v-if="errorMessage" type="error" class="mb-4">{{ errorMessage }}</v-alert>
      <v-alert v-if="successMessage" type="success" class="mb-4">{{ successMessage }}</v-alert>

      <v-row justify="end">
        <v-btn variant="text" color="grey" @click="cancelLink" :disabled="loading"> Cancel </v-btn>
        <v-btn color="primary" @click="confirmLink" :loading="loading" class="ml-2">
          Link ORCID
        </v-btn>
      </v-row>
    </v-card>
  </v-main>
</template>
