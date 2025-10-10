<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useFileStore } from '~/stores/file';
import FileForm from '@/components/modals/CreateFileModal.vue';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { useRecordingSessionStore } from '~/stores/recordingSession';

const recordingSessionStore = useRecordingSessionStore();

// === PROPS ===
const props = defineProps<{ selectedRecordingSessionId?: number | null }>();

// === STORES & STATE ===
const fileStore = useFileStore();
const apiBaseUrl = useApiBaseUrl();

const editingFile = ref<any>(null);
const showFileForm = ref(false);
const pollingIntervals = new Map<number, NodeJS.Timeout>();

// === PUBLISH STATE ===
const publishTaskId = ref<string | null>(null);
const isPublishing = ref(false);
const publishDone = ref(false);
const publishError = ref<string | null>(null);
const publishProgress = ref(0);
const sessionStatus = ref<string | null>(null);

// === SNACKBAR ===
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

// === FILES ===
const files = computed(() => fileStore.files);
const canPublish = computed(() => files.value.some((file) => file.status === 'done'));

// === FUNCTIONS ===

// ---- PUBLISH SESSION ----
async function publishSession() {
  if (!props.selectedRecordingSessionId) return;

  try {
    isPublishing.value = true;
    publishDone.value = false;
    publishError.value = null;
    publishProgress.value = 0;

    const res = await axios.post(`${apiBaseUrl}/file/publish_session/`, {
      recording_session_id: props.selectedRecordingSessionId,
    });

    publishTaskId.value = res.data.task_id;
    pollPublishTask();
  } catch (err) {
    console.error(err);
    publishError.value = 'Failed to start publishing.';
    isPublishing.value = false;
    showSnackbar('❌ Failed to start publishing.', 'error');
  }
}

// ---- POLL PUBLISH STATUS ----
function pollPublishTask() {
  if (!publishTaskId.value) return;

  const interval = setInterval(async () => {
    try {
      const res = await axios.get(
        `${apiBaseUrl}/recording-session/get_task_status?task_id=${publishTaskId.value}`
      );

      const state = res.data.state;
      publishProgress.value = res.data.progress ?? publishProgress.value;

      if (state === 'SUCCESS') {
        clearInterval(interval);
        publishProgress.value = 100;
        isPublishing.value = false;
        publishDone.value = true;
        await fileStore.fetchFilesBySessionId(props.selectedRecordingSessionId!);
        showSnackbar('✅ Session published successfully!', 'success');
      } else if (state === 'FAILURE') {
        clearInterval(interval);
        isPublishing.value = false;
        publishError.value = res.data.error || 'Publishing failed.';
        showSnackbar('❌ Publishing failed.', 'error');
      } else {
        if (publishProgress.value < 90) publishProgress.value += 5;
      }
    } catch (err) {
      console.error(err);
      clearInterval(interval);
      isPublishing.value = false;
      publishError.value = 'Error checking task status.';
      showSnackbar('⚠️ Error checking task status.', 'warning');
    }
  }, 3000);
}

