<script setup>
////////////////////////////////
// IMPORT
////////////////////////////////
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import axios from 'axios';
import debounce from 'lodash/debounce.js';
import { MonitorCog } from 'lucide-vue-next';
import { useAuth } from '@/composables/useAuth';

const { token, id_user, fetchUser } = useAuth();

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
const filters = ref(['all']);
const apiBaseUrl = useApiBaseUrl();
const viewMode = ref('cards');
const showFiltersMobile = ref(false);
const showFiltersDesktop = ref(false);
const isDesktop = ref(window.innerWidth >= 960);
const userProfile = ref(null);

////////////////////////////////
// METHODS
////////////////////////////////

function updateIsDesktop() {
  isDesktop.value = window.innerWidth >= 960;
  if (!isDesktop.value) {
    showFiltersDesktop.value = false;
  }
}

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

const onSearch = debounce(() => {
  fetchSoftware(
    `${apiBaseUrl}/software/?search=${encodeURIComponent(search.value)}&page_size=${perPage.value}&filter=${encodeURIComponent(filters.value)}`
  );
}, 600);

const lastPage = computed(() => Math.ceil(count.value / perPage.value));

const lastPageUrl = computed(() => {
  return `${apiBaseUrl}/software/?page=${lastPage.value}&page_size=${perPage.value}&filter=${encodeURIComponent(filters.value)}`;
});

const firstPageUrl = computed(() => {
  return `${apiBaseUrl}/software/?page=1&page_size=${perPage.value}&filter=${encodeURIComponent(filters.value)}`;
});

async function fetchUserProfile() {
  if (!id_user.value || !token.value) return;

  const res = await axios.get(`${apiBaseUrl}/user_profile/?user_id=${id_user.value}`, {
    headers: { Authorization: `Bearer ${token.value}` },
  });
  userProfile.value = res.data[0];
}

async function loadUserPreferences() {
  try {
    await fetchUser();
    await fetchUserProfile();

    if (userProfile.value?.view_mode) {
      viewMode.value = userProfile.value.view_mode;
    } else {
      viewMode.value = 'cards';
    }

    await fetchSoftware();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading user preferences or software:', error);
    await fetchSoftware();
  }
}

////////////////////////////////
// WATCHER
////////////////////////////////

watch(perPage, fetchSoftware);
watch(search, async (newSearch) => {
  if (newSearch === null) {
    search.value = '';
    await fetchSoftware();
  }
});
watch(filters, () => fetchSoftware());

////////////////////////////////
// ONMOUNTED
////////////////////////////////

onMounted(async () => {
  await loadUserPreferences();
  window.addEventListener('resize', updateIsDesktop);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIsDesktop);
});
</script>

