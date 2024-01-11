<!--
Created by Nicolas Torquet at 16/11/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->

<template>
  <v-main>
    <v-container>
      <h1>Vocalisations</h1>

      <v-skeleton-loader type="article" v-if="loading">
      </v-skeleton-loader>


      <v-data-iterator v-else class="mt-5" :items="files" :items-per-page="2">
<!--        <template v-slot:header>-->
<!--          <v-toolbar class="px-2">-->
<!--            <v-text-field-->
<!--              placeholder="key word"-->
<!--              append-inner-icon="mdi-magnify"-->
<!--          ></v-text-field>-->
<!--            <v-select-->
<!--                label="Species"-->
<!--                :items="species"-->
<!--                item-title="name_species"-->
<!--            ></v-select>-->
<!--            <v-checkbox label="Dataset" class="ml-2"></v-checkbox>-->
<!--            <v-select-->
<!--                label="Strain"-->
<!--                :items=strain-->
<!--                class="ml-2"-->
<!--            ></v-select>-->
<!--            <v-select-->
<!--                label="Protocol type"-->
<!--                class="ml-2"-->
<!--                :items="protocol"-->
<!--                item-title="name_protocol_type"-->
<!--            >-->
<!--            </v-select>-->
<!--            <v-text-field-->
<!--              placeholder="DOI"-->
<!--              class="ml-2"-->
<!--          ></v-text-field>-->
<!--          </v-toolbar>-->
<!--        </template>-->

        <template v-slot:default="{ items }">
          <v-container class="pa-2" fluid>
            <v-card class="mt-5" v-bind="file" v-for="file in items">

<!--              <v-card-title>{{ file.raw.name_file }}</v-card-title>-->


<!--                <v-divider class="mx-4 mt-2 mb-1"></v-divider>-->

                <v-card-item class="mt-5">
                  <v-expansion-panels>
                    <v-expansion-panel>
                      <v-expansion-panel-title class="text-h5 font-weight-bold">{{ file.raw.name_file }}</v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <v-card>
                          <v-card-title class="mt-2 ml-2"><v-icon icon="mdi-account"></v-icon> Owner</v-card-title>
<!--                          <v-card-text>{{ file.raw.created_by }}</v-card-text>-->
                        </v-card>

                          <v-divider class="mx-4 mt-2 mb-2"></v-divider>

                        <v-card>
                          <v-card-title class="mt-2 ml-2">Protocol</v-card-title>
                          <v-card-subtitle class="mt-1 ml-4">Protocol type: {{ file.raw.experiment.protocol.protocol_type.name_protocol_type }}</v-card-subtitle>
                          <v-card-text>
                            <strong>Protocol name:</strong> {{ file.raw.experiment.protocol.name_protocol }}<br />
                            <strong>Protocol description:</strong><br />
                            {{ file.raw.experiment.protocol.protocol_description }}
                          </v-card-text>
                        </v-card>

                          <h3>Protocol</h3>
                          <h5>Protocol type:</h5> {{ file.raw.experiment.protocol.protocol_type.name_protocol_type }}
                          <h5>Protocol name:</h5> {{ file.raw.experiment.protocol.name_protocol }}
                          <h5>Protocol description:</h5> {{ file.raw.experiment.protocol.protocol_description }}

                          <v-divider class="mx-4 mt-2 mb-2"></v-divider>

                        <h3>Experiment</h3>
                        <h5>Experiment name:</h5> {{ file.raw.experiment.name_experiment }}
                        <h5>Date:</h5> {{ file.raw.experiment.date_experiment }}

                        <v-divider class="mx-4 mt-2 mb-2"></v-divider>

                        <h3>Spectrogram</h3>
                        <v-img :src="file.raw.spectrogram"></v-img>

                        </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-card-item>


              <v-divider class="mx-4 mt-2 mb-1"></v-divider>

              <v-card-actions>
                <v-btn color="teal-accent-4" prepend-icon="mdi-download">
                  <a :href="file.raw.link_file" target="_blank">Download</a>
                </v-btn>
                <v-btn color="teal-accent-4">
                  DOI: {{ file.raw.doi_file }}
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
  name: "vocalisations",
  data: function () {
    return {
      loading: true,
      species: [],
      strain: ['C57BL/6J'],
      protocol: [],
      files: []
    }
  },
  methods: {
    getSpecies() {
      axios.get(`http://127.0.0.1:8000/api/species/`)
          .then(response => {
            this.species = response.data
            console.log(this.species)
            this.dataLoaded = true
          })
          .catch(error => {
            console.log(JSON.stringify(error))
          })
    },
    getStrains() {
      axios.get(`http://127.0.0.1:8000/api/strain/`)
          .then(response => {
            this.strain = response.data
            console.log(this.strain)
          })
          .catch(error => {
            console.log(JSON.stringify(error))
          })
    },
    getProtocolType() {
      axios.get(`http://127.0.0.1:8000/api/protocol_type/`)
          .then(response => {
            this.protocol = response.data
            console.log("protocols loaded")
            console.log(this.protocol)
          })
          .catch(error => {
            console.log(JSON.stringify(error))
          })
    },
    getFiles() {
      axios.get(`http://127.0.0.1:8000/api/file/`)
          .then(response => {
            this.files = response.data
            console.log("files loaded")
            console.log(this.files)
          })
          .catch(error => {
            console.log(JSON.stringify(error))
          })
    }
  },
  mounted() {
    this.getSpecies()
    this.getProtocolType()
    this.getFiles()
    this.loading = false
  }
}
</script>


<style scoped>
a{
  text-decoration: none;
  color: teal;
}

a:hover{
  text-decoration: underline;
}
</style>