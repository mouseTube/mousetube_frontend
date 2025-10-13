<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useFileStore } from '~/stores/file';
import FileForm from '@/components/modals/CreateFileModal.vue';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { useRecordingSessionStore } from '~/stores/recordingSession';
import { useRepositoryStore } from '~/stores/repository';

const repositoryStore = useRepositoryStore();
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
      repository_id: repositoryStore.selectedRepository?.id ?? null,
    });

    publishTaskId.value = res.data.task_id;
    pollPublishTask();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    publishError.value = 'Failed to start publishing.';
    isPublishing.value = false;
    showSnackbar('❌ Failed to start publishing.', 'error');
  }
}

// ---- POLL PUBLISH STATUS ----
async function pollPublishTask() {
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

        await recordingSessionStore.updateSessionStatus(
          props.selectedRecordingSessionId!,
          'published'
        );
        const updatedSession = await recordingSessionStore.getSessionById(
          props.selectedRecordingSessionId!
        );
        sessionStatus.value = updatedSession?.status ?? null;
        publishDone.value = sessionStatus.value === 'published';

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
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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
      const session = await recordingSessionStore.getSessionById(newId);
      sessionStatus.value = session?.status ?? null;
      publishDone.value = sessionStatus.value === 'published';
      await fileStore.fetchFilesBySessionId(newId);
    } else {
      fileStore.files.splice(0, fileStore.files.length);
      sessionStatus.value = null;
      publishDone.value = false;
    }

    startPollingForActiveFiles();
  },
  { immediate: true }
);

// ---- LIFECYCLE ----
onMounted(async () => {
  if (!repositoryStore.repositories.length) {
    await repositoryStore.fetchRepositories();
  }

  // ✅ Pré-sélectionner le repository id=1 si aucun n’est choisi
  const defaultRepo = repositoryStore.repositories.find((r) => r.id === 1);
  if (!repositoryStore.selectedRepository && defaultRepo) {
    repositoryStore.selectRepository(defaultRepo);
  }
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

function openExternalUrl(url?: string | null) {
  if (url) window.open(url, '_blank');
}
</script>

<template>
  <v-container>
    <v-card class="pa-6" outlined>
      <!-- === HEADER === -->
      <v-card-title class="d-flex justify-space-between align-center">
        <h3 class="ma-0 pa-0">Files</h3>

        <div class="d-flex align-center" style="gap: 1.5rem">
          <!-- 🔹 Repository Dropdown -->
          <div class="d-flex align-center" style="gap: 1.5rem">
            <!-- 🔹 Repository Dropdown (styled as button) -->
            <v-menu>
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  variant="outlined"
                  color="primary"
                  class="text-none"
                  style="min-width: 140px; justify-content: space-between"
                  :disabled="files.length > 0"
                >
                  <div class="d-flex align-center" style="gap: 0.5rem">
                    <img
                      v-if="repositoryStore.selectedRepository?.logo_url"
                      :src="repositoryStore.selectedRepository.logo_url"
                      alt="logo"
                      class="repo-logo"
                    />
                    <span>
                      {{ repositoryStore.selectedRepository?.name || 'Select Repository' }}
                    </span>
                  </div>
                  <v-icon icon="mdi-chevron-down" />
                </v-btn>
              </template>

              <v-list>
                <v-list-item
                  v-for="repo in repositoryStore.repositories"
                  :key="repo.id"
                  @click="repositoryStore.selectRepository(repo)"
                  :active="repo.id === repositoryStore.selectedRepository?.id"
                  style="cursor: pointer"
                >
                  <template #prepend>
                    <img v-if="repo.logo_url" :src="repo.logo_url" alt="logo" class="repo-logo" />
                  </template>
                  <v-list-item-title>{{ repo.name }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>

          <!-- 🔹 Publish Button + Progress bar -->
          <div class="d-flex flex-row justify-end align-center">
            <v-btn
              :color="
                publishError ? 'red' : publishDone ? 'teal' : isPublishing ? 'warning' : 'success'
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
            <v-btn
              color="primary"
              @click="createNewFile"
              style="min-width: 120px"
              :disabled="isPublishing || publishDone"
            >
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
            <td class="d-inline-flex align-center gap-1">
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="small"
                    color="primary"
                    variant="text"
                    @click.stop="editFile(file)"
                  >
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                </template>
                <span>Edit file</span>
              </v-tooltip>
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="small"
                    color="primary"
                    variant="text"
                    @click="openFileLink(file.link)"
                  >
                    <v-icon>mdi-download</v-icon>
                  </v-btn>
                </template>
                <span>Download</span>
              </v-tooltip>
            </td>

            <td>
              <v-chip v-if="file.status === 'pending'" color="grey" label small>
                ⏳ Pending
              </v-chip>

              <v-chip v-else-if="file.status === 'processing'" color="blue" label small>
                🔄 Processing
              </v-chip>

              <v-chip v-else-if="file.status === 'done' && !publishDone" color="green" label small>
                ✅ Ready (unpublished)
              </v-chip>

              <v-chip v-else-if="file.status === 'done' && publishDone" color="teal" label small>
                <a
                  :href="file.external_url || undefined"
                  target="_blank"
                  rel="noopener"
                  class="ml-1 hover:opacity-80"
                  style="text-decoration: none; color: inherit"
                >
                  🌍 Published
                </a>
                <v-icon
                  v-if="file.external_url"
                  size="16"
                  class="ml-1 cursor-pointer"
                  @click.stop="openExternalUrl(file.external_url)"
                >
                  mdi-open-in-new
                </v-icon>
              </v-chip>

              <v-chip v-else-if="file.status === 'error'" color="red" label small>
                ❌ Error
              </v-chip>
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
          :repository="repositoryStore.selectedRepository"
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

<style>
.repo-logo {
  height: 22px;
  width: auto;
  object-fit: contain;
  margin-right: 0.75rem;
  display: inline-block;
  vertical-align: middle;
}
</style>
