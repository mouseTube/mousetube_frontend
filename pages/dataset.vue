<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import debounce from 'lodash/debounce.js';
import { Database } from 'lucide-vue-next';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';

interface FileType {
  id: number;
  name: string;
  doi?: string | null;
  link?: string | null;
  spectrogram_url?: string | null;
  plot_url?: string | null;
}

interface DatasetType {
  id: number;
  name: string;
  doi?: string | null;
  link?: string | null;
  description?: string;
  created_at: string;
  files: FileType[];
}

const dataLoaded = ref(false);
const search = ref('');
const datasetList = ref<DatasetType[]>([]);
const next = ref<string | null>(null);
const previous = ref<string | null>(null);
const count = ref(0);
const perPage = ref(10);

const apiBaseUrl = useApiBaseUrl();

// --- helpers for file types / icons / ordering ---
function fileExt(name?: string) {
  if (!name) return '';
  const m = name.split('.').pop();
  return (m || '').toLowerCase();
}
function isAudio(ext: string) {
  return ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac'].includes(ext);
}
function isImage(ext: string) {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
}
function isPdf(ext: string) {
  return ext === 'pdf';
}
function isArchive(ext: string) {
  return ['zip', 'rar', 'tar', 'gz', 'tgz', '7z'].includes(ext);
}
function fileIcon(name?: string) {
  const ext = fileExt(name);
  if (isAudio(ext)) return 'mdi-music';
  if (isImage(ext)) return 'mdi-image';
  if (isPdf(ext)) return 'mdi-file-pdf';
  if (isArchive(ext)) return 'mdi-archive';
  return 'mdi-file';
}
function datasetDownloadLink(dataset: DatasetType) {
  if (dataset.link) return dataset.link;
  return `${apiBaseUrl}/dataset/${dataset.id}/download/`;
}
function sortFiles(files: FileType[] = []) {
  return [...files].sort((a, b) => {
    const aIsAudio = isAudio(fileExt(a.name));
    const bIsAudio = isAudio(fileExt(b.name));
    if (aIsAudio === bIsAudio) return a.name.localeCompare(b.name);
    return aIsAudio ? -1 : 1; // audio first
  });
}

// --- panel states for each file (independent) ---
const activePanels = ref<Record<number, boolean>>({});

