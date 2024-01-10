<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->
<template>
  <v-main>
    <v-container>
      <h1><v-icon icon="mdi-floppy"></v-icon> Software and applications to analyse mouse ultrasonic vocalisations</h1>
      <v-card  class="mt-5" color="grey-lighten-4">
        <v-card-text>
          In this section, you will find a non-exhaustive list of commercial and custom-made software (arranged in alphabetical order)
          to analyse mouse ultrasonic vocalisation files. <strong>mouseTube</strong> does not provide an integrated analysis solution for the moment,
          but this is under development. Please contact the administrators if you would like to add your own application in this section.
        </v-card-text>
      </v-card>

      <v-skeleton-loader class="mt-5" type="card" v-if="dataLoaded==false">
      </v-skeleton-loader>

      <v-data-iterator v-else class="mt-5" :items="software" :items-per-page="2" :search="search">
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
            <v-card class="mt-5" v-bind="soft" v-for="soft in items" :key="soft.raw.software_name">
              <v-card-title class="ml-5">{{ soft.raw.software_name }}</v-card-title>
              <v-card-subtitle>{{ soft.raw.made_by }}</v-card-subtitle>
              <v-divider class="mx-4 mt-2 mb-1"></v-divider>
              <v-card-item>
                <h3>Technical requirements:</h3>
                  {{ soft.raw.description }}
              </v-card-item>

              <v-card-item>
                <h3 class="mt-5">References and tutorials:</h3>
                <v-list>
                  <v-list-item class="mb-0" v-for="ref in soft.raw.references_and_tutorials">
                    <v-icon color="teal-accent-4" icon="mdi-link-variant"></v-icon>  <a :href="ref.url" target="_blank">{{ ref.description }}</a>
                  </v-list-item>
                </v-list>
              </v-card-item>
              <v-divider class="mx-4 mt-2 mb-1"></v-divider>
              <v-card-actions>
                <v-btn color="teal-accent-4" v-for="contact in soft.raw.contacts" prepend-icon="mdi-email">
                  <a class="text-decoration-none" href='mailto:{{contact.email}}' target="_blank">
                    <span v-if="contact.firstname && contact.lastname">{{ contact.firstname }} {{ contact.lastname }}</span>
                    <span v-else>{{ contact.email }}</span>
                  </a></v-btn>
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
  name: "software",
  data: function(){
		return {
      software: [],
      dataLoaded: false,
      page: 1,
      search: ""
    }
  },
  methods: {
    getSoftware() {
      axios.get(`http://127.0.0.1:8000/api/software`)
          .then(response => {
            this.software = response.data
            console.log(this.software)
            this.dataLoaded = true
          })
          .catch(error => {
            console.log(JSON.stringify(error))
          })
    },
  },
  mounted() {
    this.getSoftware()
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