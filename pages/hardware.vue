<!--
Created by Nicolas Torquet at 02/07/2024
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->

<script setup>
////////////////////////////
// IMPORT
////////////////////////////
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import debounce from 'lodash/debounce.js';
import { Mic, MicVocal, Speaker, BoomBox, Microchip } from 'lucide-vue-next';
import { useAuth } from '@/composables/useAuth';
import { useRouter } from 'vue-router';
import HardwareModal from '@/components/modals/HardwareModal.vue';

const { currentUser, token, id_user, fetchUser } = useAuth();
////////////////////////////
// DATA
////////////////////////////

const hardwareList = ref([]);
const dataLoaded = ref(false);
const next = ref(null);
const previous = ref(null);
const count = ref(0);
const currentPage = ref(1);
const perPage = ref(10);
const showFilters = ref(false);
const filters = ref(['all']);
const apiBaseUrl = useApiBaseUrl();
const search = ref('');
const viewMode = ref('cards');
const showFiltersMobile = ref(false);
const showFiltersDesktop = ref(false);
const isDesktop = ref(window.innerWidth >= 960);
const userProfile = ref(null);
const router = useRouter();
const showHardwareModal = ref(false);
const newHardwareFromHardware = ref(false);

////////////////////////////
// METHODS
////////////////////////////

function openHardwareModal() {
  newHardwareFromHardware.value = true;
  showHardwareModal.value = true;
}

function onHardwareSaved(hardwareId) {
  showHardwareModal.value = false;

  if (newHardwareFromHardware.value) {
    router.push({ path: '/account/details', query: { tab: 'hardware' } });
    newHardwareFromHardware.value = false;
  }
}

function updateIsDesktop() {
  isDesktop.value = window.innerWidth >= 960;
  if (!isDesktop.value) {
    showFiltersDesktop.value = false;
  }
}

/**
 * Fetch hardware data from the API
 * @param {string} url - The URL to fetch hardware data from
 */
const fetchHardware = async (
  url = `${apiBaseUrl}/hardware/?page_size=${perPage.value}&filter=${encodeURIComponent(filters.value)}`
) => {
  dataLoaded.value = false;
  try {
    const response = await axios.get(url);
    hardwareList.value = response.data.results;
    next.value = response.data.next;
    previous.value = response.data.previous;
    count.value = response.data.count;
    currentPage.value = new URL(url).searchParams.get('page') || 1;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('error while loading hardware :', error);
  } finally {
    dataLoaded.value = true;
  }
};

/**
 * Debounced search function
 * @param {string} searchTerm - The search term to filter hardware
 */
const onSearch = debounce(() => {
  fetchHardware(
    `${apiBaseUrl}/hardware/?search=${encodeURIComponent(search.value)}&page_size=${perPage.value}&filter=${encodeURIComponent(filters.value)}`
  );
}, 600);

const lastPage = computed(() => Math.ceil(count.value / perPage.value));

const lastPageUrl = computed(() => {
  return `${apiBaseUrl}/hardware/?page=${lastPage.value}&page_size=${perPage.value}&filter=${encodeURIComponent(filters.value)}`;
});

const firstPageUrl = computed(() => {
  return `${apiBaseUrl}/hardware/?page=1&page_size=${perPage.value}&filter=${encodeURIComponent(filters.value)}`;
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

    await fetchHardware();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading user preferences or software:', error);
    await fetchHardware();
  }
}

////////////////////////////////
// WATCHER
////////////////////////////////

watch(perPage, async () => {
  await fetchHardware();
});

watch(search, async (newSearch) => {
  if (newSearch === null) {
    search.value = '';
    await fetchHardware();
  }
});

// Watch filters value and trigger fetchHardware
watch(filters, () => {
  fetchHardware();
});

