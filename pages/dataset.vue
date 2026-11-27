<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import debounce from 'lodash-es/debounce';
import { Database } from '@lucide/vue';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { isStaff, token } from '@/composables/useAuth';
import { doiLink, downloadLink } from '@/composables/zenodoLink';
import DatasetCreateModal from '@/components/modals/DatasetCreateModal.vue';
import FileImagesModal from '@/components/modals/FileImagesModal.vue';

interface FileType {
  id: number;
  name: string;
  doi?: string | null;
  link?: string | null;
  spectrogram_url?: string | null;
  plot_url?: string | null;
  deposit_images?: boolean;
  downloads?: number;
  session?: { name: string; chips: string[]; animal_profiles: string[] } | null;
}

interface DatasetType {
  id: number;
  name: string;
  doi?: string | null;
  link?: string | null;
  description?: string;
  recording_sessions?: { id: number; name: string }[];
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
const edited = ref<DatasetType | null>(null); // the dataset the form changes; null: a new one
const openForm = (dataset: DatasetType | null = null) => {
  edited.value = dataset;
  showCreate.value = true;
};
const createdMessage = ref(false);
const savedText = ref('Dataset created.');
const onCreated = async () => {
  savedText.value = edited.value ? 'Dataset updated.' : 'Dataset created.';
  createdMessage.value = true;
  await fetchDatasets();
};

// --- admin-only: delete a dataset (its sessions and files stay) ---
const toDelete = ref<DatasetType | null>(null);
const showDelete = ref(false);
const deleting = ref(false);
const deleteError = ref('');
const askDelete = (dataset: DatasetType) => {
  toDelete.value = dataset;
  deleteError.value = '';
  showDelete.value = true;
};
const confirmDelete = async () => {
  if (!toDelete.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await axios.delete(`${apiBaseUrl}/dataset/${toDelete.value.id}/`, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    showDelete.value = false;
    savedText.value = 'Dataset deleted.';
    createdMessage.value = true;
    await fetchDatasets();
  } catch {
    deleteError.value = 'The dataset could not be deleted. Only administrators can delete one.';
  } finally {
    deleting.value = false;
  }
};

// --- admin-only: the images of a file ---
const imagesOf = ref<FileType | null>(null);
const showImages = ref(false);
const editImages = (file: FileType) => {
  imagesOf.value = file;
  showImages.value = true;
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
// --- the files of the Zenodo record of a file: shown to everybody when its row is unfolded ---
interface RecordFile {
  name: string;
  size: number | null;
  url: string;
}
interface RecordInfo {
  loading: boolean;
  error: string;
  record: string;
  files: RecordFile[];
}
const records = ref<Record<number, RecordInfo>>({});
const onZenodo = (file: FileType) => /^https?:\/\/(sandbox\.)?zenodo\.org\//.test(file.link || '');
const hasDetails = (file: FileType) => !!(file.spectrogram_url || file.plot_url || onZenodo(file));
const formatSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024 ** 2) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};
const loadRecord = async (file: FileType) => {
  records.value[file.id] = { loading: true, error: '', record: '', files: [] };
  try {
    const { data } = await axios.get(`${apiBaseUrl}/file/${file.id}/zenodo-files/`);
    records.value[file.id] = { loading: false, error: '', record: data.record, files: data.files };
  } catch (error: any) {
    const busy = error?.response?.status === 429;
    records.value[file.id] = {
      loading: false,
      error: busy
        ? 'Too many requests, try again in a minute.'
        : 'The list of files could not be read from Zenodo.',
      record: '',
      files: [],
    };
  }
};

// --- the whole dataset: signed-in users only, so that robots do not take it ---
const signedIn = computed(() => !!token.value);
const downloading = ref<Record<string, boolean>>({});
const notice = ref({ shown: false, text: '', color: 'success' });
const say = (text: string, color = 'success') => {
  notice.value = { shown: true, text, color };
};
// a zip for a signed-in user: the server checks it and gives an address valid two minutes (a link
// cannot carry the token of the login), then the browser downloads it
const startZip = async (path: string, busy: string, what: string, body: object = {}) => {
  downloading.value[busy] = true;
  try {
    const { data } = await axios.post(`${apiBaseUrl}${path}`, body, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    window.location.assign(`${apiBaseUrl}${path}?token=${encodeURIComponent(data.token)}`);
    const elsewhere = data.left_out
      ? ` ${data.left_out} file${data.left_out === 1 ? ' is' : 's are'} hosted elsewhere and not in the zip.`
      : '';
    say(
      `Download started: ${data.files} files${data.bytes ? `, ${formatSize(data.bytes)}` : ''}.${elsewhere}`
    );
  } catch (error: any) {
    const code = error?.response?.status;
    say(
      error?.response?.data?.detail ||
        (code === 401 ? `Sign in to download the ${what}.` : 'The download could not start.'),
      'error'
    );
  } finally {
    setTimeout(() => (downloading.value[busy] = false), 3000);
  }
};
// `sound`: the recordings only; `all`: every file of their Zenodo records (images and analyses too)
const downloadDataset = (dataset: DatasetType, scope: 'sound' | 'all') =>
  startZip(`/dataset/${dataset.id}/download/`, `dataset:${dataset.id}`, 'dataset', { scope });
const downloadRecord = (file: FileType) =>
  startZip(`/file/${file.id}/record-download/`, `record:${file.id}`, 'record');
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

// --- the files of a dataset are folded: a search opens them, the user can open or close each ---
const openDatasets = ref<Record<number, boolean>>({});
const isOpen = (dataset: DatasetType) => openDatasets.value[dataset.id] ?? !!appliedSearch.value;
const toggleFiles = (dataset: DatasetType) => {
  openDatasets.value[dataset.id] = !isOpen(dataset);
};

// --- panel states for each file (independent) ---
const activePanels = ref<Record<number, boolean>>({});

// the panel of a file tells when it opens (`group:selected`): the files of its record are read then
const onPanel = (file: FileType, open: boolean) => {
  if (open && onZenodo(file) && !records.value[file.id]) loadRecord(file);
};

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
  openDatasets.value = {}; // a new search opens the lists, an emptied one folds them
  fetchDatasets(
    `${apiBaseUrl}/dataset/?search=${encodeURIComponent(search.value)}&page_size=${perPage.value}`
  );
}, 600);

