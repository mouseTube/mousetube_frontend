<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useFileStore } from '~/stores/file';
import FileForm from '@/components/modals/CreateFileModal.vue';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { type RecordingSession, useRecordingSessionStore } from '~/stores/recordingSession';
import { useRepositoryStore } from '~/stores/repository';
import RepositoryPublishModal from '@/components/modals/RepositoryPublishModal.vue';
import { useAuth } from '~/composables/useAuth';

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
// what an administrator still has to validate before the session can be shared
const pendingEntries = ref<{ kind: string; id: number; name: string; status: string }[]>([]);
const sharing = ref(false);

// === SNACKBAR ===
const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

// === FILES ===
const files = computed(() => fileStore.files);
const canPublish = computed(() => files.value.some((file) => file.status === 'done'));
const currentPageNumber = ref(1);
const showPublishModal = ref(false);
const session = ref<RecordingSession | null>(null);

const { token } = useAuth();

// === FUNCTIONS ===

function getAuthHeaders() {
  return token.value ? { headers: { Authorization: `Bearer ${token.value}` } } : {};
}

// ---- SHARE THE SESSION (visible to everybody once what it uses is validated) ----
async function loadSessionState() {
  const id = props.selectedRecordingSessionId;
  if (!id) return;
  const res = await axios.get(`${apiBaseUrl}/recording-session/${id}/`, getAuthHeaders());
  sessionStatus.value = res.data.status ?? null;
  pendingEntries.value = res.data.pending_entries ?? [];
  publishDone.value = sessionStatus.value === 'published';
}

async function changeSharing(status: 'shared' | 'draft') {
  const id = props.selectedRecordingSessionId;
  if (!id) return;
  sharing.value = true;
  try {
    const res = await axios.patch(
      `${apiBaseUrl}/recording-session/${id}/`,
      { status },
      getAuthHeaders()
    );
    sessionStatus.value = res.data.status;
    pendingEntries.value = res.data.pending_entries ?? [];
    if (res.data.status === 'shared') {
      showSnackbar('✅ Your session is shared: everybody can see it.', 'success');
    } else if (res.data.status === 'waiting validation') {
      showSnackbar(
        'Your session uses new entries: an administrator will review them, then it is shared.',
        'info'
      );
    } else {
      showSnackbar('Your session is a draft again.', 'info');
    }
  } catch (err: any) {
    const data = err?.response?.data;
    showSnackbar(
      (typeof data === 'object' && (data.detail || data.status?.[0])) ||
        'The change could not be saved.',
      'error'
    );
  } finally {
    sharing.value = false;
  }
}

// ---- PUBLISH SESSION (deposit in a repository, with a DOI) ----
async function publishSession(payload: any = null) {
  if (!props.selectedRecordingSessionId) return;

  try {
    isPublishing.value = true;
    publishDone.value = false;
    publishError.value = null;
    publishProgress.value = 0;

    const data: any = {
      recording_session_id: props.selectedRecordingSessionId,
      repository_id: repositoryStore.selectedRepository?.id ?? null,
    };

    if (payload) {
      data.payload = payload;
    }

    const res = await axios.post(`${apiBaseUrl}/file/publish_session/`, data, getAuthHeaders());

    publishTaskId.value = res.data.task_id;
    pollPublishTask();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    publishError.value = 'Failed to start the deposit.';
    isPublishing.value = false;
    showSnackbar('❌ Failed to start the deposit.', 'error');
  }
}

