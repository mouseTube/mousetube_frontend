<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import debounce from 'lodash-es/debounce';
import { Database } from '@lucide/vue';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { isStaff } from '@/composables/useAuth';
import DatasetCreateModal from '@/components/modals/DatasetCreateModal.vue';

interface FileType {
  id: number;
  name: string;
  doi?: string | null;
  link?: string | null;
  spectrogram_url?: string | null;
  plot_url?: string | null;
  downloads?: number;
  session?: { name: string; chips: string[]; animal_profiles: string[] } | null;
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
// the term of the last search sent to the API: the file rows are filtered with it too
const appliedSearch = ref('');
const datasetList = ref<DatasetType[]>([]);
const next = ref<string | null>(null);
const previous = ref<string | null>(null);
const count = ref(0);
const perPage = ref(10);

const apiBaseUrl = useApiBaseUrl();

// --- admin-only: add a dataset ---
const showCreate = ref(false);
const createdMessage = ref(false);
const onCreated = async () => {
  createdMessage.value = true;
  await fetchDatasets();
};

// --- helpers for file types / icons / ordering ---
function fileExt(name?: string) {
  if (!name) return '';
  const m = name.split('.').pop();
  return (m || '').toLowerCase();
}
function isAudio(ext: string) {
  return ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac'].includes(ext);
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

// A search returns whole datasets: keep, inside each, the files that match the words
// (name, DOI, session, the chips and animal profiles shown on the row). When no file
// matches, the dataset matched through its own text, so every file stays visible.
function matchingFiles(files: FileType[] = []) {
  const words = appliedSearch.value.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return files;
  const matches = files.filter((f) => {
    const text = [
      f.name,
      f.doi,
      f.session?.name,
      ...(f.session?.chips || []),
      ...(f.session?.animal_profiles || []),
    ]
      .join(' ')
      .toLowerCase();
    // a word matches the start of a word ("no" must not match "zenodo")
    return words.every((w) =>
      new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text)
    );
  });
  return matches.length ? matches : files;
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
  appliedSearch.value = search.value.trim();
  fetchDatasets(
    `${apiBaseUrl}/dataset/?search=${encodeURIComponent(search.value)}&page_size=${perPage.value}`
  );
}, 600);

watch(perPage, async () => fetchDatasets());
watch(search, async (newSearch) => {
  if (!newSearch) {
    search.value = '';
    appliedSearch.value = '';
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
              <v-spacer />
              <v-btn
                v-if="isStaff"
                color="primary"
                prepend-icon="mdi-plus"
                @click="showCreate = true"
              >
                Add a dataset
              </v-btn>
            </div>

            <!-- INFO BLOC -->
            <v-card class="mt-5 mb-5" color="grey-lighten-4">
              <v-card-text>
                <p class="mb-2">
                  Datasets are provided for practical use in research and benchmarking of existing
                  or new applications for ultrasonic vocalisation detection and analysis. Datasets
                  include multiple recording sessions, gathering recordings covering part of the
                  diversity of ultrasonic vocalisations for each species. Each recording is curated
                  and manually annotated by two experts.
                </p>
                <p class="mb-0">
                  The files also underwent automatic detections by different applications (analysis
                  parameters are given). You can download the original audio files, as well as the
                  results of manual and automatic detections.
                </p>
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
                      variant="tonal"
                      color="blue"
                      class="me-2"
                    >
                      DOI:
                      <a
                        v-if="dataset.doi.includes('zenodo')"
                        :href="'https://zenodo.org/record/' + dataset.doi.split('zenodo.')[1]"
                        target="_blank"
                        class="doi"
                        >{{ dataset.doi }}</a
                      >
                    </v-chip>

                    <v-btn
                      icon
                      :href="`${apiBaseUrl}/dataset/${dataset.id}/metadata/`"
                      target="_blank"
                      title="Metadata (JSON)"
                      density="compact"
                      class="ms-1"
                    >
                      <v-icon size="18">mdi-code-json</v-icon>
                    </v-btn>

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
                <div
                  v-if="appliedSearch && matchingFiles(dataset.files).length < dataset.files.length"
                  class="text-caption text-medium-emphasis mx-4 mb-2"
                >
                  {{ matchingFiles(dataset.files).length }} of {{ dataset.files.length }} files
                  match "{{ appliedSearch }}"
                </div>

                <!-- FILES -->
                <v-expansion-panels multiple>
                  <v-expansion-panel
                    v-for="file in sortFiles(matchingFiles(dataset.files))"
                    :key="file.id"
                    v-model:active="activePanels[file.id]"
                    :readonly="!file.spectrogram_url && !file.plot_url"
                    :hide-actions="!file.spectrogram_url && !file.plot_url"
                  >
                    <v-expansion-panel-title>
                      <v-row align="center" justify="space-between" class="w-100">
                        <v-col class="d-flex align-center flex-wrap">
                          <strong class="me-3">{{ file.name }}</strong>
                          <template v-if="file.session">
                            <v-chip
                              v-for="chip in file.session.chips"
                              :key="chip"
                              size="x-small"
                              label
                              color="teal"
                              variant="tonal"
                              class="me-1 my-1"
                            >
                              {{ chip }}
                            </v-chip>
                            <v-chip
                              v-for="animal in file.session.animal_profiles"
                              :key="animal"
                              size="x-small"
                              label
                              color="red"
                              variant="tonal"
                              class="me-1 my-1"
                            >
                              {{ animal }}
                            </v-chip>
                          </template>
                        </v-col>

                        <v-col cols="auto" class="d-flex align-center">
                          <span
                            v-if="file.downloads"
                            class="text-caption text-medium-emphasis me-3"
                            :title="`${file.downloads} downloads`"
                          >
                            <v-icon size="14">mdi-download</v-icon> {{ file.downloads }}
                          </span>
                          <v-chip
                            v-if="file.doi"
                            label
                            small
                            variant="tonal"
                            color="blue"
                            class="me-2"
                          >
                            DOI:
                            <a
                              v-if="file.doi.includes('zenodo')"
                              :href="'https://zenodo.org/record/' + file.doi.split('zenodo.')[1]"
                              target="_blank"
                              class="doi"
                              >{{ file.doi }}</a
                            >
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
                          <a :href="file.spectrogram_url" target="_blank" title="Open full size">
                            <v-img :src="file.spectrogram_url" contain />
                          </a>
                        </v-col>

                        <v-col cols="12" sm="6" v-if="file.plot_url">
                          <strong>Plot:</strong>
                          <a :href="file.plot_url" target="_blank" title="Open full size">
                            <v-img :src="file.plot_url" contain />
                          </a>
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
    <DatasetCreateModal v-model:show="showCreate" @created="onCreated" />
    <v-snackbar v-model="createdMessage" color="success" timeout="4000"
      >Dataset created.</v-snackbar
    >
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
.doi {
  color: inherit;
}
</style>