<template>
  <v-main>
    <v-container fluid>
      <v-row>
        <!-- Drawer Mobile -->
        <v-navigation-drawer
          v-model="showFiltersMobile"
          location="left"
          temporary
          class="d-md-none"
        >
          <v-sheet color="grey-lighten-4" class="pa-4">
            <div class="d-flex justify-space-between align-center mb-2">
              <h3 class="text-subtitle-1 mb-2">Filters</h3>
              <v-chip v-if="count > 0" class="me-1 my-1 mx-2">{{ count }}</v-chip>
            </div>
            <v-select
              v-model="filters"
              :items="['all', 'acquisition', 'analysis', 'acquisition and analysis']"
              label="Filter by Software Type"
              density="compact"
              hide-details
            />
          </v-sheet>
        </v-navigation-drawer>

        <!-- Sidebar desktop (panel filtre) -->
        <v-sheet v-if="showFiltersDesktop && isDesktop" class="filter-overlay" elevation="8">
          <v-btn
            icon="mdi-close"
            @click="showFiltersDesktop = false"
            variant="text"
            aria-label="Close filter panel"
          />
          <h3>Filters</h3>
          <v-select
            v-model="filters"
            :items="['all', 'acquisition', 'analysis', 'acquisition and analysis']"
            label="Filter by Software Type"
            density="comfortable"
            variant="outlined"
          />
        </v-sheet>

        <!-- Main Content -->
        <v-col :cols="12">
          <v-card variant="flat" class="mx-auto" max-width="1000">
            <div class="d-flex align-center mt-1 mb-4">
              <h1><MonitorCog /> Software</h1>
              <v-chip v-if="count > 0" class="me-1 my-1 mx-2">{{ count }}</v-chip>
            </div>

            <v-toolbar rounded="lg" class="px-2 border-sm mb-4">
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
              />
              <v-spacer></v-spacer>

              <v-btn
                icon
                variant="text"
                @click="viewMode = viewMode === 'cards' ? 'table' : 'cards'"
                :title="viewMode === 'cards' ? 'Switch to Table View' : 'Switch to Card View'"
                class="me-2"
              >
                <v-icon>
                  {{ viewMode === 'cards' ? 'mdi-table' : 'mdi-view-module' }}
                </v-icon>
              </v-btn>

              <v-select
                v-model="perPage"
                :items="[10, 20, 50, 100]"
                density="compact"
                variant="outlined"
                style="max-width: 100px; font-size: 12px"
                attach="body"
                hide-details
              />

              <v-btn
                icon="mdi-filter-variant"
                @click="
                  isDesktop
                    ? (showFiltersDesktop = !showFiltersDesktop)
                    : (showFiltersMobile = true)
                "
                variant="text"
              />
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

            <!-- Table View -->
            <v-data-table
              v-if="viewMode === 'table'"
              :items="softwareList"
              :headers="[
                { title: 'Name', value: 'name' },
                { title: 'Type', value: 'type' },
                { title: 'Made by', value: 'made_by' },
                { title: 'References', value: 'references' },
                { title: 'Contact', value: 'users' },
              ]"
              :items-per-page="perPage"
              class="elevation-1 mt-5"
              :loading="!dataLoaded"
              loading-text="Loading..."
              density="comfortable"
            >
              <!-- Name with tooltip -->
              <template #item.name="{ item }">
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <span
                      v-bind="props"
                      class="text-truncate"
                      style="max-width: 250px; display: inline-block; cursor: help"
                    >
                      {{ item.name }}
                    </span>
                  </template>
                  <span style="max-width: 70vw; display: inline-block; white-space: normal">{{
                    item.description
                  }}</span>
                </v-tooltip>
              </template>

              <!-- Made by with ellipsis + tooltip -->
              <template #item.made_by="{ item }">
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <span
                      v-bind="props"
                      style="
                        max-width: 300px;
                        display: inline-block;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        cursor: help;
                      "
                    >
                      {{ item.made_by }}
                    </span>
                  </template>
                  <span>{{ item.made_by }}</span>
                </v-tooltip>
              </template>
              <!-- References with tooltip and ellipsis -->
              <template #item.references="{ item }">
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <span
                      v-bind="props"
                      style="
                        max-width: 250px;
                        display: inline-block;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        cursor: help;
                      "
                    >
                      <template v-if="item.references && item.references.length">
                        {{ item.references.map((ref) => ref.url).join(', ') }}
                      </template>
                      <template v-else>-</template>
                    </span>
                  </template>
                  <span>
                    <template v-if="item.references && item.references.length">
                      {{ item.references.map((ref) => ref.url).join(', ') }}
                    </template>
                    <template v-else>-</template>
                  </span>
                </v-tooltip>
              </template>

              <!-- Contact with tooltip and ellipsis -->
              <template #item.users="{ item }">
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <span
                      v-bind="props"
                      style="
                        max-width: 250px;
                        display: inline-block;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        cursor: help;
                      "
                    >
                      <template v-if="item.users && item.users.length">
                        {{ item.users.map((u) => u.email_user).join(', ') }}
                      </template>
                      <template v-else>-</template>
                    </span>
                  </template>
                  <span>
                    <template v-if="item.users && item.users.length">
                      {{ item.users.map((u) => u.email_user).join(', ') }}
                    </template>
                    <template v-else>-</template>
                  </span>
                </v-tooltip>
              </template>
            </v-data-table>

            <!-- Cards View -->
            <v-data-iterator v-else class="mt-5" :items="softwareList" :items-per-page="perPage">
              <template v-slot:default="{ items }">
                <v-container class="pa-2" fluid>
                  <v-card
                    class="mt-5 border-sm"
                    style="position: relative"
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
                      style="
                        position: absolute;
                        top: 12px;
                        right: 12px;
                        background-color: red;
                        color: white;
                      "
                      label
                    >
                      {{ software.type }}
                    </v-chip>
                    <v-card-item class="bg-surface-light pt-4">
                      <v-label class="mr-2"></v-label>{{ software.description }}<br />
                    </v-card-item>

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
                :disabled="currentPage == 1"
                icon="mdi-skip-backward"
                density="comfortable"
                variant="tonal"
                rounded
                @click="fetchSoftware(firstPageUrl)"
              ></v-btn>
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
              <v-btn
                :disabled="currentPage == Math.ceil(count / perPage)"
                icon="mdi-skip-forward"
                density="comfortable"
                variant="tonal"
                rounded
                @click="fetchSoftware(lastPageUrl)"
              ></v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<style scoped>
.filter-overlay {
  position: fixed;
  top: 80px;
  left: 20px;
  width: 320px;
  max-height: calc(100vh - 100px);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 24px 24px 32px;
  z-index: 1500;
  overflow-y: auto;
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

.filter-overlay .v-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  color: #666;
  transition: color 0.2s ease;
}

.filter-overlay .v-btn:hover {
  color: #d32f2f;
}

.filter-overlay h3 {
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  user-select: none;
}

.filter-overlay .v-select {
  --v-theme-primary: #d32f2f;
  margin-top: 0 !important;
}

.hover-effect:hover {
  transform: scale(1.05);
  background-color: #f7e2e2;
  transition:
    background-color 0.3s ease,
    transform 0.3s ease;
}

a {
  text-decoration: none;
  color: rgba(198, 40, 40, 0.9);
}

.doi:hover {
  text-decoration: underline;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

::v-deep(.v-data-table-footer) {
  display: none !important;
}
</style>
