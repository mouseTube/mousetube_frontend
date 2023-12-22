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

      <v-card
          title="Search a file"
          v-else
      >
        <v-card-text>
          <v-text-field
              placeholder="key word"
              append-inner-icon="mdi-magnify"
          ></v-text-field>
          <v-divider></v-divider>
          <v-card-actions>
            <v-select
                label="Species"
                :items="species"
                item-title="name_species"
            ></v-select>
            <v-checkbox label="Dataset" class="ml-2"></v-checkbox>
            <v-select
                label="Strain"
                :items=strain
                class="ml-2"
            ></v-select>
            <v-select
                label="Protocol type"
                class="ml-2"
                :items="protocol"
                item-title="name_protocol_type"
            >
            </v-select>
            <v-text-field
              placeholder="DOI"
              class="ml-2"
          ></v-text-field>
          </v-card-actions>
          <v-btn>Search</v-btn>
        </v-card-text>
      </v-card>

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
      protocol: []
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
    }
  },
  mounted() {
    this.getSpecies()
    this.getProtocolType()
    this.loading = false
  }
}
</script>


<style scoped>

</style>