watch(perPage, async () => fetchDatasets());
watch(search, async (newSearch) => {
  if (!newSearch) {
    search.value = '';
    appliedSearch.value = '';
    openDatasets.value = {};
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
            <div class="d-flex align-center flex-wrap ga-2 mt-1 mb-4">
              <h1><Database /> Datasets</h1>
              <v-chip v-if="count > 0" class="me-1 my-1 mx-2">{{ count }}</v-chip>
              <v-spacer />
              <v-btn v-if="isStaff" color="primary" prepend-icon="mdi-plus" @click="openForm()">
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
                class="list-card border-sm"
                elevated
              >
                <v-card-title class="d-flex align-center justify-space-between">
                  <div>
                    {{ dataset.name }}
                  </div>

                  <div class="d-flex align-center">
                    <v-chip
                      label
                      size="small"
                      variant="tonal"
                      class="me-2"
                      title="Files in this dataset"
                    >
                      <v-icon start size="16">mdi-file-music-outline</v-icon>
                      {{ dataset.files.length }} file{{ dataset.files.length === 1 ? '' : 's' }}
                    </v-chip>
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
                        :href="doiLink(dataset.doi)"
                        target="_blank"
                        class="doi"
                        >{{ dataset.doi }}</a
                      >
                    </v-chip>

                    <v-btn
                      v-if="isStaff"
                      icon
                      title="Edit the dataset: its sessions and their files"
                      density="compact"
                      class="ms-1"
                      @click="openForm(dataset)"
                    >
                      <v-icon size="18">mdi-pencil-outline</v-icon>
                    </v-btn>

                    <v-btn
                      v-if="isStaff"
                      icon
                      title="Delete the dataset (its sessions and files are kept)"
                      density="compact"
                      class="ms-1"
                      @click="askDelete(dataset)"
                    >
                      <v-icon size="18">mdi-delete-outline</v-icon>
                    </v-btn>

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

                    <!-- a link given with the dataset, else the zip (signed-in users only) -->
                    <v-btn
                      v-if="dataset.link"
                      icon
                      :href="dataset.link"
                      target="_blank"
                      title="Download dataset (archive)"
                      density="compact"
                      class="ms-1"
                    >
                      <v-icon size="18">mdi-download</v-icon>
                    </v-btn>
                    <v-menu v-else-if="signedIn" location="bottom end">
                      <template #activator="{ props: menuProps }">
                        <v-btn
                          v-bind="menuProps"
                          icon
                          :loading="downloading['dataset:' + dataset.id]"
                          :disabled="downloading['dataset:' + dataset.id]"
                          title="Download the dataset in one zip: choose what it holds"
                          density="compact"
                          class="ms-1"
                        >
                          <v-icon size="18">mdi-download</v-icon>
                        </v-btn>
                      </template>
                      <v-list density="compact" class="zip-menu">
                        <v-list-item
                          prepend-icon="mdi-waveform"
                          title="Sound files only"
                          subtitle="The recordings of the dataset (.wav)"
                          @click="downloadDataset(dataset, 'sound')"
                        />
                        <v-list-item
                          prepend-icon="mdi-folder-zip-outline"
                          title="All files"
                          subtitle="Recordings, images and analyses"
                          @click="downloadDataset(dataset, 'all')"
                        />
                      </v-list>
                    </v-menu>
                  </div>
                </v-card-title>

                <v-card-text v-if="dataset.description">{{ dataset.description }}</v-card-text>
                <v-divider class="mx-4 mb-2" />
                <button
                  type="button"
                  class="files-toggle"
                  :aria-expanded="isOpen(dataset)"
                  @click="toggleFiles(dataset)"
                >
                  <v-icon size="20" class="files-chevron" :class="{ open: isOpen(dataset) }">
                    mdi-chevron-down
                  </v-icon>
                  <span class="files-toggle-text">
                    {{ isOpen(dataset) ? 'Hide' : 'Show' }} the {{ dataset.files.length }} file{{
                      dataset.files.length === 1 ? '' : 's'
                    }}
                  </span>
                  <span class="files-toggle-hint">
                    {{ isOpen(dataset) ? 'Click to fold the list' : 'Click to unfold the list' }}
                  </span>
                </button>
                <div
                  v-if="appliedSearch && matchingFiles(dataset.files).length < dataset.files.length"
                  class="text-caption text-medium-emphasis mx-4 mb-2"
                >
                  {{ matchingFiles(dataset.files).length }} of {{ dataset.files.length }} files
                  match "{{ appliedSearch }}"
                </div>

                <!-- FILES -->
                <v-expand-transition>
                  <v-expansion-panels v-show="isOpen(dataset)" multiple>
                    <v-expansion-panel
                      v-for="file in sortFiles(matchingFiles(dataset.files))"
                      :key="file.id"
                      v-model:active="activePanels[file.id]"
                      :readonly="!hasDetails(file)"
                      :hide-actions="!hasDetails(file)"
                      @group:selected="onPanel(file, $event.value)"
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
                            <v-btn
                              v-if="isStaff"
                              icon
                              density="compact"
                              variant="text"
                              title="Spectrogram and plot of this file"
                              class="me-1"
                              @click.stop="editImages(file)"
                            >
                              <v-icon size="18">mdi-image-edit-outline</v-icon>
                            </v-btn>
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
                                :href="doiLink(file.doi)"
                                target="_blank"
                                class="doi"
                                >{{ file.doi }}</a
                              >
                            </v-chip>

                            <v-btn
                              v-if="file.link"
                              icon
                              :href="downloadLink(file)"
                              target="_blank"
                              color="teal-darken-2"
                              :title="`Download only ${file.name}`"
                              density="compact"
                              class="ms-1"
                            >
                              <v-icon size="18">mdi-download</v-icon>
                            </v-btn>
                          </v-col>
                        </v-row>
                      </v-expansion-panel-title>

                      <v-expansion-panel-text v-if="hasDetails(file)">
                        <div v-if="onZenodo(file)" class="mb-4">
                          <div class="d-flex align-center flex-wrap ga-2">
                            <strong>Files of this record on Zenodo</strong>
                            <v-spacer />
                            <v-btn
                              v-if="signedIn"
                              size="small"
                              variant="tonal"
                              color="teal-darken-2"
                              prepend-icon="mdi-folder-zip-outline"
                              :loading="downloading['record:' + file.id]"
                              :disabled="downloading['record:' + file.id]"
                              title="Download every file of this record in one zip"
                              @click="downloadRecord(file)"
                              >Download all (zip)</v-btn
                            >
                          </div>
                          <v-progress-linear
                            v-if="!records[file.id] || records[file.id].loading"
                            indeterminate
                            class="my-2"
                          />
                          <v-alert
                            v-else-if="records[file.id]?.error"
                            type="warning"
                            variant="tonal"
                            density="compact"
                            class="mt-2"
                          >
                            {{ records[file.id].error }}
                          </v-alert>
                          <v-list v-else-if="records[file.id]" density="compact" class="py-0">
                            <v-list-item
                              v-for="recordFile in records[file.id].files"
                              :key="recordFile.name"
                              min-height="32"
                              class="px-0"
                            >
                              <template #title>
                                <a
                                  :href="`${records[file.id].record}/preview/${encodeURIComponent(recordFile.name)}`"
                                  target="_blank"
                                  rel="noopener"
                                  title="Preview on Zenodo"
                                  >{{ recordFile.name }}</a
                                >
                                <span class="text-caption text-medium-emphasis ms-3">{{
                                  formatSize(recordFile.size)
                                }}</span>
                              </template>
                              <template #append>
                                <v-btn
                                  icon
                                  :href="recordFile.url"
                                  color="teal-darken-2"
                                  :title="`Download ${recordFile.name}`"
                                  density="compact"
                                  variant="text"
                                  size="small"
                                >
                                  <v-icon size="18">mdi-download</v-icon>
                                </v-btn>
                              </template>
                            </v-list-item>
                          </v-list>
                        </div>
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
                </v-expand-transition>
              </v-card>
            </v-container>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
    <DatasetCreateModal v-model:show="showCreate" :dataset="edited" @created="onCreated" />
    <FileImagesModal
      v-if="imagesOf"
      v-model:show="showImages"
      :file="imagesOf"
      @saved="fetchDatasets"
    />
    <v-dialog v-model="showDelete" max-width="460" :persistent="deleting">
      <v-card>
        <v-card-title class="text-h6">Delete this dataset?</v-card-title>
        <v-card-text>
          <p>
            You are about to delete <strong>{{ toDelete?.name }}</strong
            >.
          </p>
          <p class="mt-2">
            Only the dataset is removed. Its
            {{ toDelete?.recording_sessions?.length ?? 0 }} recording session{{
              toDelete?.recording_sessions?.length === 1 ? '' : 's'
            }}
            and their {{ toDelete?.files.length ?? 0 }} file{{
              toDelete?.files.length === 1 ? '' : 's'
            }}
            stay in the vocalizations. This cannot be undone.
          </p>
          <v-alert v-if="deleteError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ deleteError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="deleting" @click="showDelete = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="createdMessage" color="success" timeout="4000">{{ savedText }}</v-snackbar>
    <v-snackbar v-model="notice.shown" :color="notice.color" timeout="7000">{{
      notice.text
    }}</v-snackbar>
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
/* in the menu of the zip, the icon of a choice turns red (the color of the site) under the mouse */
.zip-menu :deep(.v-list-item .v-icon) {
  transition: color 0.15s;
}
.zip-menu :deep(.v-list-item:hover .v-icon) {
  color: rgb(var(--v-theme-primary));
}
/* the bar that folds and unfolds the files of a dataset: made to look clickable */
.files-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: calc(100% - 32px);
  margin: 4px 16px 12px;
  padding: 10px 14px;
  border: 1.5px dashed #c9c9c9;
  border-radius: 12px;
  background: #fafafa;
  font: inherit;
  text-align: left;
  color: #222;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}
.files-toggle:hover,
.files-toggle:focus-visible {
  background: #fbeaea;
  border-color: rgb(var(--v-theme-primary));
  outline: none;
}
.files-toggle-text {
  font-weight: 700;
}
.files-toggle-hint {
  margin-left: auto;
  font-size: 0.8rem;
  color: #777;
}
.files-chevron {
  color: rgb(var(--v-theme-primary));
  transition: transform 0.2s ease;
}
.files-chevron.open {
  transform: rotate(180deg);
}
.doi {
  color: inherit;
}
</style>
