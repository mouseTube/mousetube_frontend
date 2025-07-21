<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useFileStore } from '~/stores/file';
import FileForm from '@/components/modals/CreateFileModal.vue';

const props = defineProps<{
  recordingSessionId?: number | null;
}>();

const fileStore = useFileStore();

const editingFile = ref<any>(null);
const showFileForm = ref(false);

watch(
  () => props.recordingSessionId,
  async (newId) => {
    if (newId) {
      await fileStore.fetchFilesBySessionId(newId);
    } else {
      // Vide le tableau en conservant la réactivité
      fileStore.files.splice(0, fileStore.files.length);
    }
  },
  { immediate: true }
);

onMounted(async () => {
  if (props.recordingSessionId) {
    await fileStore.fetchFilesBySessionId(props.recordingSessionId);
  }
});

// Ouvrir le formulaire en édition
function editFile(file: any) {
  editingFile.value = { ...file };
  showFileForm.value = true;
}

// Créer un nouveau fichier
function createNewFile() {
  editingFile.value = null;
  showFileForm.value = true;
}

// Rafraîchir la liste après save
function handleSaved() {
  if (props.recordingSessionId) {
    fileStore.fetchFilesBySessionId(props.recordingSessionId);
  } else {
    fileStore.fetchFiles();
  }
  showFileForm.value = false;
}

const files = computed(() => fileStore.files);

function openFileLink(link: string) {
  window.open(link, '_blank');
}
</script>

<template>
  <v-container>
    <v-card class="pa-6" outlined>
      <v-card-title class="d-flex justify-space-between align-center">
        <h3 class="ma-0 pa-0">Files</h3>
        <div>
          <v-btn color="primary" @click="createNewFile">
            <v-icon start>mdi-plus</v-icon>
            Add File
          </v-btn>
        </div>
      </v-card-title>

      <!-- Liste des fichiers existants -->
      <v-table v-if="files.length > 0">
        <thead>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Format</th>
            <th>Size</th>
            <th>Actions</th>
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
          </tr>
        </tbody>
      </v-table>

      <p v-else>No files found for this session.</p>

      <!-- Drawer ou modal pour formulaire -->
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
