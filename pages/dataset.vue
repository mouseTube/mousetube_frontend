<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
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

const loading = ref(true);
const dataLoaded = ref(false);
const search = ref('');
const datasetList = ref<DatasetType[]>([]);
const next = ref<string | null>(null);
const previous = ref<string | null>(null);
const count = ref(0);
const perPage = ref(10);

const apiBaseUrl = useApiBaseUrl();

////////////////////////////////
// FETCH DATASETS
////////////////////////////////
const fetchDatasets = async (url = `${apiBaseUrl}/dataset/?page_size=${perPage.value}`) => {
  dataLoaded.value = false;
  try {
    const response = await axios.get(url);
    datasetList.value = response.data.results;
    next.value = response.data.next;
    previous.value = response.data.previous;
    count.value = response.data.count;
  } catch (error) {
    console.error('Error while loading datasets:', error);
  } finally {
    dataLoaded.value = true;
  }
};

////////////////////////////////
// SEARCH (debounced)
////////////////////////////////
const onSearch = debounce(() => {
  fetchDatasets(
    `${apiBaseUrl}/dataset/?search=${encodeURIComponent(search.value)}&page_size=${perPage.value}`
  );
}, 600);

watch(perPage, async () => {
  await fetchDatasets();
});

watch(search, async (newSearch) => {
  if (newSearch === null) {
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
                <v-card-title>{{ dataset.name }}</v-card-title>
                <!-- <v-card-subtitle> Created at: {{ dataset.created_at }} </v-card-subtitle> -->

                <v-card-text v-if="dataset.description">{{ dataset.description }}</v-card-text>

                <v-divider class="mx-4 mb-2" />

                <!-- Files -->
                <div v-for="file in dataset.files" :key="file.id" class="mb-2">
                  <template v-if="!file.spectrogram_url && !file.plot_url">
                    <v-card rounded="lg" class="pa-3 border-sm">
                      <v-row align="center" justify="space-between">
                        <v-col cols="auto">
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
                          >
                            <v-icon icon="mdi-download" />
                          </v-btn>
                        </v-col>
                      </v-row>
                    </v-card>
                  </template>

                  <template v-else>
                    <v-expansion-panels>
                      <v-expansion-panel>
                        <v-expansion-panel-title>
                          <v-row class="w-100" align="center" justify="space-between">
                            <v-col cols="auto">
                              <span>{{ file.name }}</span>
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
                              >
                                <v-icon icon="mdi-download" />
                              </v-btn>
                            </v-col>
                          </v-row>
                        </v-expansion-panel-title>

                        <v-expansion-panel-text>
                          <v-row>
                            <v-col cols="12" sm="6" v-if="file.spectrogram_url">
                              <strong>Spectrogram:</strong>
                              <v-img :src="file.spectrogram_url" alt="Spectrogram" contain />
                            </v-col>

                            <v-col cols="12" sm="6" v-if="file.plot_url">
                              <strong>Plot:</strong>
                              <v-img :src="file.plot_url" alt="Plot" contain />
                            </v-col>
                          </v-row>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </template>
                </div>
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
