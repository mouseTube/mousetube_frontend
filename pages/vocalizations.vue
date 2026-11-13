<!--
Created by Nicolas Torquet at 10/01/2025
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

import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';
import debounce from 'lodash-es/debounce';
import { AudioLines } from '@lucide/vue';
import { useAuth } from '@/composables/useAuth';
import { useRouter } from 'vue-router';
import ListFilters from '@/components/ListFilters.vue';
import ActiveFilters from '@/components/ActiveFilters.vue';

const { currentUser, token, id_user, fetchUser } = useAuth();

////////////////////////////////
// DATA
////////////////////////////////

const dataLoaded = ref(false);
const search = ref('');
const files = ref([]);
const next = ref(null);
const previous = ref(null);
const count = ref(0);
const currentPage = ref(1);
const perPage = ref(10);
const emptyFilters = () => ({
  valid_link: true,
  species: [],
  sex: [],
  age: [],
  file_format: [],
  repository: [],
});
const filters = ref(emptyFilters());
const filterOptions = ref({ species: [], sex: [], age: [], format: [], repository: [] });
const showFilters = ref(false);
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));
const viewMode = ref('cards');
const userProfile = ref(null);
const router = useRouter();

////////////////////////////////
// METHODS
////////////////////////////////

/** The URL of the list for the search, the filters and a page (the first one by default). */
const buildUrl = (page = 1) => {
  const params = new URLSearchParams({ page_size: perPage.value, page });
  if (search.value) params.set('search', search.value);
  if (filters.value.valid_link) params.set('filter', 'is_valid_link');
  for (const [name, values] of Object.entries(filters.value)) {
    if (Array.isArray(values) && values.length) params.set(name, values.join(','));
  }
  return `${apiBaseUrl}/file/?${params}`;
};

const resetFilters = () => {
  filters.value = emptyFilters();
};
const filterToggles = [
  {
    key: 'valid_link',
    label: 'Only files that can be downloaded',
    chip: 'Including files without a download link',
    default: true,
  },
];
const filterGroups = computed(() => [
  {
    key: 'species',
    title: 'Species',
    icon: 'mdi-paw',
    options: filterOptions.value.species,
    labels: { 'Mus musculus': 'Mouse', 'Rattus norvegicus': 'Rat' },
  },
  { key: 'sex', title: 'Sex', icon: 'mdi-gender-male-female', options: filterOptions.value.sex },
  {
    key: 'age',
    title: 'Age',
    icon: 'mdi-timeline-clock-outline',
    options: filterOptions.value.age,
  },
  {
    key: 'file_format',
    title: 'File format',
    icon: 'mdi-file-music-outline',
    options: filterOptions.value.format,
  },
  {
    key: 'repository',
    title: 'Repository',
    icon: 'mdi-database-outline',
    options: filterOptions.value.repository,
  },
]);
const activeFilters = ref(null);

async function fetchFilterOptions() {
  try {
    filterOptions.value = (await axios.get(`${apiBaseUrl}/file/filters/`)).data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('error while loading the filter options :', error);
  }
}

/**
 * Fetch files from the API
 * @param {string} url - The URL to fetch data from
 */
const fetchFiles = async (url = buildUrl()) => {
  dataLoaded.value = false;
  try {
    const response = await axios.get(url);
    files.value = response.data.results;
    next.value = response.data.next;
    previous.value = response.data.previous;
    count.value = response.data.count;
    currentPage.value = new URL(url).searchParams.get('page') || 1;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('error while loading files :', error);
  } finally {
    dataLoaded.value = true;
  }
};

/**
 * Debounced search function
 * @param {string} searchTerm - The search term to filter files
 */
const onSearch = debounce(() => {
  fetchFiles(buildUrl());
}, 600);

const incrementDownloads = async (fileId, fileLink) => {
  try {
    // open to visitors too; the server counts a visitor once per file and hour
    const { data } = await axios.post(`${apiBaseUrl}/file/${fileId}/download/`);
    const file = files.value.find((f) => f.id === fileId);
    if (file) file.downloads = data.downloads;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating downloads:', error);
  } finally {
    // Always open the file link
    window.open(fileLink, '_blank');
  }
};

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

    await fetchFiles();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading user preferences or software:', error);
    await fetchFiles();
  }
}