// --- fetch datasets ---
const fetchDatasets = async (url = `${apiBaseUrl}/dataset/?page_size=${perPage.value}`) => {
  dataLoaded.value = false;
  try {
    const response = await axios.get(url);
    datasetList.value = response.data.results;
    next.value = response.data.next;
    previous.value = response.data.previous;
    count.value = response.data.count;

    // init activePanels for files
    datasetList.value.forEach((dataset) => {
      dataset.files.forEach((file) => {
        if (activePanels.value[file.id] === undefined) {
          activePanels.value[file.id] = false;
        }
      });
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error while loading datasets:', error);
  } finally {
    dataLoaded.value = true;
  }
};

// --- search (debounced) ---
const onSearch = debounce(() => {
  fetchDatasets(
    `${apiBaseUrl}/dataset/?search=${encodeURIComponent(search.value)}&page_size=${perPage.value}`
  );
}, 600);

watch(perPage, async () => fetchDatasets());
watch(search, async (newSearch) => {
  if (!newSearch) {
    search.value = '';
    await fetchDatasets();
  }
});

onMounted(() => fetchDatasets());
</script>

<template>
  <v-main>
    <v-container fluid>
      <v-row>
        <v-col>
          <v-card variant="flat" class="mx-auto" max-width="1000">
            <!-- TITLE -->
            <div class="d-flex align-center mt-1 mb-4">
              <h1><Database /> Datasets</h1>
              <v-chip v-if="count > 0" class="me-1 my-1 mx-2">{{ count }}</v-chip>
            </div>

            <!-- INFO BLOC -->
            <v-card class="mt-5 mb-5" color="grey-lighten-4">
              <v-card-text>
                Datasets include multiple recording sessions, curated and annotated for practical
                use in research and benchmarking.<br />
                You can download the original dataset files, inspect metadata, or explore associated
                DOI links when available.
              </v-card-text>
            </v-card>

            <!-- SEARCH BAR -->
            <v-toolbar rounded="lg" class="px-2 border-sm mb-4">
              <v-text-field
                v-model="search"
                @input="onSearch"
                clearable
                density="comfortable"
                hide-details
                placeholder="Search datasets"
                prepend-inner-icon="mdi-magnify"
                style="max-width: 300px"
                variant="solo"
              />
            </v-toolbar>

            <!-- LOADING -->
            <v-progress-circular
              v-if="!dataLoaded"
              indeterminate
              color="primary"
              class="d-block mx-auto my-5"
            />

            <!-- EMPTY -->
            <v-alert v-else-if="count === 0" type="info" class="mt-5 border" color="grey-lighten-2">
              <v-row>
                <v-col class="text-center">
                  <h3>No datasets available</h3>
                  <p>Try changing the search term.</p>
                </v-col>
              </v-row>
            </v-alert>

            <!-- LIST DATASETS -->
            <v-container fluid v-else class="pa-0">
              <v-card
                v-for="dataset in datasetList"
                :key="dataset.id"
                class="mt-5 border-sm"
                elevated
              >
                <v-card-title class="d-flex align-center justify-space-between">
                  <div>
                    {{ dataset.name }}
                  </div>

                  <div class="d-flex align-center">
                    <v-chip
                      v-if="dataset.doi"
                      label
                      small
                      color="red lighten-3"
                      text-color="red darken-3"
                      class="me-2"
                    >
                      DOI: {{ dataset.doi }}
                    </v-chip>

                    <!-- Bouton download compact -->
                    <v-btn
                      icon
                      :href="datasetDownloadLink(dataset)"
                      target="_blank"
                      title="Download dataset (archive)"
                      density="compact"
                      class="ms-1"
                    >
                      <v-icon size="18">mdi-download</v-icon>
                    </v-btn>
                  </div>
                </v-card-title>

                <v-card-text v-if="dataset.description">{{ dataset.description }}</v-card-text>
                <v-divider class="mx-4 mb-2" />

                <!-- FILES -->
                <v-expansion-panels multiple>
                  <v-expansion-panel
                    v-for="file in sortFiles(dataset.files)"
                    :key="file.id"
                    v-model:active="activePanels[file.id]"
                    :readonly="!file.spectrogram_url && !file.plot_url"
                    :hide-actions="!file.spectrogram_url && !file.plot_url"
                  >
                    <v-expansion-panel-title>
                      <v-row align="center" justify="space-between" class="w-100">
                        <v-col cols="auto" class="d-flex align-center">
                          <v-icon class="me-2">{{ fileIcon(file.name) }}</v-icon>
                          <strong>{{ file.name }}</strong>
                        </v-col>

                        <v-col cols="auto" class="d-flex align-center">
                          <v-chip v-if="file.doi" label small color="#03DAC6" class="me-2">
                            DOI: {{ file.doi }}
                          </v-chip>

                          <v-btn
                            v-if="file.link"
                            icon
                            :href="file.link"
                            target="_blank"
                            color="teal-darken-2"
                            title="Download file"
                            density="compact"
                            class="ms-1"
                          >
                            <v-icon size="18">mdi-download</v-icon>
                          </v-btn>
                        </v-col>
                      </v-row>
                    </v-expansion-panel-title>

                    <v-expansion-panel-text v-if="file.spectrogram_url || file.plot_url">
                      <v-row>
                        <v-col cols="12" sm="6" v-if="file.spectrogram_url">
                          <strong>Spectrogram:</strong>
                          <v-img :src="file.spectrogram_url" contain />
                        </v-col>

                        <v-col cols="12" sm="6" v-if="file.plot_url">
                          <strong>Plot:</strong>
                          <v-img :src="file.plot_url" contain />
                        </v-col>
                      </v-row>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card>
            </v-container>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<style scoped>
a {
  text-decoration: none;
  color: teal;
}
a:hover {
  text-decoration: underline;
}
</style>
