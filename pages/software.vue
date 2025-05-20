<script setup>
////////////////////////////////
// IMPORT
////////////////////////////////

import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { debounce } from 'lodash';
import { MonitorCog } from 'lucide-vue-next';

////////////////////////////////
// DATA
////////////////////////////////

const dataLoaded = ref(false);
const search = ref('');
const softwareList = ref([]);
const next = ref(null);
const previous = ref(null);
const count = ref(0);
const currentPage = ref(1);
const perPage = ref(10);
const showFilters = ref(false);
const filters = ref(['all']);
const apiBaseUrl = useApiBaseUrl();
const softwareTypeFilter = ref('all');

////////////////////////////////
// METHODS
////////////////////////////////

/**
 * Fetch software from the API
 * @param {string} url - The URL to fetch data from
 */
const fetchSoftware = async (
  url = `${apiBaseUrl}/software/?page_size=${perPage.value}&filter=${encodeURIComponent(filters.value)}`
) => {
  dataLoaded.value = false;
  try {
    const response = await axios.get(url);
    softwareList.value = response.data.results;
    next.value = response.data.next;
    previous.value = response.data.previous;
    count.value = response.data.count;
    currentPage.value = new URL(url).searchParams.get('page') || 1;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('error while loading software :', error);
  } finally {
    dataLoaded.value = true;
  }
};

/**
 * Debounced search function
 * @param {string} searchTerm - The search term to filter software
 */
const onSearch = debounce(() => {
  fetchSoftware(
    `${apiBaseUrl}/software/?search=${encodeURIComponent(search.value)}&page_size=${perPage.value}&filter=${encodeURIComponent(filters.value)}`
  );
}, 600);

////////////////////////////////
// WATCHER
////////////////////////////////

watch(perPage, async () => {
  await fetchSoftware();
});

watch(search, async (newSearch) => {
  if (newSearch === null) {
    search.value = '';
    await fetchSoftware();
  }
});

// Watch filters value and trigger fetchSoftware
watch(filters, () => {
  fetchSoftware();
});

////////////////////////////////
// ONMOUNTED
////////////////////////////////
onMounted(() => fetchSoftware());
</script>

