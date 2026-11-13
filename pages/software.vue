<script setup>
////////////////////////////////
// IMPORT
////////////////////////////////
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';
import debounce from 'lodash-es/debounce';
import { MonitorCog } from '@lucide/vue';
import { useAuth } from '@/composables/useAuth';
import { useRouter } from 'vue-router';
import ListFilters from '@/components/ListFilters.vue';
import ActiveFilters from '@/components/ActiveFilters.vue';
import SoftwareModal from '@/components/modals/SoftwareModal.vue';

const { currentUser, token, id_user, fetchUser } = useAuth();

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
const emptyFilters = () => ({
  type: [],
  used: false,
  documented: false,
  favorites: false,
  mine: false,
});
const filters = ref(emptyFilters());
const activeFilters = ref(null);
const apiBaseUrl = useApiBaseUrl();
const viewMode = ref('cards');
const userProfile = ref(null);
const router = useRouter();
const showSoftwareModal = ref(false);
const newSoftwareFromSoftware = ref(false);

////////////////////////////////
// METHODS
////////////////////////////////

function openSoftwareModal() {
  newSoftwareFromSoftware.value = true;
  showSoftwareModal.value = true;
}

function onSoftwareSaved(softwareId) {
  showSoftwareModal.value = false;

  if (newSoftwareFromSoftware.value) {
    router.push({ path: '/account/details', query: { tab: 'software' } });
    newSoftwareFromSoftware.value = false;
  }
}

/** The URL of the list for the search, the filters and a page (the first one by default). */
const buildUrl = (page = 1) => {
  const params = new URLSearchParams({ page_size: perPage.value, page });
  if (search.value) params.set('search', search.value);
  if (filters.value.type.length) params.set('type', filters.value.type.join(','));
  for (const name of ['used', 'documented', 'favorites', 'mine']) {
    if (filters.value[name]) params.set(name, '1');
  }
  // the list shows what was validated; "my entries" also shows the drafts of the user
  if (!filters.value.mine) params.set('status', 'validated');
  return `${apiBaseUrl}/software/?${params}`;
};

const resetFilters = () => {
  filters.value = emptyFilters();
};
const filterToggles = computed(() => [
  { key: 'used', label: 'Used in vocalizations', default: false },
  { key: 'documented', label: 'With documentation', default: false },
  ...(currentUser.value
    ? [
        { key: 'favorites', label: 'My favorites', default: false },
        { key: 'mine', label: 'My entries (with drafts)', default: false },
      ]
    : []),
]);
const filterGroups = [
  {
    key: 'type',
    title: 'Type',
    icon: 'mdi-shape-outline',
    options: ['acquisition', 'analysis', 'acquisition and analysis'],
  },
];

const fetchSoftware = async (url = buildUrl()) => {
  dataLoaded.value = false;
  try {
    // signed in: the server also knows who asks (favorites, own entries)
    const response = await axios.get(
      url,
      token.value ? { headers: { Authorization: `Bearer ${token.value}` } } : {}
    );
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
  fetchSoftware(buildUrl());
}, 600);

const lastPage = computed(() => Math.ceil(count.value / perPage.value));
const lastPageUrl = computed(() => buildUrl(lastPage.value));
const firstPageUrl = computed(() => buildUrl(1));

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

////////////////////////////////
// ONMOUNTED
////////////////////////////////

watch(filters, () => fetchSoftware(), { deep: true });

onMounted(async () => {
  await loadUserPreferences();
});

// One color per kind of software, so the type reads at a glance.
const typeColor = (type) =>
  ({ acquisition: 'blue', analysis: 'red', 'acquisition and analysis': 'orange' })[type] ||
  'grey-darken-3';
</script>

