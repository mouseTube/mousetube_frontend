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
      <v-card class="mt-8">
        <v-card-text>
          In this section, you will find a non-exhaustive list of commercial and custom-made software (arranged in alphabetical order)
          to analyse mouse ultrasonic vocalisation files. <strong>mouseTube</strong> does not provide an integrated analysis solution for the moment,
          but this is under development. Please contact the administrators if you would like to add your own application in this section.
        </v-card-text>
      </v-card>

      <v-skeleton-loader v-if="dataLoaded==false">
      </v-skeleton-loader>

      <v-card v-else variant="outlined" class="mt-5" v-for="soft in software">
        <v-card-title>{{ soft.software_name }}</v-card-title>
        <v-card-text>
          <p>{{ soft.maded_by }}</p>
          <h3 class="mt-5">Technical requirements:</h3>
            {{ soft.description }}
          <h3 class="mt-5">References and tutorials:</h3>
            <v-list>
              <v-list-item class="mb-0" v-for="ref in soft.references_and_tutorials">
                <a :href="ref.url" target="_blank">{{ ref.description }}</a>
              </v-list-item>
            </v-list>
          <h3 class="mt-5">Contact:</h3>
          <v-list>
              <v-list-item v-for="contact in soft.contacts">
                <a href='mailto:{{contact.email}}' target="_blank">{{ contact.firstname }} {{ contact.lastname }}</a>
              </v-list-item>
            </v-list>
        </v-card-text>
      </v-card>
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
      dataLoaded: false
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


</style>