<template>
  <v-main>
    <v-container>
      <v-row>
        <v-col>
          <v-card variant="flat" class="mx-auto" max-width="1000">
            <div class="d-flex align-center mt-1 mb-4">
              <h1><MonitorCog /> Software</h1>
              <v-chip v-if="count > 0" class="me-1 my-1 mx-2">
                {{ count }}
              </v-chip>
            </div>
            <!-- Search bar  -->
            <v-toolbar rounded="lg" class="px-2 border-sm">
              <v-text-field
                v-model="search"
                @input="onSearch"
                density="comfortable"
                placeholder="Search"
                prepend-inner-icon="mdi-magnify"
                style="max-width: 300px"
                variant="solo"
                clearable
                hide-details
                :autofocus="true"
              />
              <v-spacer></v-spacer>

              <v-select
                v-model="perPage"
                :items="[10, 20, 50, 100]"
                density="compact"
                variant="outlined"
                style="max-width: 100px; font-size: 12px"
                attach="body"
                :menu-props="{ contentClass: 'select-dropdown-zfix' }"
                hide-details
              />

              <v-btn icon="mdi-filter-variant" @click="showFilters = !showFilters" variant="text" />
            </v-toolbar>
            <!-- Filtres -->
            <div class="px-10">
              <v-expand-transition>
                <v-sheet
                  v-if="showFilters"
                  color="grey-lighten-4"
                  class="pa-4 mt-2 mb-4 rounded-lg border elevation-1"
                  mx-auto
                >
                  <h3 class="text-subtitle-1 mb-2">Filters</h3>
                  <v-row>
                    <v-col cols="12" sm="4">
                      <v-select
                        v-model="filters"
                        :items="['all', 'acquisition', 'analysis', 'acquisition and analysis']"
                        label="Filter by Software Type"
                        dense
                        hide-details
                        class="py-0"
                      />
                    </v-col>
                  </v-row>
                </v-sheet>
              </v-expand-transition>
            </div>
            <!-- Loading spinner  -->
            <v-progress-circular
              v-if="!dataLoaded"
              indeterminate
              color="primary"
              class="d-block mx-auto my-5"
            ></v-progress-circular>
            <!-- No data message -->
            <v-alert
              v-else-if="(count === 0) & dataLoaded"
              class="mt-5 border"
              type="info"
              color="grey-lighten-2"
            >
              <v-row>
                <v-col class="text-center">
                  <h3>No software available</h3>
                  <p>Try to change the search term or remove the filters.</p>
                </v-col>
              </v-row>
            </v-alert>
            <!-- Data display -->
            <v-data-iterator v-else class="mt-5" :items="softwareList" :items-per-page="perPage">
              <template v-slot:default="{ items }">
                <v-container class="pa-2" fluid>
                  <v-card
                    class="mt-5 border-sm"
                    v-for="{ raw: software } in items"
                    :key="software.id"
                    elevated
                  >
                    <v-card-title>
                      {{ software.name }}
                    </v-card-title>
                    <v-card-subtitle>
                      {{ software.made_by }}
                    </v-card-subtitle>
                    <v-chip
                      v-bind:class="{
                        'bg-blue-darken-2': software.type === 'acquisition',
                        'bg-red-darken-2': software.type === 'analysis',
                        'bg-orange-darken-2': software.type === 'acquisition and analysis',
                      }"
                      class="ml-2 position-absolute top-0 right-0 mt-3 mr-3"
                      label
                    >
                      {{ software.type }}
                    </v-chip>
                    <v-card-item class="bg-surface-light pt-4">
                      <v-label class="mr-2"></v-label>{{ software.description }}<br />
                    </v-card-item>

                    <!-- References Section -->
                    <v-expansion-panels>
                      <v-expansion-panel title="References" bg-color="grey-lighten-2">
                        <v-expansion-panel-text>
                          <v-row dense align="start" justify="start" class="pa-2">
                            <v-col
                              v-for="reference in software.references"
                              :key="reference.id"
                              cols="12"
                              sm="6"
                              md="4"
                              lg="3"
                            >
                              <v-card
                                elevation="1"
                                class="pa-3"
                                color="grey-lighten-4"
                                rounded="lg"
                                style="min-height: auto"
                              >
                                <a
                                  :href="reference.url"
                                  target="_blank"
                                  class="d-flex align-center justify-between mb-2 text-decoration-none text-red-darken-2"
                                  :title="reference.name"
                                >
                                  <span
                                    class="text-truncate text-body-2 font-weight-medium"
                                    style="max-width: calc(100% - 24px)"
                                  >
                                    {{ reference.name }}
                                  </span>
                                  <v-icon size="16" color="red-darken-2" class="ml-2"
                                    >mdi-open-in-new</v-icon
                                  >
                                </a>
                                <div class="text-caption">
                                  {{ reference.description }}
                                </div>
                              </v-card>
                            </v-col>
                          </v-row>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                    <v-divider class="mx-4"></v-divider>
                    <v-card-actions v-if="software.users && software.users.length" class="pl-4">
                      <div class="d-flex flex-wrap align-center ga-4">
                        <div
                          v-for="user in software.users"
                          :key="user.id"
                          class="d-flex align-center"
                          style="white-space: nowrap"
                        >
                          <a
                            :href="`mailto:${user.email_user}`"
                            class="d-flex align-center text-decoration-none"
                          >
                            <v-icon size="18" class="me-1" icon="mdi-email" />
                            <span>{{
                              user.name_user
                                ? `${user.first_name_user} ${user.name_user}`
                                : software.made_by
                            }}</span>
                          </a>
                        </div>
                      </div>
                    </v-card-actions>
                  </v-card>
                </v-container>
              </template>
            </v-data-iterator>

            <!-- Pagination -->
            <div class="d-flex align-center justify-center pa-4">
              <v-btn
                :disabled="!previous"
                icon="mdi-arrow-left"
                density="comfortable"
                variant="tonal"
                rounded
                @click="fetchSoftware(previous)"
              ></v-btn>
              <div class="mx-2 text-caption">
                Page {{ currentPage }} / {{ Math.ceil(count / perPage) }}
              </div>
              <v-btn
                :disabled="!next"
                icon="mdi-arrow-right"
                density="comfortable"
                variant="tonal"
                rounded
                @click="fetchSoftware(next)"
              ></v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<style scoped>
.hover-effect:hover {
  transform: scale(1.05);
  background-color: rgb(247, 226, 226);
}

a {
  text-decoration: none;
  color: rgba(198, 40, 40, 0.9);
}

.doi:hover {
  text-decoration: underline;
}

li {
  list-style: none;
}
</style>
