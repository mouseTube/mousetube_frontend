<!--
Created by Nicolas Torquet at 20/12/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->

<script setup>
////////////////////////////////
// IMPORT
////////////////////////////////

import { ref, onMounted } from 'vue';
import axios from 'axios';
import { debounce } from 'lodash';
import { Warehouse } from 'lucide-vue-next';

////////////////////////////////
// DATA
////////////////////////////////

const loading = ref(true);
const dataLoaded = ref(false);
const search = ref('');
const repositoriesList = ref([]);
const next = ref(null);
const previous = ref(null);
const count = ref(0);
const currentPage = ref(1);
const perPage = ref(10);
const showFilters = ref(false);
const filters = ref(['all']);
const apiBaseUrl = useApiBaseUrl();

const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

////////////////////////////////
// METHODS
////////////////////////////////

/**
 * Fetch software from the API
 * @param {string} url - The URL to fetch data from
 */
const fetchRepositories = async (url = `${apiBaseUrl}/repository/?page_size=${perPage.value}`) => {
  dataLoaded.value = false;
  try {
    const response = await axios.get(url);
    repositoriesList.value = response.data.results;
    next.value = response.data.next;
    previous.value = response.data.previous;
    count.value = response.data.count;
    currentPage.value = new URL(url).searchParams.get('page') || 1;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('error while loading repositories :', error);
  } finally {
    dataLoaded.value = true;
  }
};

/**
 * Debounced search function
 * @param {string} searchTerm - The search term to filter repositories
 */
const onSearch = debounce(() => {
  fetchRepositories(
    `${apiBaseUrl}/repository/?search=${encodeURIComponent(search.value)}&page_size=${perPage.value}`
  );
}, 600);

////////////////////////////////
// WATCHER
////////////////////////////////

watch(perPage, async () => {
  await fetchRepositories();
});

watch(search, async (newSearch) => {
  if (newSearch === null) {
    search.value = '';
    await fetchRepositories();
  }
});

////////////////////////////////
// ON MOUNTED
////////////////////////////////

// Fetch repositories when the component is mounted
onMounted(() => fetchRepositories());
</script>

<template>
  <v-main>
    <v-container>
      <v-row>
        <v-col>
          <v-card variant="flat" class="mx-auto" max-width="1000">
            <div class="d-flex align-center mt-1 mb-4">
              <h1><Warehouse /> Repositories</h1>
              <v-chip v-if="count > 0" class="me-1 my-1 mx-2">
                {{ count }}
              </v-chip>
            </div>
            <v-card class="mt-5 mb-5" color="grey-lighten-4">
              <v-card-text>
                We aim to follow
                <nuxt-link href="https://www.go-fair.org/fair-principles/" target="_blank"
                  >the FAIR (Findable, Accessible, Interoperable, Reusable) principles</nuxt-link
                >
                by encouraging the use of trusted scientific repositories such as Zenodo and
                Dataverse for data storage and DOI generation.<br />
                Storing your data in these repositories helps ensure accessibility and reliability,
                and is increasingly required by publishers.<br />
                Please check that your shared links remain valid and update them with
                repository-generated links and DOIs if needed.<br />
                If you use Zenodo, you can select the mouseTube community when uploading your files.
                <br />
                Thank you for supporting open and reliable data sharing.
              </v-card-text>
            </v-card>
            <v-toolbar rounded="lg" class="px-2 border-sm">
              <v-text-field
                v-model="search"
                @input="onSearch"
                clearable
                density="comfortable"
                hide-details
                placeholder="Search"
                prepend-inner-icon="mdi-magnify"
                style="max-width: 300px"
                variant="solo"
              ></v-text-field>
            </v-toolbar>
            <!-- Loading spinner  -->
            <v-progress-circular
              v-if="!dataLoaded"
              indeterminate
              color="primary"
              class="d-block mx-auto my-5"
            ></v-progress-circular>
            <!-- No data message -->
            <v-alert
              v-else-if="count === 0 && dataLoaded"
              class="mt-5 border"
              type="info"
              color="grey-lighten-2"
            >
              <v-row>
                <v-col class="text-center">
                  <h3>No repositories available</h3>
                  <p>Try to change the search term.</p>
                </v-col>
              </v-row>
            </v-alert>

            <v-data-iterator
              v-else
              class="mt-5"
              :items="repositoriesList"
              :items-per-page="perPage"
            >
              <template v-slot:default="{ items }">
                <v-container class="pa-2" fluid>
                  <v-card
                    class="mt-5 border-sm"
                    v-bind="repository"
                    v-for="repository in items"
                    :key="repository.raw.name"
                    elevated
                  >
                    <div
                      v-if="repository.raw.logo"
                      style="
                        position: absolute;
                        top: 12px;
                        right: 16px;
                        width: 56px;
                        height: 56px;
                        background: #fff;
                        border: 1px solid #eee;
                        border-radius: 10px;
                        overflow: hidden;
                        z-index: 2;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      "
                    >
                      <img
                        :src="baseUrl + repository.raw.logo"
                        :alt="repository.raw.name"
                        style="
                          width: 100%;
                          height: 100%;
                          object-fit: contain;
                          transform: scale(1.3);
                        "
                      />
                    </div>
                    <v-card-title>{{ repository.raw.name }}</v-card-title>
                    <v-card-subtitle>{{ repository.raw.area }}</v-card-subtitle>
                    <v-card-item>
                      {{ repository.raw.description }}
                    </v-card-item>
                    <v-divider class="mx-4 mb-1"></v-divider>
                    <v-card-actions>
                      <v-btn variant="text" color="rgba(198, 40, 40, 0.9)">
                        <v-icon icon="mdi-link-variant"></v-icon>
                        <a :href="repository.raw.url" target="_blank"> Website</a>
                      </v-btn>
                      <v-btn variant="text" color="rgba(198, 40, 40, 0.9)">
                        <v-icon icon="mdi-api"></v-icon>
                        <a :href="repository.raw.url_api" target="_blank">{{
                          repository.raw.url_api
                        }}</a>
                      </v-btn>
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
  color: rgba(198, 40, 40, 0.9);
}

a:hover {
  text-decoration: underline;
}
</style>