////////////////////////////////
// WATCHER
////////////////////////////////

watch(perPage, async () => {
  await fetchFiles();
});

watch(
  filters,
  async () => {
    await fetchFiles();
  },
  { deep: true }
);

watch(search, async (newSearch) => {
  if (newSearch === null) {
    search.value = '';
    await fetchFiles();
  }
});

////////////////////////////////
// ONMOUNTED
////////////////////////////////

onMounted(async () => {
  fetchFilterOptions();
  await loadUserPreferences();
});

// Ontology terms attached to a file: the animals (sex, stage, treatment) and the session
// (behaviors recorded), each linking to its definition.
const termsOf = (file) => {
  const terms = [];
  const add = (kind, term) => {
    if (term?.curie && !terms.some((t) => t.term.curie === term.curie)) terms.push({ kind, term });
  };
  for (const subject of file.subjects || []) {
    const profile = subject.animal_profile;
    add('Species', profile?.strain?.species?.ontology_term);
    add('Sex', profile?.sex_term);
    add('Stage', profile?.age_term);
    add('Treatment', profile?.treatment_term);
  }
  for (const profile of file.recording_session?.animal_profiles || []) {
    add('Species', profile.strain?.species?.ontology_term);
    add('Sex', profile.sex_term);
    add('Stage', profile.age_term);
    add('Treatment', profile.treatment_term);
  }
  for (const term of file.recording_session?.behavior_terms || []) add('Behavior', term);
  return terms;
};

// Readable summary of a file: label above value, real units, a human date.
const formatDate = (value) => {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d)
    ? d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'N/A';
};
const formatRate = (hz) =>
  hz ? (hz >= 1000 ? `${+(hz / 1000).toFixed(1)} kHz` : `${hz} Hz`) : 'N/A';