// ---- FILES POLLING ----
function pollFileStatus(fileId: number) {
  if (pollingIntervals.has(fileId)) return;

  const interval = setInterval(async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/file/${fileId}/status/`);
      fileStore.updateFileStatus(fileId, { status: res.data.status });

      if (['done', 'error'].includes(res.data.status)) {
        clearInterval(interval);
        pollingIntervals.delete(fileId);
      }
    } catch (err) {
      console.error(err);
      clearInterval(interval);
      pollingIntervals.delete(fileId);
    }
  }, 2000);

  pollingIntervals.set(fileId, interval);
}

function startPollingForActiveFiles() {
  fileStore.files.forEach((file) => {
    if (['pending', 'processing'].includes(file.status) && !pollingIntervals.has(file.id)) {
      pollFileStatus(file.id);
    }
  });
}

function stopAllPolling() {
  pollingIntervals.forEach((interval) => clearInterval(interval));
  pollingIntervals.clear();
}

// ---- SAVE / REFRESH ----
async function handleSaved() {
  const fetchFn =
    props.selectedRecordingSessionId != null
      ? () => fileStore.fetchFilesBySessionId(props.selectedRecordingSessionId!)
      : fileStore.fetchFiles;

  await fetchFn();
  startPollingForActiveFiles();
  showFileForm.value = false;
}

// ---- SNACKBAR ----
function showSnackbar(message: string, color: string) {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

// ---- WATCH ----
watch(
  () => props.selectedRecordingSessionId,
  async (newId) => {
    stopAllPolling();
    if (newId) {
      await fileStore.fetchFilesBySessionId(newId);
    } else {
      fileStore.files.splice(0, fileStore.files.length);
    }
    startPollingForActiveFiles();
  },
  { immediate: true }
);

// ---- LIFECYCLE ----
onMounted(async () => {
  if (props.selectedRecordingSessionId) {
    // 1️⃣ Récupère la session depuis le store
    const session = await recordingSessionStore.getSessionById(props.selectedRecordingSessionId);
    sessionStatus.value = session?.status ?? null;

    // 2️⃣ Met à jour le statut du bouton
    publishDone.value = sessionStatus.value === 'published';

    // 3️⃣ Récupère les fichiers et démarre le polling
    await fileStore.fetchFilesBySessionId(props.selectedRecordingSessionId);
    startPollingForActiveFiles();
  }
});

onUnmounted(() => stopAllPolling());

// ---- UTILS ----
function editFile(file: any) {
  editingFile.value = { ...file };
  showFileForm.value = true;
}

function createNewFile() {
  editingFile.value = null;
  showFileForm.value = true;
}

function openFileLink(link: string) {
  window.open(link, '_blank');
}
</script>

<template>
  <v-container>
    <v-card class="pa-6" outlined>
      <!-- === HEADER === -->
      <v-card-title class="d-flex justify-space-between align-center">
        <h3 class="ma-0 pa-0">Files</h3>

        <div class="d-flex align-center" style="gap: 1.5rem">
          <!-- 🔹 Publish Button + Progress bar -->
          <div class="d-flex flex-row justify-end align-center">
            <v-btn
              :color="
                publishError ? 'red' : publishDone ? 'grey' : isPublishing ? 'warning' : 'success'
              "
              :disabled="!canPublish || isPublishing || publishDone"
              @click="publishSession"
              style="min-width: 140px"
            >
              <v-icon start>
                {{
                  publishError
                    ? 'mdi-alert-circle'
                    : isPublishing
                      ? 'mdi-progress-clock'
                      : publishDone
                        ? 'mdi-check'
                        : 'mdi-upload'
                }}
              </v-icon>
              <span v-if="publishError">Error</span>
              <span v-else-if="isPublishing">Publishing...</span>
              <span v-else-if="publishDone">Published</span>
              <span v-else>Publish</span>
            </v-btn>
          </div>

          <!-- 🔹 Add File -->
          <div class="d-flex align-center" style="height: 100%">
            <v-btn color="primary" @click="createNewFile" style="min-width: 120px">
              <v-icon start>mdi-plus</v-icon>
              Add File
            </v-btn>
          </div>
        </div>
      </v-card-title>

      <!-- === FILES TABLE === -->
      <v-table v-if="files.length > 0">
        <thead>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Format</th>
            <th>Size</th>
            <th>Actions</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in files" :key="file.id">
            <td>{{ file.name }}</td>
            <td>{{ file.date }}</td>
            <td>{{ file.format }}</td>
            <td>{{ file.size ? file.size.toLocaleString() : '-' }}</td>
            <td>
              <v-btn size="small" @click="editFile(file)" color="primary">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn size="small" @click="openFileLink(file.link)" color="secondary">
                <v-icon>mdi-link</v-icon>
              </v-btn>
            </td>
            <td>
              <v-chip v-if="file.status === 'pending'" color="grey" label small>Pending</v-chip>
              <v-chip v-else-if="file.status === 'processing'" color="blue" label small
                >Processing</v-chip
              >
              <v-chip v-else-if="file.status === 'done'" color="green" label small>Done</v-chip>
              <v-chip v-else-if="file.status === 'error'" color="red" label small>Error</v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>

      <p v-else>No files found for this session.</p>

      <!-- === FILE FORM MODAL === -->
      <v-dialog v-model="showFileForm" max-width="600">
        <FileForm
          v-if="showFileForm"
          v-model="editingFile"
          :recordingSessionId="props.selectedRecordingSessionId"
          @saved="handleSaved"
        />
      </v-dialog>

      <!-- === SNACKBAR === -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" top right>
        {{ snackbarMessage }}
      </v-snackbar>
    </v-card>
  </v-container>
</template>
