<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';
import debounce from 'lodash/debounce.js';
import { Database } from 'lucide-vue-next';

const loading = ref(true);
const dataLoaded = ref(false);
const search = ref('');
const datasetList = ref([]);
const next = ref(null);
const previous = ref(null);
const count = ref(0);
const currentPage = ref(1);
const perPage = ref(10);

const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

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
    currentPage.value = new URL(url).searchParams.get('page') || 1;
  } catch (error) {
    console.error('error while loading datasets :', error);
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

////////////////////////////////
// WATCHERS
////////////////////////////////
watch(perPage, async () => {
  await fetchDatasets();
});

watch(search, async (newSearch) => {
  if (newSearch === null) {
    search.value = '';
    await fetchDatasets();
  }
});

////////////////////////////////
// ON MOUNTED
////////////////////////////////
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
              <h1><Database /> Dataset</h1>
              <v-chip v-if="count > 0" class="me-1 my-1 mx-2">{{ count }}</v-chip>
            </div>

            <!-- INFO BLOC (reprend ta page actuelle) -->
            <v-card class="mt-5 mb-5" color="grey-lighten-4">
              <v-card-text>
                In this page, you will find reference datasets to train, test or compare
                vocalization analysis software.<br /><br />

                These datasets include multiple recording sessions, curated and annotated for
                practical use in research and benchmarking.<br />
                You can download the original dataset, inspect metadata, or explore associated DOI
                links when available.
              </v-card-text>
            </v-card>

            <!-- SEARCH BAR -->
            <v-toolbar rounded="lg" class="px-2 border-sm">
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
              ></v-text-field>
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

            <!-- LIST -->
            <v-data-iterator v-else :items="datasetList" :items-per-page="perPage" class="mt-5">
              <template #default="{ items }">
                <v-container fluid class="pa-2">
                  <v-card v-for="item in items" :key="item.raw.id" class="mt-5 border-sm" elevated>
                    <v-card-title>{{ item.raw.name }}</v-card-title>

                    <v-card-subtitle>
                      Created at: {{ new Date(item.raw.created_at).toLocaleDateString() }}
                    </v-card-subtitle>

                    <v-card-item>
                      <div v-if="item.raw.description">
                        {{ item.raw.description }}
                      </div>
                    </v-card-item>

                    <v-divider class="mx-4 mb-1"></v-divider>

                    <v-card-actions>
                      <v-btn v-if="item.raw.link" variant="text" color="teal-darken-2">
                        <v-icon icon="mdi-link-variant"></v-icon>
                        <a :href="item.raw.link" target="_blank"> Link </a>
                      </v-btn>

                      <v-chip v-if="item.raw.doi" class="ma-2" label color="#03DAC6">
                        <strong>DOI:</strong>&nbsp; {{ item.raw.doi }}
                      </v-chip>
                    </v-card-actions>
                  </v-card>
                </v-container>
              </template>
            </v-data-iterator>
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