const facts = (file) => {
  const session = file.recording_session || {};
  const profiles = (file.subjects || [])
    .filter((s) => s.animal_profile)
    .map((s) => s.animal_profile.name);
  const animals = profiles.length ? profiles : (session.animal_profiles || []).map((p) => p.name);
  return [
    { label: 'Protocol', value: session.protocol?.name || 'N/A', chip: 'teal' },
    { label: 'Animal profile', value: animals.join(', ') || 'N/A', chip: 'red' },
    { label: 'Duration', value: file.duration ? `${file.duration} s` : 'N/A' },
    { label: 'Date', value: formatDate(session.date) },
    { label: 'Format', value: file.format || 'N/A' },
    { label: 'Sampling rate', value: formatRate(file.sampling_rate) },
    { label: 'Bit depth', value: file.bit_depth ? `${file.bit_depth} bits` : 'N/A' },
  ];
};
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
            noun="vocalization(s)"
            :total="count"
            @reset="resetFilters"
            @close="showFilters = false"
          />
        </v-navigation-drawer>
        <v-col>
          <v-card variant="flat" class="mx-auto" max-width="1000">
            <div class="d-flex align-center justify-space-between mt-1 mb-4">
              <div class="d-flex align-center">
                <h1><AudioLines /> Vocalizations</h1>
                <v-chip v-if="count > 0" class="ms-2">{{ count }}</v-chip>
              </div>
              <div v-if="currentUser">
                <v-btn
                  variant="outlined"
                  size="small"
                  class="nav-icon audio-hover-icon"
                  @click="router.push('/vocalization/create')"
                >
                  <v-icon class="me-1">mdi-plus</v-icon>
                  Add
                </v-btn>
              </div>
            </div>
            <v-card class="mt-5 mb-5" color="grey-lighten-4">
              <v-card-text>
                Recordings of rodent ultrasonic vocalizations shared by the community. Each file
                comes with the context in which it was recorded: protocol, animals, duration, format
                and sampling rate. The files are stored in external repositories such as Zenodo: use
                the DOI or the Download button to get them.
              </v-card-text>
            </v-card>
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
                <v-icon>{{ viewMode === 'cards' ? 'mdi-table' : 'mdi-view-module' }}</v-icon>
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
                  <h3>No data available</h3>
                  <p>Try to change the search term or remove the filters.</p>
                </v-col>
              </v-row>
            </v-alert>
            <v-data-table
              v-if="viewMode === 'table'"
              :items="files"
              :headers="[
                { title: 'Name', value: 'name' },
                { title: 'Author', value: 'author' },
                { title: 'Protocol', value: 'recording_session.protocol.name' },
                { title: 'Date', value: 'recording_session.date' },
                { title: 'Format', value: 'format' },
                { title: 'Duration', value: 'duration' },
                { title: 'Download', value: 'downloads' },
              ]"
              :items-per-page="perPage"
              class="elevation-1 mt-5"
              :loading="!dataLoaded"
              loading-text="Loading..."
              density="comfortable"
              hide-default-footer
              :footer-props="{
                showFirstLastPage: false,
                showCurrentPage: false,
                itemsPerPageOptions: [],
              }"
            >
              <template #item.name="{ item }">
                <span class="font-weight-bold" style="white-space: nowrap">{{
                  item.name || item.link.split('/').pop()
                }}</span>
              </template>

              <!-- Author -->
              <template #item.author="{ item }">
                {{ item.recording_session.created_by?.first_name }}
                {{ item.recording_session.created_by?.last_name }}
              </template>

              <template #item.downloads="{ item }">
                <v-btn
                  v-if="item.is_valid_link"
                  color="red-darken-4"
                  prepend-icon="mdi-download"
                  variant="tonal"
                  elevation="4"
                  class="ma-1 hover-effect border-sm"
                  @click="incrementDownloads(item.id, item.link)"
                >
                  Download
                </v-btn>
                <v-btn
                  v-else
                  color="grey"
                  prepend-icon="mdi-alert-circle"
                  variant="tonal"
                  elevation="4"
                  class="ma-1 border-sm"
                  :href="item.link"
                  target="_blank"
                >
                  Invalid link
                </v-btn>
              </template>
            </v-data-table>

            <!-- Data display -->
            <v-data-iterator v-else class="mt-5" :items="files" :items-per-page="perPage">
              <template v-slot:default="{ items }">
                <v-container class="pa-2" fluid>
                  <v-card
                    class="list-card border-sm"
                    v-for="{ raw: file } in items"
                    :key="file.id"
                    elevated
                  >
                    <div class="card-head">
                      <div class="card-head-text">
                        <v-card-title class="font-weight-bold card-title">
                          {{ file.name ? file.name : file.link.split('/').pop() }}
                        </v-card-title>
                        <v-card-subtitle>
                          {{ file.recording_session.created_by?.first_name || '' }}
                          {{ file.recording_session.created_by?.last_name || '' }}
                        </v-card-subtitle>
                      </div>
                      <!-- fixed layout: the count can grow without moving the logo -->
                      <div class="card-head-side">
                        <span class="downloads-pill" :title="`${file.downloads} downloads`">
                          <v-icon size="14">mdi-download</v-icon>{{ file.downloads }}
                        </span>
                        <span
                          v-if="file.repository && file.repository.logo"
                          class="repo-logo-badge"
                        >
                          <img :src="baseUrl + file.repository.logo" :alt="file.repository.name" />
                        </span>
                      </div>
                    </div>
                    <v-card-item class="bg-surface-light pt-4">
                      <dl class="facts">
                        <div v-for="fact in facts(file)" :key="fact.label" class="fact">
                          <dt>{{ fact.label }}</dt>
                          <dd>
                            <v-chip
                              v-if="fact.chip && fact.value !== 'N/A'"
                              size="small"
                              label
                              variant="tonal"
                              :color="fact.chip"
                              >{{ fact.value }}</v-chip
                            >
                            <template v-else>{{ fact.value }}</template>
                          </dd>
                        </div>
                      </dl>
                    </v-card-item>
                    <v-card-item v-if="termsOf(file).length" class="bg-surface-light pt-0">
                      <div class="terms">
                        <v-chip
                          v-for="item in termsOf(file)"
                          :key="item.term.curie"
                          :href="item.term.iri"
                          :title="item.term.curie"
                          target="_blank"
                          size="small"
                          label
                          variant="outlined"
                          class="me-2 mb-1"
                        >
                          <span class="text-medium-emphasis me-1">{{ item.kind }}</span>
                          {{ item.term.label }}
                        </v-chip>
                      </div>
                    </v-card-item>

                    <!-- Expansion Panel -->
                    <v-expansion-panels>
                      <v-expansion-panel title="More information">
                        <v-expansion-panel-text>
                          <v-card
                            v-if="file.subjects && file.subjects.length"
                            class="mx-auto my-2 pt-2 pl-2"
                            title="Subjects"
                          >
                            <v-card-item>
                              <v-card-text>
                                <template
                                  v-for="(subject, idx) in file.subjects"
                                  :key="subject.id || idx"
                                >
                                  <v-label class="mr-2">Name: </v-label>{{ subject.name }}<br />
                                  <v-label class="mr-2">Animal profile: </v-label
                                  >{{ subject.animal_profile?.name }}<br />
                                  <v-label class="mr-2">Sex: </v-label
                                  >{{ subject.animal_profile?.sex }}<br />
                                  <v-label class="mr-2">Genotype: </v-label
                                  >{{ subject.animal_profile?.genotype }}<br />
                                  <v-label class="mr-2">Treatment: </v-label
                                  >{{ subject.animal_profile?.treatment }}<br />
                                  <v-label class="mr-2">Origin: </v-label>{{ subject.origin }}<br />
                                  <v-label class="mr-2">Cohort: </v-label>{{ subject.cohort }}<br />
                                  <v-divider
                                    class="my-2"
                                    v-if="idx < file.subjects.length - 1"
                                  ></v-divider>
                                </template>
                              </v-card-text>
                            </v-card-item>
                          </v-card>

                          <v-card class="mx-auto my-2 pt-2 pl-2" title="Protocol">
                            <v-card-text>
                              <v-label class="mr-2">Name: </v-label>
                              {{ file.recording_session?.protocol?.name || 'N/A' }}<br />
                              <v-label class="mr-2">Animals sex: </v-label>
                              {{ file.recording_session.protocol?.animals_sex || 'N/A' }}<br />
                              <v-label class="mr-2">Animals age: </v-label>
                              {{ file.recording_session.protocol?.animals_age || 'N/A' }}<br />
                              <v-label class="mr-2">Animals housing: </v-label>
                              {{ file.recording_session.protocol?.animals_housing || 'N/A' }}<br />
                              <v-label class="mr-2">Number of animals: </v-label>
                              {{
                                file.recording_session.protocol?.context_number_of_animals || 'N/A'
                              }}<br />
                              <v-label class="mr-2">Duration: </v-label>
                              {{ file.recording_session.protocol?.context_duration || 'N/A' }}<br />
                              <v-label class="mr-2">Cage: </v-label>
                              {{ file.recording_session.protocol?.context_cage || 'N/A' }}<br />
                              <v-label class="mr-2">Bedding: </v-label>
                              {{ file.recording_session.protocol?.context_bedding || 'N/A' }}<br />
                              <v-label class="mr-2">Light cycle: </v-label>
                              {{ file.recording_session.protocol?.context_light_cycle || 'N/A'
                              }}<br />
                              <v-label class="mr-2">Temperature: </v-label>
                              {{
                                file.recording_session.protocol?.context_temperature_value || 'N/A'
                              }}
                              {{ file.recording_session.protocol?.context_temperature_unit || ''
                              }}<br />
                              <v-label class="mr-2">Brightness: </v-label>
                              {{ file.recording_session.protocol?.context_brightness || 'N/A' }}
                            </v-card-text>
                          </v-card>

                          <v-card class="mx-auto my-2 pt-2 pl-2" title="Recording Session">
                            <v-card-text>
                              <ul class="ml-3 mt-2">
                                <li>
                                  <v-label class="mr-2">Name: </v-label>
                                  {{ file.recording_session.name }}
                                </li>
                                <li>
                                  <v-label class="mr-2">Studies: </v-label>
                                  <span
                                    v-if="
                                      file.recording_session.studies &&
                                      file.recording_session.studies.length
                                    "
                                  >
                                    <span
                                      v-for="(study, idx) in file.recording_session.studies"
                                      :key="study.id"
                                    >
                                      {{ study.name
                                      }}<span v-if="study.made_by"> by {{ study.made_by }}</span
                                      ><span v-if="idx < file.recording_session.studies.length - 1"
                                        >,&nbsp;</span
                                      >
                                    </span>
                                  </span>
                                  <span v-else> N/A </span>
                                </li>
                                <li>
                                  <v-label class="mr-2">Date: </v-label>
                                  {{ file.recording_session.date }}
                                </li>
                                <li>
                                  <v-label class="mr-2">File number: </v-label>{{ file.number }}
                                </li>
                                <li>
                                  <v-label class="mr-2">Temperature: </v-label>
                                  {{ file.recording_session.context_temperature_value }}
                                  {{ file.recording_session.context_temperature_unit }}
                                </li>
                                <li>
                                  <v-label class="mr-2">Soundcards: </v-label>
                                  <span
                                    v-if="
                                      file.recording_session
                                        .equipment_acquisition_hardware_soundcards &&
                                      file.recording_session
                                        .equipment_acquisition_hardware_soundcards.length
                                    "
                                  >
                                    <span
                                      v-for="(sc, idx) in file.recording_session
                                        .equipment_acquisition_hardware_soundcards"
                                      :key="sc.id"
                                    >
                                      {{ sc.name
                                      }}<span v-if="sc.made_by"> by {{ sc.made_by }}</span
                                      ><span
                                        v-if="
                                          idx <
                                          file.recording_session
                                            .equipment_acquisition_hardware_soundcards.length -
                                            1
                                        "
                                        >,&nbsp;</span
                                      >
                                    </span>
                                  </span>
                                  <span v-else> N/A </span>
                                </li>
                                <li>
                                  <v-label class="mr-2">Speakers: </v-label>
                                  <span
                                    v-if="
                                      file.recording_session
                                        .equipment_acquisition_hardware_speakers &&
                                      file.recording_session.equipment_acquisition_hardware_speakers
                                        .length
                                    "
                                  >
                                    <span
                                      v-for="(sp, idx) in file.recording_session
                                        .equipment_acquisition_hardware_speakers"
                                      :key="sp.id"
                                    >
                                      {{ sp.name
                                      }}<span v-if="sp.made_by"> by {{ sp.made_by }}</span
                                      ><span
                                        v-if="
                                          idx <
                                          file.recording_session
                                            .equipment_acquisition_hardware_speakers.length -
                                            1
                                        "
                                        >,&nbsp;</span
                                      >
                                    </span>
                                  </span>
                                  <span v-else> N/A </span>
                                </li>
                                <li>
                                  <v-label class="mr-2">Amplifiers: </v-label>
                                  <span
                                    v-if="
                                      file.recording_session
                                        .equipment_acquisition_hardware_amplifiers &&
                                      file.recording_session
                                        .equipment_acquisition_hardware_amplifiers.length
                                    "
                                  >
                                    <span
                                      v-for="(amp, idx) in file.recording_session
                                        .equipment_acquisition_hardware_amplifiers"
                                      :key="amp.id"
                                    >
                                      {{ amp.name
                                      }}<span v-if="amp.made_by"> by {{ amp.made_by }}</span
                                      ><span
                                        v-if="
                                          idx <
                                          file.recording_session
                                            .equipment_acquisition_hardware_amplifiers.length -
                                            1
                                        "
                                        >,&nbsp;</span
                                      >
                                    </span>
                                  </span>
                                  <span v-else> N/A </span>
                                </li>
                                <li>
                                  <v-label class="mr-2">Microphones: </v-label>
                                  <span
                                    v-if="
                                      file.recording_session
                                        .equipment_acquisition_hardware_microphones &&
                                      file.recording_session
                                        .equipment_acquisition_hardware_microphones.length
                                    "
                                  >
                                    <span
                                      v-for="(mic, idx) in file.recording_session
                                        .equipment_acquisition_hardware_microphones"
                                      :key="mic.id"
                                    >
                                      {{ mic.name
                                      }}<span v-if="mic.made_by"> by {{ mic.made_by }}</span
                                      ><span
                                        v-if="
                                          idx <
                                          file.recording_session
                                            .equipment_acquisition_hardware_microphones.length -
                                            1
                                        "
                                        >,&nbsp;</span
                                      >
                                    </span>
                                  </span>
                                  <span v-else> N/A </span>
                                </li>
                                <li>
                                  <v-label class="mr-2">Laboratory: </v-label>
                                  {{
                                    file.recording_session.laboratory &&
                                    file.recording_session.laboratory.name
                                      ? file.recording_session.laboratory.name
                                      : 'N/A'
                                  }}
                                  {{ file.recording_session.laboratory?.institution || '' }}
                                  {{ file.recording_session.laboratory?.unit || '' }}
                                  {{ file.recording_session.laboratory?.address || '' }}
                                  {{ file.recording_session.laboratory?.country || '' }}
                                  <a
                                    v-if="file.recording_session.laboratory?.organization"
                                    :href="file.recording_session.laboratory.organization.iri"
                                    target="_blank"
                                    rel="noopener"
                                    class="ror-link"
                                    :title="file.recording_session.laboratory.organization.label"
                                    >ROR <v-icon size="12">mdi-open-in-new</v-icon></a
                                  >
                                </li>
                                <li>
                                  <v-label class="mr-2">Animal profiles: </v-label>
                                  {{
                                    file.recording_session.animal_profiles
                                      ? file.recording_session.animal_profiles
                                          .map((profile) => profile.name)
                                          .join(', ')
                                      : 'N/A'
                                  }}
                                </li>
                              </ul>
                            </v-card-text>
                          </v-card>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                    <v-divider class="mx-4"></v-divider>

                    <!-- Actions: DOI and Download -->
                    <v-card-actions class="d-flex align-center">
                      <v-row class="w-100">
                        <v-col class="d-flex align-center" cols="auto">
                          <v-chip class="ma-2" label variant="tonal" color="blue" v-if="file.doi">
                            DOI:
                            <a
                              v-if="file.doi.includes('zenodo')"
                              :href="'https://zenodo.org/record/' + file.doi.split('zenodo.')[1]"
                              target="_blank"
                              class="doi"
                            >
                              {{ file.doi }}
                            </a>
                          </v-chip>
                          <span v-if="file.notes" class="ml-2">
                            <strong class="mr-2">Notes:</strong> {{ file.notes }}
                          </span>
                        </v-col>
                        <v-spacer></v-spacer>
                        <v-col class="d-flex justify-end" cols="auto">
                          <v-btn
                            v-if="file.is_valid_link"
                            color="primary"
                            prepend-icon="mdi-download"
                            variant="flat"
                            elevation="0"
                            class="ma-2 hover-effect border-sm"
                            @click="incrementDownloads(file.id, file.link)"
                          >
                            Download
                          </v-btn>
                          <v-btn
                            v-else
                            color="grey"
                            prepend-icon="mdi-alert-circle"
                            variant="flat"
                            elevation="0"
                            class="ma-2 border-sm"
                          >
                            <a :href="file.link" target="_blank"> Invalid link</a>
                          </v-btn>
                        </v-col>
                      </v-row>
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
                @click="fetchFiles(firstPageUrl)"
              ></v-btn>
              <v-btn
                :disabled="!previous"
                icon="mdi-arrow-left"
                density="comfortable"
                variant="outlined"
                rounded
                @click="fetchFiles(previous)"
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
                @click="fetchFiles(next)"
              ></v-btn>
              <v-btn
                :disabled="currentPage == Math.ceil(count / perPage)"
                icon="mdi-skip-forward"
                density="comfortable"
                variant="outlined"
                rounded
                @click="fetchFiles(lastPageUrl)"
              ></v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<style scoped>
.ror-link {
  margin-left: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  text-decoration: none;
  color: rgb(var(--v-theme-primary));
}
.ror-link:hover {
  text-decoration: underline;
}
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 16px 0 0;
}
.card-head-text {
  min-width: 0;
  flex: 1 1 auto;
}
.card-title {
  white-space: normal;
  overflow-wrap: anywhere;
}
.card-head-side {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
}
.downloads-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fbeaea;
  color: #666;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.repo-logo-badge {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 10px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
}
.repo-logo-badge img {
  display: block;
  height: 26px;
  width: auto;
  max-width: 110px;
  object-fit: contain;
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
  color: rgb(219, 98, 98);
}

.doi {
  color: inherit;
}

.doi:hover {
  text-decoration: underline;
}

li {
  list-style: none;
}

::v-deep(.v-data-table-footer) {
  display: none !important;
}
</style>
