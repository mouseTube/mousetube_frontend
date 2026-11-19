<script setup>
// The check of the download links of the files, and its follow-up: the check runs in the background
// on the server (one request a second, so it takes a while); this starts it and follows it.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import axios from 'axios';
import { token } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

const apiBaseUrl = useApiBaseUrl();
const url = `${apiBaseUrl}/admin/link-check/`;
const headers = () => ({ headers: { Authorization: `Bearer ${token.value}` } });

const report = ref(null);
const starting = ref(false);
const error = ref('');
let timer = null;

const check = computed(() => report.value?.check ?? null);
const running = computed(() => check.value?.state === 'running');
const percent = computed(() =>
  check.value?.total ? Math.round((check.value.done / check.value.total) * 100) : 0
);

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '');
// the time left, from the speed so far
const remaining = computed(() => {
  const c = check.value;
  if (!running.value || !c?.done || !c.started_at) return '';
  const elapsed = (Date.now() - new Date(c.started_at).getTime()) / 1000;
  const seconds = Math.round((elapsed / c.done) * (c.total - c.done));
  if (seconds < 90) return `${seconds} s left`;
  return `about ${Math.round(seconds / 60)} min left`;
});

async function load() {
  try {
    report.value = (await axios.get(url, headers())).data;
    error.value = '';
  } catch (e) {
    error.value =
      e.response?.status === 403
        ? 'Only administrators can see this.'
        : 'The state of the check could not be read.';
  }
  schedule();
}
function schedule() {
  clearTimeout(timer);
  // follows the check while it runs, and stops by itself when it is over
  if (running.value) timer = setTimeout(load, 2500);
}

async function start() {
  starting.value = true;
  error.value = '';
  try {
    report.value = (await axios.post(url, {}, headers())).data;
  } catch (e) {
    if (e.response?.status === 409) report.value = e.response.data;
    else error.value = e.response?.data?.detail || 'The check could not be started.';
  } finally {
    starting.value = false;
    schedule();
  }
}

onMounted(load);
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="my-3">
      {{ error }}
    </v-alert>

    <div v-if="report" class="d-flex flex-wrap align-center ga-3 my-4">
      <v-btn
        color="primary"
        prepend-icon="mdi-link-variant"
        :loading="starting"
        :disabled="running"
        @click="start"
      >
        {{ running ? 'Checking…' : 'Check the links now' }}
      </v-btn>
      <span class="text-body-2 text-medium-emphasis">
        {{ report.valid }} of {{ report.files_with_link }} links are valid
      </span>
    </div>

    <template v-if="check">
      <div v-if="running" class="my-4" aria-live="polite">
        <v-progress-linear :model-value="percent" height="10" rounded color="primary" />
        <div class="text-body-2 mt-1">
          {{ check.done }} / {{ check.total }} files · {{ remaining }}
        </div>
      </div>
      <div class="d-flex flex-wrap ga-2 mb-2">
        <v-chip size="small" color="green" variant="tonal">{{ check.ok }} answer</v-chip>
        <v-chip size="small" color="red" variant="tonal">{{ check.broken }} do not</v-chip>
        <v-chip size="small" variant="tonal" title="Local or private addresses are not followed">
          {{ check.skipped }} not checked
        </v-chip>
        <v-chip size="small" variant="tonal" title="The server asked to slow down">
          {{ check.unknown }} busy
        </v-chip>
      </div>
      <p v-if="check.state === 'done'" class="text-caption text-medium-emphasis">
        Last check finished on {{ when(check.finished_at) }}.
      </p>
      <v-alert v-if="check.state === 'failed'" type="error" variant="tonal" density="compact">
        The last check stopped: {{ check.error || 'unknown error' }}.
      </v-alert>
    </template>

    <template v-if="report && report.broken.length">
      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-2">Links that do not answer</h3>
      <v-table density="compact">
        <thead>
          <tr>
            <th>File</th>
            <th>Session</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in report.broken" :key="file.id">
            <td>{{ file.name }}</td>
            <td>{{ file.session }}</td>
            <td class="link-cell">
              <a :href="file.link" target="_blank" rel="noopener" :title="file.link">{{
                file.link
              }}</a>
            </td>
          </tr>
        </tbody>
      </v-table>
      <p v-if="report.broken_count > report.broken.length" class="text-caption mt-2">
        The first {{ report.broken.length }} of {{ report.broken_count }}.
      </p>
    </template>
    <p v-else-if="report && check && !running" class="text-body-2 mt-4">
      Every link that was checked answers.
    </p>
  </div>
</template>

<style scoped>
.link-cell {
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
