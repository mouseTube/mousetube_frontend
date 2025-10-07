<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import { useFileStore } from '~/stores/file';
import FileForm from '@/components/modals/CreateFileModal.vue';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';

const props = defineProps<{ recordingSessionId?: number | null }>();
const fileStore = useFileStore();
const apiBaseUrl = useApiBaseUrl();

const editingFile = ref<any>(null);
const showFileForm = ref(false);

// Tracker des intervalles pour polling
const pollingIntervals = new Map<number, NodeJS.Timeout>();

function editFile(file: any) {
  editingFile.value = { ...file };
  showFileForm.value = true;
}

function createNewFile() {
  editingFile.value = null;
  showFileForm.value = true;
}

function handleSaved() {
  // Déterminer la fonction de fetch
  const fetchFn =
    props.recordingSessionId != null
      ? () => fileStore.fetchFilesBySessionId(props.recordingSessionId!)
      : fileStore.fetchFiles;

  fetchFn().then(() => {
    // Lancer le polling sur tous les fichiers en cours
    fileStore.files.forEach((file) => {
      if (
        (file.status === 'pending' || file.status === 'processing') &&
        !pollingIntervals.has(file.id)
      ) {
        pollFileStatus(file.id);
      }
    });
  });

  showFileForm.value = false;
}

function pollFileStatus(fileId: number) {
  if (pollingIntervals.has(fileId)) return; // éviter doublons

  const interval = setInterval(async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/file/${fileId}/status/`);
      fileStore.updateFileStatus(fileId, { status: res.data.status });

      if (res.data.status === 'done' || res.data.status === 'error') {
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

const files = computed(() => fileStore.files);

function openFileLink(link: string) {
  window.open(link, '_blank');
}

// Watch pour recordingSessionId
watch(
  () => props.recordingSessionId,
  async (newId) => {
    if (newId) {
      await fileStore.fetchFilesBySessionId(newId);
    } else {
      fileStore.files.splice(0, fileStore.files.length);
    }

    // Lancer le polling sur les fichiers en cours
    fileStore.files.forEach((file) => {
      if (
        (file.status === 'pending' || file.status === 'processing') &&
        !pollingIntervals.has(file.id)
      ) {
        pollFileStatus(file.id);
      }
    });
  },
  { immediate: true }
);

// Initial fetch + polling
onMounted(async () => {
  if (props.recordingSessionId) {
    await fileStore.fetchFilesBySessionId(props.recordingSessionId);
  }

  fileStore.files.forEach((file) => {
    if (
      (file.status === 'pending' || file.status === 'processing') &&
      !pollingIntervals.has(file.id)
    ) {
      pollFileStatus(file.id);
    }
  });
});
</script>

<template>
  <v-container>
    <v-card class="pa-6" outlined>
      <v-card-title class="d-flex justify-space-between align-center">
        <h3 class="ma-0 pa-0">Files</h3>
        <div class="d-flex align-center">
          <v-btn color="primary" @click="createNewFile">
            <v-icon start>mdi-plus</v-icon>
            Add File
          </v-btn>
        </div>
      </v-card-title>

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

      <v-dialog v-model="showFileForm" max-width="600">
        <FileForm
          v-if="showFileForm"
          v-model="editingFile"
          :recordingSessionId="props.recordingSessionId"
          @saved="handleSaved"
        />
      </v-dialog>
    </v-card>
  </v-container>
</template>
