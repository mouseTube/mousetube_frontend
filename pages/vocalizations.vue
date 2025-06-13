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
import { debounce } from 'lodash';
import { AudioLines } from 'lucide-vue-next';

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
const showFilters = ref(false);
const filters = ref(['is_valid_link']);
const apiBaseUrl = useApiBaseUrl();

const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

////////////////////////////////
// METHODS
////////////////////////////////

/**
 * Fetch files from the API
 * @param {string} url - The URL to fetch data from
 */
const fetchFiles = async (
  url = `${apiBaseUrl}/file/?page_size=${perPage.value}&filter=${filters.value.join(',')}`
) => {
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
  fetchFiles(
    `${apiBaseUrl}/file/?search=${encodeURIComponent(search.value)}&page_size=${perPage.value}&filter=${filters.value.join(',')}`
  );
}, 600);

const toggleFilter = (filterName) => {
  const index = filters.value.indexOf(filterName);
  if (index > -1) {
    filters.value.splice(index, 1);
  } else {
    filters.value.push(filterName);
  }
  onSearch();
};

const incrementDownloads = async (fileId, fileLink) => {
  try {
    const response = await axios.patch(`${apiBaseUrl}/file/${fileId}/`, {
      downloads: 'increment',
    });

    if (response.status === 200) {
      const updatedFile = response.data;
      // Update the downloads count in the local files array
      const fileIndex = files.value.findIndex((file) => file.id === fileId);
      if (fileIndex !== -1) {
        files.value[fileIndex].downloads = updatedFile.downloads;
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error updating downloads:', error);
  } finally {
    // Always open the file link
    window.open(fileLink, '_blank');
  }
};

////////////////////////////////
// WATCHER
////////////////////////////////

watch(perPage, async () => {
  await fetchFiles();
});

watch(search, async (newSearch) => {
  if (newSearch === null) {
    search.value = '';
    await fetchFiles();
  }
});

////////////////////////////////
// ONMOUNTED
////////////////////////////////
onMounted(() => fetchFiles());
</script>

<template>
  <v-main>
    <v-container>
      <v-row>
        <v-col>
          <v-card variant="flat" class="mx-auto" max-width="1000">
            <div class="d-flex align-center mt-1 mb-4">
              <h1><AudioLines /> Vocalizations</h1>
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
                      <v-checkbox
                        :model-value="filters.includes('is_valid_link')"
                        @change="() => toggleFilter('is_valid_link')"
                        label="Valid links"
                        density="compact"
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
                  <h3>No data available</h3>
                  <p>Try to change the search term or remove the filters.</p>
                </v-col>
              </v-row>
            </v-alert>
            <!-- Data display -->
            <v-data-iterator v-else class="mt-5" :items="files" :items-per-page="perPage">
              <template v-slot:default="{ items }">
                <v-container class="pa-2" fluid>
                  <v-card
                    class="mt-5 border-sm"
                    v-for="{ raw: file } in items"
                    :key="file.id"
                    elevated
                  >
                    <v-badge
                      :content="file.downloads + ' Downloads'"
                      overlap
                      style="position: absolute; top: 20px; right: 40px"
                      color="red-lighten-5"
                    >
                      <template #badge>
                        <div
                          style="
                            background-color: transparent;
                            font-size: 0.875rem;
                            color: gray;
                            border-radius: 12px;
                          "
                        >
                          <v-icon style="font-size: 0.875rem; color: gray">mdi-download</v-icon>
                          <span style="margin-left: 8px">{{ file.downloads }}</span>
                        </div>
                        <v-avatar
                          v-if="file.repository && file.repository.logo"
                          size="40"
                          class="mt-2"
                          style="
                            background: #fff;
                            border: 1px solid #eee;
                            display: block;
                            position: absolute;
                            top: 25px;
                            right: 0px;
                          "
                        >
                          <img
                            :src="baseUrl + file.repository.logo"
                            :alt="file.repository.name"
                            style="
                              padding: 4px;
                              border-radius: 10px;
                              object-fit: contain;
                              /* or: contain, none, scale-down */
                              object-position: center;
                              width: 100%;
                              height: 100%;
                              transform: scale(1.7);
                            "
                          />
                        </v-avatar>
                      </template>
                    </v-badge>
                    <v-card-title>
                      {{ file.name ? file.name : file.link.split('/').pop() }}
                    </v-card-title>
                    <v-card-subtitle>
                      {{ file.recording_session.protocol.user.first_name_user }}
                      {{ file.recording_session.protocol.user.name_user }}
                    </v-card-subtitle>
                    <v-card-item class="bg-surface-light pt-4">
                      <v-label class="mr-2">Protocol: </v-label>
                      {{ file.recording_session.protocol.name || 'N/A' }}<br />
                      <v-label class="mr-2">Animal profile: </v-label>
                      <span
                        v-if="
                          file.subjects &&
                          file.subjects.length &&
                          file.subjects.some((s) => s.animal_profile)
                        "
                      >
                        {{
                          file.subjects
                            .filter((s) => s.animal_profile)
                            .map((s) => s.animal_profile.name)
                            .join(', ')
                        }}
                      </span>
                      <span
                        v-else-if="
                          file.recording_session.animal_profiles &&
                          file.recording_session.animal_profiles.length
                        "
                      >
                        {{
                          file.recording_session.animal_profiles
                            .map((profile) => profile.name)
                            .join(', ')
                        }}
                      </span>
                      <span v-else> N/A </span><br />
                      <v-label class="mr-2">Duration: </v-label>
                      {{ file.duration || 'N/A' }}<br />
                      <v-label class="mr-2">Date: </v-label>
                      {{ file.recording_session.date || 'N/A' }}<br />
                      <v-label class="mr-2">Format: </v-label>
                      {{ file.format || 'N/A' }}<br />
                      <v-label class="mr-2">Sampling_rate: </v-label>
                      {{ file.sampling_rate || 'N/A' }} Hz<br />
                      <v-label class="mr-2">Bit_depth: </v-label>
                      {{ file.bit_depth || 'N/A' }} bits<br />
                    </v-card-item>

                    <!-- Expansion Panel -->
                    <v-expansion-panels>
                      <v-expansion-panel title="More information" bg-color="grey-lighten-2">
                        <v-expansion-panel-text>
                          <v-card class="mx-auto my-2 pt-2 pl-2" title="Subjects">
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
                              {{ file.recording_session.protocol.name }}<br />
                              <v-label class="mr-2">Description: </v-label>
                              {{ file.recording_session.protocol.description }}<br />
                              <v-label class="mr-2">Animals sex: </v-label>
                              {{ file.recording_session.protocol.animals_sex || 'N/A' }}<br />
                              <v-label class="mr-2">Animals age: </v-label>
                              {{ file.recording_session.protocol.animals_age || 'N/A' }}<br />
                              <v-label class="mr-2">Animals housing: </v-label>
                              {{ file.recording_session.protocol.animals_housing || 'N/A' }}<br />
                              <v-label class="mr-2">Animals species: </v-label>
                              {{ file.recording_session.protocol.animals_species || 'N/A' }}<br />
                              <v-label class="mr-2">Number of animals: </v-label>
                              {{ file.recording_session.protocol.context_number_of_animals || 'N/A'
                              }}<br />
                              <v-label class="mr-2">Duration: </v-label>
                              {{ file.recording_session.protocol.context_duration || 'N/A' }}<br />
                              <v-label class="mr-2">Cage: </v-label>
                              {{ file.recording_session.protocol.context_cage || 'N/A' }}<br />
                              <v-label class="mr-2">Bedding: </v-label>
                              {{ file.recording_session.protocol.context_bedding || 'N/A' }}<br />
                              <v-label class="mr-2">Light cycle: </v-label>
                              {{ file.recording_session.protocol.context_light_cycle || 'N/A'
                              }}<br />
                              <v-label class="mr-2">Temperature: </v-label>
                              {{
                                file.recording_session.protocol.context_temperature_value || 'N/A'
                              }}
                              {{ file.recording_session.protocol.context_temperature_unit || ''
                              }}<br />
                              <v-label class="mr-2">Brightness: </v-label>
                              {{ file.recording_session.protocol.context_brightness || 'N/A' }}
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
                          <v-chip class="ma-2" label color="red-lighten-1" v-if="file.doi">
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
                            color="red-darken-4"
                            prepend-icon="mdi-download"
                            variant="tonal"
                            elevation="4"
                            class="ma-2 hover-effect border-sm"
                            @click="incrementDownloads(file.id, file.link)"
                          >
                            Download
                          </v-btn>
                          <v-btn
                            v-else
                            color="grey"
                            prepend-icon="mdi-alert-circle"
                            variant="tonal"
                            elevation="4"
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
                :disabled="!previous"
                icon="mdi-arrow-left"
                density="comfortable"
                variant="tonal"
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
                variant="tonal"
                rounded
                @click="fetchFiles(next)"
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
  color: rgb(219, 98, 98);
}

.doi:hover {
  text-decoration: underline;
}

li {
  list-style: none;
}
</style>