//////////////////////////////
// ON MOUNTED
//////////////////////////////
// Fetch hardware when the component is mounted
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
              :items="['all', 'microphone', 'soundcard', 'speaker', 'amplifier']"
              label="Filter by Hardware Type"
              dense
              hide-details
              class="py-0"
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
            :items="['all', 'microphone', 'soundcard', 'speaker', 'amplifier']"
            label="Filter by Hardware Type"
            dense
            hide-details
            class="py-0"
          />
        </v-sheet>
        <v-col>
          <v-card variant="flat" class="mx-auto" max-width="1000">
            <div class="d-flex align-center justify-space-between mt-1 mb-4">
              <div class="d-flex align-center">
                <h1><Mic /> Hardware</h1>
                <v-chip v-if="count > 0" class="me-1 my-1 mx-2">
                  {{ count }}
                </v-chip>
              </div>
              <div v-if="currentUser">
                <v-btn
                  variant="outlined"
                  size="small"
                  class="nav-icon audio-hover-icon"
                  @click="openHardwareModal"
                >
                  <Plus size="20" class="nav-icon audio-hover-icon" />
                  Add
                </v-btn>
              </div>
            </div>
            <v-card class="mt-5 mb-5" color="grey-lighten-4">
              <v-card-text>
                In this section, you will find a non-exhaustive list of commercial and custom-made
                hardware (arranged in alphabetical order) to record ultrasonic vocalization files.
                <strong>mouseTube</strong> is not a seller. Information about the hardware is an
                important metadata.
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
                :menu-props="{ contentClass: 'select-dropdown-zfix' }"
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
                  <h3>No hardware available</h3>
                  <p>Try to change the search term or remove the filters.</p>
                </v-col>
              </v-row>
            </v-alert>

            <!-- Table View -->
            <v-data-table
              v-if="viewMode === 'table'"
              :items="hardwareList"
              :headers="[
                { title: 'Name', value: 'name' },
                { title: 'Type', value: 'type' },
                { title: 'Made by', value: 'made_by' },
                { title: 'References', value: 'references' },
              ]"
              :items-per-page="perPage"
              class="elevation-1 mt-5"
              :loading="!dataLoaded"
              loading-text="Loading..."
              density="comfortable"
              hide-default-footer
            >
              <!-- Name -->
              <template #item.name="{ item }">
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <span
                      v-bind="props"
                      class="text-truncate"
                      style="max-width: 300px; display: inline-block; cursor: help"
                    >
                      {{ item.name }}
                    </span>
                  </template>
                  <span>{{ item.description }}</span>
                </v-tooltip>
              </template>

              <!-- Made by -->
              <template #item.made_by="{ item }">
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <span
                      v-bind="props"
                      style="
                        max-width: 200px;
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

              <!-- References -->
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
            </v-data-table>

            <v-data-iterator v-else class="mt-5" :items="hardwareList" :items-per-page="perPage">
              <template v-slot:default="{ items }">
                <v-container class="pa-2" fluid>
                  <v-card
                    class="mt-5 border-sm"
                    v-bind="hard"
                    v-for="hard in items"
                    :key="hard.raw.name"
                    elevated
                  >
                    <v-tooltip location="right">
                      <template #activator="{ props }">
                        <div
                          v-if="hard.raw.type"
                          v-bind="props"
                          style="
                            position: absolute;
                            top: 12px;
                            right: 16px;
                            width: 36px;
                            height: 36px;
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
                          <MicVocal
                            v-if="hard.raw.type === 'microphone'"
                            class="w-100 h-100"
                            style="width: 100%; height: 100%; object-fit: contain"
                          />
                          <Speaker
                            v-else-if="hard.raw.type === 'speaker'"
                            class="w-100 h-100"
                            style="width: 100%; height: 100%; object-fit: contain"
                          />
                          <BoomBox
                            v-else-if="hard.raw.type === 'amplifier'"
                            class="w-100 h-100"
                            style="width: 100%; height: 100%; object-fit: contain"
                          />
                          <Microchip
                            v-else-if="hard.raw.type === 'soundcard'"
                            class="w-100 h-100"
                            style="width: 100%; height: 100%; object-fit: contain"
                          />
                        </div>
                      </template>
                      <span>{{
                        hard.raw.type.charAt(0).toUpperCase() + hard.raw.type.slice(1)
                      }}</span>
                    </v-tooltip>
                    <v-card-title>{{ hard.raw.name }}</v-card-title>
                    <v-card-subtitle v-if="hard.raw.made_by"
                      >made by {{ hard.raw.made_by }}</v-card-subtitle
                    >
                    <v-card-item>
                      {{ hard.raw.description }}
                    </v-card-item>

                    <v-divider
                      v-if="hard.raw.references && hard.raw.references.length > 0"
                      class="mx-4 mt-2 mb-1"
                    ></v-divider>
                    <v-card-actions v-if="hard.raw.references && hard.raw.references.length > 0">
                      <v-btn
                        color="rgba(198, 40, 40, 0.9)"
                        v-for="ref in hard.raw.references"
                        prepend-icon="mdi-link-variant"
                      >
                        <a :href="ref.url" target="_blank"> {{ ref.name }}</a>
                      </v-btn>
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
                @click="fetchHardware(firstPageUrl)"
              ></v-btn>
              <v-btn
                :disabled="!previous"
                icon="mdi-arrow-left"
                density="comfortable"
                variant="tonal"
                rounded
                @click="fetchHardware(previous)"
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
                @click="fetchHardware(next)"
              ></v-btn>
              <v-btn
                :disabled="currentPage == Math.ceil(count / perPage)"
                icon="mdi-skip-forward"
                density="comfortable"
                variant="tonal"
                rounded
                @click="fetchHardware(lastPageUrl)"
              ></v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
  <HardwareModal v-model="showHardwareModal" @saved="onHardwareSaved" />
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
.nuxt-link {
  color: white;
  text-decoration: None;
}

.nuxt-link:hover {
  text-decoration: underline;
}

a {
  text-decoration: none;
  color: rgba(198, 40, 40, 0.9);
}

a:hover {
  text-decoration: underline;
}

::v-deep(.v-data-table-footer) {
  display: none !important;
}
</style>