// ---- POLL PUBLISH STATUS ----
async function pollPublishTask() {
  if (!publishTaskId.value) return;

  const interval = setInterval(async () => {
    try {
      const res = await axios.get(
        `${apiBaseUrl}/recording-session/get_task_status?task_id=${publishTaskId.value}`,
        getAuthHeaders()
      );

      const state = res.data.state;
      publishProgress.value = res.data.progress ?? publishProgress.value;

      if (state === 'SUCCESS') {
        clearInterval(interval);
        publishProgress.value = 100;
        isPublishing.value = false;
        publishDone.value = true;

        await fileStore.fetchFilesBySessionId(props.selectedRecordingSessionId!);

        await loadSessionState();

        showSnackbar('✅ Session published in the repository.', 'success');
      } else if (state === 'FAILURE') {
        clearInterval(interval);
        isPublishing.value = false;
        publishError.value = res.data.error || 'Sharing failed.';
        showSnackbar('❌ Sharing failed.', 'error');
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
      const res = await axios.get(`${apiBaseUrl}/file/${fileId}/status/`, getAuthHeaders());
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
      await loadSessionState().catch(() => null);
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

watch(
  () => props.selectedRecordingSessionId,
  async (id) => {
    if (!id) {
      session.value = null;
      return;
    }
    session.value = await recordingSessionStore.getSessionById(id);
  },
  { immediate: true }
);

// ---- LIFECYCLE ----
onMounted(async () => {
  // Load repositories in background (non-blocking)
  if (!repositoryStore.repositories.length) {
    repositoryStore
      .fetchRepositories()
      .then(() => {
        if (!repositoryStore.selectedRepository) {
          const defaultRepo = repositoryStore.repositories.find((r) => r.id === 1);
          if (defaultRepo) {
            repositoryStore.selectRepository(defaultRepo);
          }
        }
      })
      .catch(() => {
        showSnackbar('⚠️ Could not load repositories.', 'warning');
      });
  } else if (!repositoryStore.selectedRepository) {
    const defaultRepo = repositoryStore.repositories.find((r) => r.id === 1);
    if (defaultRepo) {
      repositoryStore.selectRepository(defaultRepo);
    }
  }

  // Load files only if session is selected
  if (props.selectedRecordingSessionId) {
    await loadSessionState().catch(() => null);
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
function fetchPage(page: number) {
  if (!props.selectedRecordingSessionId) return;
  currentPageNumber.value = page;
  fileStore.fetchFilesBySessionId(props.selectedRecordingSessionId, page);
}

const PAGE_SIZE = 10;

const totalPagesNumber = computed(() => {
  if (!fileStore.count) return 1;
  return Math.ceil(fileStore.count / PAGE_SIZE);
});
// === DIALOG STATE ===
const showDeleteDialog = ref(false);
const fileToDelete = ref<number | null>(null);

function confirmDelete(fileId: number) {
  fileToDelete.value = fileId;
  showDeleteDialog.value = true;
}

async function deleteFile() {
  if (fileToDelete.value === null) return;

  try {
    await fileStore.deleteFile(fileToDelete.value);

    // Handle empty page after deletion
    if (fileStore.files.length === 0 && currentPageNumber.value > 1) {
      currentPageNumber.value--;
      await fileStore.fetchFilesBySessionId(
        props.selectedRecordingSessionId!,
        currentPageNumber.value
      );
    }

    showDeleteDialog.value = false;
    fileToDelete.value = null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error deleting file:', err);
    showSnackbar('❌ Failed to delete file.', 'error');
  }
}
</script>

<template>
  <v-container>
    <v-card class="pa-6" outlined>
      <!-- === HEADER === -->
      <v-card-title class="d-flex flex-column">
        <!-- 🔹 Repository info box -->
        <div class="d-flex justify-end w-100 mb-4">
          <v-sheet
            color="grey-lighten-4"
            rounded="lg"
            class="pa-4"
            elevation="0"
            style="border: 1px solid #ddd"
          >
            <!-- ✅ Title row: title + button -->
            <div class="d-flex justify-space-between align-center flex-wrap mb-3" style="gap: 1rem">
              <div class="text-subtitle-1 font-weight-medium">Repository selection</div>

              <v-menu>
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    variant="outlined"
                    color="primary"
                    class="text-none"
                    style="min-width: 160px; justify-content: space-between"
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

            <!-- ✅ Explanatory text below -->
            <div
              class="text-body-2"
              style="color: gray; line-height: 1.5; white-space: normal; word-wrap: break-word"
            >
              Files added will be automatically uploaded to the selected repository (e.g. Zenodo),
              and a DOI will be generated automatically. If you provide a DOI and a download link
              directly, this automatic deposit process will not apply.
            </div>
          </v-sheet>
        </div>

        <!-- 🔹 Sharing of the session -->
        <v-sheet class="share-panel w-100 mb-4" rounded="lg">
          <div class="d-flex flex-wrap align-center justify-space-between ga-3">
            <div>
              <div class="d-flex align-center ga-2">
                <strong>Visibility</strong>
                <v-chip
                  size="small"
                  label
                  variant="tonal"
                  :color="
                    sessionStatus === 'shared' || sessionStatus === 'published'
                      ? 'success'
                      : sessionStatus === 'waiting validation'
                        ? 'warning'
                        : 'grey'
                  "
                >
                  {{
                    sessionStatus === 'waiting validation'
                      ? 'Waiting for validation'
                      : sessionStatus === 'shared'
                        ? 'Shared'
                        : sessionStatus === 'published'
                          ? 'Published'
                          : 'Draft'
                  }}
                </v-chip>
              </div>
              <p class="text-body-2 text-medium-emphasis mb-0 mt-1">
                <template v-if="sessionStatus === 'published'">
                  This session is public and deposited in a repository.
                </template>
                <template v-else-if="sessionStatus === 'shared'">
                  This session is public. Publish it in a repository to get a DOI.
                </template>
                <template v-else-if="sessionStatus === 'waiting validation'">
                  An administrator reviews what is new in it, then it is shared. You cannot edit it
                  meanwhile; withdraw it to make changes.
                </template>
                <template v-else>
                  Only you can see this session. Share it to make it, and its files, public.
                </template>
              </p>
            </div>
            <div class="d-flex ga-2">
              <v-btn
                v-if="sessionStatus === 'draft'"
                color="primary"
                prepend-icon="mdi-share-variant-outline"
                :loading="sharing"
                :disabled="files.length === 0"
                @click="changeSharing('shared')"
              >
                Share this session
              </v-btn>
              <v-btn
                v-else-if="sessionStatus === 'waiting validation'"
                variant="outlined"
                :loading="sharing"
                @click="changeSharing('draft')"
              >
                Withdraw
              </v-btn>
            </div>
          </div>
          <ul
            v-if="sessionStatus === 'waiting validation' && pendingEntries.length"
            class="share-pending text-body-2 mt-3"
          >
            <li v-for="entry in pendingEntries" :key="entry.kind + entry.id">
              <span class="text-medium-emphasis">{{ entry.kind }}</span> {{ entry.name }}
              <v-chip size="x-small" variant="tonal" label>{{ entry.status }}</v-chip>
            </li>
          </ul>
        </v-sheet>

        <!-- 🔹 Title + Buttons -->
        <div class="d-flex justify-space-between align-center w-100">
          <h3 class="ma-0 pa-0">Files</h3>

          <div class="d-flex align-center" style="gap: 1.5rem">
            <!-- 🔹 Share Button -->
            <div class="d-flex flex-row justify-end align-center">
              <v-btn
                :color="
                  publishError ? 'red' : publishDone ? 'teal' : isPublishing ? 'warning' : 'success'
                "
                :disabled="!canPublish || isPublishing || publishDone || sessionStatus !== 'shared'"
                @click="showPublishModal = true"
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
                <span v-else>Publish in a repository</span>
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
                    :disabled="file.status !== 'done' || publishDone"
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
                    :disabled="file.status !== 'done' || !publishDone"
                    @click="openFileLink(file.link)"
                  >
                    <v-icon>mdi-download</v-icon>
                  </v-btn>
                </template>
                <span>Download</span>
              </v-tooltip>
              <!-- Delete (only error) -->
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="small"
                    color="primary"
                    variant="text"
                    :disabled="publishDone"
                    @click="confirmDelete(file.id)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
                <span>Delete file</span>
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
                ✅ Ready (unshared)
              </v-chip>

              <v-chip v-else-if="file.status === 'done' && publishDone" color="teal" label small>
                <a
                  :href="file.external_url || undefined"
                  target="_blank"
                  rel="noopener"
                  class="ml-1 hover:opacity-80"
                  style="text-decoration: none; color: inherit"
                >
                  🌍 Shared
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

      <v-pagination
        v-model="currentPageNumber"
        :length="totalPagesNumber"
        :total-visible="7"
        color="primary"
        prev-icon="mdi-chevron-left"
        next-icon="mdi-chevron-right"
        @update:model-value="fetchPage"
      />

      <!-- === FILE FORM MODAL === -->
      <v-dialog v-model="showFileForm" max-width="600">
        <FileForm
          v-if="showFileForm"
          v-model="editingFile"
          :recording-session-id="props.selectedRecordingSessionId"
          :repository="repositoryStore.selectedRepository"
          @saved="handleSaved"
        />
      </v-dialog>

      <!-- DIALOG DELETE-->
      <v-dialog v-model="showDeleteDialog" max-width="400">
        <v-card>
          <v-card-title class="text-h6">Confirm deletion</v-card-title>
          <v-card-text>Are you sure you want to delete this file?</v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
            <v-btn color="red" text @click="deleteFile">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- === SNACKBAR === -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" location="top" right>
        {{ snackbarMessage }}
      </v-snackbar>
      <RepositoryPublishModal
        v-if="
          props.selectedRecordingSessionId != null && repositoryStore.selectedRepository != null
        "
        :recording-session-id="props.selectedRecordingSessionId"
        :recording-session-name="session?.name || ''"
        :repository="{
          id: repositoryStore.selectedRepository.id,
          name: repositoryStore.selectedRepository.name,
          logo_url: repositoryStore.selectedRepository.logo_url ?? undefined,
        }"
        :show="showPublishModal"
        @close="showPublishModal = false"
        @publish-confirmed="
          (payload: any) => {
            showPublishModal = false;
            publishSession(payload);
          }
        "
      />
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

.share-panel {
  padding: 16px;
  background: #f6f6f6;
  border: 1px solid #e4e4e4;
}
.share-pending {
  margin: 12px 0 0;
  padding-left: 18px;
}
</style>
