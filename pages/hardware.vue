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
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { MicVocal, Speaker, BoomBox, Microchip } from 'lucide-vue-next';

////////////////////////////
// DATA
////////////////////////////

const hardware = ref([]);
const dataLoaded = ref(false);
const page = ref(1);
const search = ref('');

////////////////////////////
// METHODS
////////////////////////////
const getHardware = async () => {
  try {
    const response = await axios.get('http://127.0.0.1:8000/api/hardware');
    hardware.value = response.data;
    dataLoaded.value = true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(error));
  }
};

//////////////////////////////
// ON MOUNTED
//////////////////////////////
// Fetch hardware when the component is mounted
onMounted(() => {
  getHardware();
});
</script>

<template>
  <v-main>
    <v-container>
      <h1><v-icon icon="mdi-microphone"></v-icon> Hardware to record ultrasonic vocalizations</h1>
      <v-card class="mt-5" color="grey-lighten-4">
        <v-card-text>
          In this section, you will find a non-exhaustive list of commercial and custom-made
          hardware (arranged in alphabetical order) to record ultrasonic vocalization files.
          <strong>mouseTube</strong> is not a seller. Information about the hardware is an important
          metadata.
        </v-card-text>
      </v-card>

      <v-skeleton-loader class="mt-5" type="card" v-if="dataLoaded == false"> </v-skeleton-loader>

      <v-data-iterator v-else class="mt-5" :items="hardware" :items-per-page="15" :search="search">
        <template v-slot:header>
          <v-toolbar class="px-2">
            <v-text-field
              v-model="search"
              clearable
              density="comfortable"
              hide-details
              placeholder="Search"
              prepend-inner-icon="mdi-magnify"
              style="max-width: 300px"
              variant="solo"
            ></v-text-field>
          </v-toolbar>
        </template>

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
                <span>{{ hard.raw.type.charAt(0).toUpperCase() + hard.raw.type.slice(1) }}</span>
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

        <template v-slot:footer="{ page, pageCount, prevPage, nextPage }">
          <div class="d-flex align-center justify-center pa-4">
            <v-btn
              :disabled="page === 1"
              icon="mdi-arrow-left"
              density="comfortable"
              variant="tonal"
              rounded
              @click="prevPage"
            ></v-btn>

            <div class="mx-2 text-caption">Page {{ page }} of {{ pageCount }}</div>

            <v-btn
              :disabled="page >= pageCount"
              icon="mdi-arrow-right"
              density="comfortable"
              variant="tonal"
              rounded
              @click="nextPage"
            ></v-btn>
          </div>
        </template>
      </v-data-iterator>
    </v-container>
  </v-main>
</template>

<style scoped>
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
</style>
