<script setup lang="ts">
// Figures about the account: since when, last sign-in, and the downloads of the files the user added.
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

type Stats = {
  date_joined: string;
  last_login: string | null;
  files: number;
  downloads: number;
};

const { token } = useAuth();
const apiBaseUrl = useApiBaseUrl();
const stats = ref<Stats | null>(null);

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

onMounted(async () => {
  try {
    const res = await axios.get(`${apiBaseUrl}/my-stats/`, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    stats.value = res.data;
  } catch {
    stats.value = null; // the figures are a bonus: nothing to show without them
  }
});
</script>

<template>
  <div v-if="stats">
    <h2 class="section-title">Activity</h2>
    <dl class="facts mb-6">
      <div class="fact">
        <dt>Member since</dt>
        <dd>{{ day(stats.date_joined) }}</dd>
      </div>
      <div class="fact">
        <dt>Last sign-in</dt>
        <dd>{{ day(stats.last_login) }}</dd>
      </div>
      <div class="fact">
        <dt>Files you added</dt>
        <dd>{{ stats.files }}</dd>
      </div>
      <div class="fact">
        <dt>Downloads of your files</dt>
        <dd>{{ stats.downloads }}</dd>
      </div>
    </dl>
  </div>
</template>