<template>
  <v-main>
    <v-container fluid>
      <v-row>
        <!-- Filters -->
        <v-navigation-drawer v-model="showFilters" location="left" temporary width="360">
          <ListFilters
            v-model="filters"
            :groups="filterGroups"
            :toggles="filterToggles"
            noun="software"
            :total="count"
            @reset="resetFilters"
            @close="showFilters = false"
          />
        </v-navigation-drawer>

        <!-- Main Content -->
        <v-col :cols="12">
          <v-card variant="flat" class="mx-auto" max-width="1000">
            <div class="d-flex align-center justify-space-between mt-1 mb-4">
              <div class="d-flex align-center">
                <h1><MonitorCog /> Software</h1>
                <v-chip v-if="count > 0" class="ms-2">{{ count }}</v-chip>
              </div>
              <div v-if="currentUser">
                <v-btn
                  variant="outlined"
                  size="small"
                  class="nav-icon audio-hover-icon"
                  @click="openSoftwareModal"
                >
                  <v-icon class="me-1">mdi-plus</v-icon>
                  Add
                </v-btn>
              </div>
            </div>

            <v-card class="mt-5 mb-5" color="grey-lighten-4">
              <v-card-text>
                A non-exhaustive list of software used to record or analyse ultrasonic vocalization
                files. <strong>mouseTube</strong> does not distribute them: each entry gives its
                maker and references to its documentation. Information about the software is an
                important metadata.
              </v-card-text>
            </v-card>
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
              <ActiveFilters
                ref="activeFilters"
                v-model="filters"
                :groups="filterGroups"
                :toggles="filterToggles"
                @reset="resetFilters"
              />

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

              <v-badge
                :content="activeFilters?.total"
                :model-value="!!activeFilters?.total"
                color="primary"
                offset-x="6"
                offset-y="6"
                class="me-2"
              >
                <v-btn
                  icon="mdi-filter-variant"
                  variant="text"
                  aria-label="Filters"
                  @click="showFilters = !showFilters"
                />
              </v-badge>
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
                { title: 'Contact', value: 'contacts' },
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
              <template #item.contacts="{ item }">
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
                      <template v-if="item.contacts && item.contacts.length">
                        {{ item.contacts.map((u) => u.email).join(', ') }}
                      </template>
                      <template v-else>-</template>
                    </span>
                  </template>
                  <span>
                    <template v-if="item.contacts && item.contacts.length">
                      {{ item.contacts.map((u) => u.email).join(', ') }}
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
                      class="type-chip"
                      label
                      size="small"
                      variant="tonal"
                      :color="typeColor(software.type)"
                      style="position: absolute; top: 12px; right: 12px"
                    >
                      {{ software.type }}
                    </v-chip>
                    <v-card-item v-if="software.description" class="bg-surface-light pt-4">
                      {{ software.description }}
                    </v-card-item>

                    <v-expansion-panels>
                      <v-expansion-panel title="References">
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

                    <v-card-actions
                      v-if="software.contacts && software.contacts.length"
                      class="pl-4"
                    >
                      <div class="d-flex flex-wrap align-center ga-4">
                        <div
                          v-for="contact in software.contacts"
                          :key="contact.id"
                          class="d-flex align-center"
                          style="white-space: nowrap"
                        >
                          <a
                            :href="`mailto:${contact.email}`"
                            class="d-flex align-center text-decoration-none"
                          >
                            <v-icon size="18" class="me-1" icon="mdi-email" />
                            <span>{{
                              contact.last_name
                                ? `${contact.first_name} ${contact.last_name}`
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
                variant="outlined"
                rounded
                @click="fetchSoftware(firstPageUrl)"
              ></v-btn>
              <v-btn
                :disabled="!previous"
                icon="mdi-arrow-left"
                density="comfortable"
                variant="outlined"
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
                variant="outlined"
                rounded
                @click="fetchSoftware(next)"
              ></v-btn>
              <v-btn
                :disabled="currentPage == Math.ceil(count / perPage)"
                icon="mdi-skip-forward"
                density="comfortable"
                variant="outlined"
                rounded
                @click="fetchSoftware(lastPageUrl)"
              ></v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
  <SoftwareModal v-model="showSoftwareModal" @saved="onSoftwareSaved" />
</template>

<style scoped>
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
