<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->
<template>
  <v-app-bar color="black">
    <v-app-bar-title><nuxt-link to="/" class="nuxt-link"><strong>mouseTube</strong></nuxt-link></v-app-bar-title>
    <v-row>
      <v-col>
        <v-menu open-on-hover>
          <template>
            <v-btn color="primary">Species</v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="(item, index) in species"
              :key="index"
            >
              <v-list-item-title>{{ item.name_species }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
      <v-col><nuxt-link to="/" class="nuxt-link">Vocalisations</nuxt-link></v-col>
      <v-col><nuxt-link to="/softwares" class="nuxt-link">Sofwares</nuxt-link></v-col>
      <v-col><nuxt-link to="/" class="nuxt-link">Help</nuxt-link></v-col>
      <v-col><v-btn>Connexion</v-btn></v-col>
    </v-row>

  </v-app-bar>
</template>

<script>
import axios from "axios";

export default {
  name: "TheHeader",
  data: function(){
		return {
      species: [],
      dataLoaded: false
    }
  },
  methods: {
    getSpecies() {
      axios.get(`http://127.0.0.1:8000/api/species`)
          .then(response => {
            this.species = response.data
            console.log(this.species)
            this.dataLoaded = true
          })
          .catch(error => {
            console.log(JSON.stringify(error))
          })
    },
  },
  mounted() {
    this.getSpecies()
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

</style>