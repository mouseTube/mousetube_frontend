<!--
Created by Nicolas Torquet at 02/07/2024
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->

<template>
  <v-main>
    <v-container>
      <h1><v-icon icon="mdi-microphone"></v-icon> Hardware to record ultrasonic vocalisations</h1>
      <v-card  class="mt-5" color="grey-lighten-4">
        <v-card-text>
          In this section, you will find a non-exhaustive list of commercial and custom-made hardware (arranged in alphabetical order)
          to record ultrasonic vocalisation files. <strong>mouseTube</strong> is not a seller. Information about the hardware is an important
          metadata.
        </v-card-text>
      </v-card>

      <v-skeleton-loader class="mt-5" type="card" v-if="dataLoaded==false">
      </v-skeleton-loader>

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
              style="max-width: 300px;"
              variant="solo"
            ></v-text-field>
          </v-toolbar>
        </template>

        <template v-slot:default="{ items }">
          <v-container class="pa-2" fluid>
            <v-card class="mt-5" v-bind="hard" v-for="hard in items" :key="hard.raw.hardware_name">
              <v-card-title class="ml-5">{{ hard.raw.hardware_name }}</v-card-title>
              <v-card-subtitle>{{ hard.raw.made_by }} - {{ hard.raw.hardware_type }}</v-card-subtitle>
              <v-divider class="mx-4 mt-2 mb-1"></v-divider>
              <v-card-item>
                <h3>Description:</h3>
                  {{ hard.raw.description }}
              </v-card-item>

              <v-divider class="mx-4 mt-2 mb-1"></v-divider>
              <v-card-actions>
                <v-btn color="teal-accent-4" v-for="ref in hard.raw.reference" prepend-icon="mdi-link-variant">
                  <a :href="ref.url" target="_blank"> Website</a>
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

            <div class="mx-2 text-caption">
              Page {{ page }} of {{ pageCount }}
            </div>

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


<script>
import axios from "axios";
export default {
  name: "hardware",
  data: function(){
		return {
      hardware: [],
      dataLoaded: false,
      page: 1,
      search: ""
    }
  },
  methods: {
    getHardware() {
      axios.get(`http://127.0.0.1:8000/api/hardware`)
          .then(response => {
            this.hardware = response.data
            console.log(this.hardware)
            this.dataLoaded = true
          })
          .catch(error => {
            console.log(JSON.stringify(error))
          })
    },
  },
  mounted() {
    this.getHardware()
  }
}
</script>


<style scoped>
.nuxt-link{
  color: white;
  text-decoration: None;
}

.nuxt-link:hover{
  text-decoration: underline;
}

a{
  text-decoration: none;
  color: teal;
}

a:hover{
  text-decoration: underline;
}

</style>