<template>
  <div class="zenodo-auth">
    <h2>Zenodo OAuth2 Test</h2>

    <div v-if="!code">
      <p>Click below to authenticate with Zenodo:</p>
      <button @click="redirectToZenodo">Authenticate</button>
    </div>

    <div v-else>
      <p>Authorization code received:</p>
      <pre>{{ code }}</pre>
      <button @click="sendCodeToBackend">Send code to backend</button>
    </div>

    <div v-if="backendResponse">
      <h3>Backend response:</h3>
      <pre>{{ backendResponse }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';

const code = ref<string | null>(null);
const backendResponse = ref<any>(null);

// Zenodo OAuth2 parameters
const clientId = 'TON_CLIENT_ID';
const redirectUri = 'http://localhost:3000/oauth/callback';
const scope = 'deposit:write';

// Redirect user to Zenodo authorization page
function redirectToZenodo() {
  const url = `https://zenodo.org/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}`;
  window.location.href = url;
}

// On mount, check if code is in URL
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const urlCode = params.get('code');
  if (urlCode) {
    code.value = urlCode;
  }
});

// Send the code to backend for token exchange
async function sendCodeToBackend() {
  if (!code.value) return;

  try {
    const resp = await axios.post('http://localhost:8000/zenodo/token-exchange/', {
      code: code.value,
    });
    backendResponse.value = resp.data;
  } catch (err) {
    backendResponse.value = err;
  }
}
</script>

<style scoped>
button {
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  cursor: pointer;
}
pre {
  background: #f0f0f0;
  padding: 1rem;
  overflow-x: auto;
}
</style>
