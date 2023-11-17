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
      <v-row>
        <v-col>
          <v-card
            variant="flat"
            class="mx-auto"
            max-width="800"
          >
            <v-img cover :width="600" src="logo_mousetube_big.png" alt="logo mouseTube"></v-img>
            <v-card-title class="text-h2 mt-5">Welcome to mouseTube</v-card-title>

            <v-card-text class="mt-4">
              This web application allows the exchange of mouse vocalisation recording files.<br />
              <v-img :width="300" class="mt-3 mb-3" src="fair_data_principles.jpg" alt="FAIR"></v-img>
              This new version is more <nuxt-link href="https://www.go-fair.org/fair-principles/" target="_blank">FAIR (Findable, Accessible, Interoperable, Reusable)</nuxt-link>.
              Through mouseTube, you can upload your data on a repository.<br />
              You can be part of the community by clicking here.<br />
              Check out the mouseTube's publications: <br />
              <v-list>
                <v-list-item>
                  Torquet N., de Chaumont F., Faure P., Bourgeron T., Ey E. mouseTube – a database to collaboratively
                  unravel mouse ultrasonic communication [version 1; peer review: 2 approved].
                  F1000Research 2016, 5:2332 (<nuxt-link href="https://doi.org/10.12688/f1000research.9439.1" target="_blank">https://doi.org/10.12688/f1000research.9439.1</nuxt-link>) (2016).
                </v-list-item>
                <v-list-item>
                  Ferhat A. T., Torquet N., Le Sourd A. M., de Chaumont F., Olivo-Marin J. C.,
                  Faure P., Bourgeron T., Ey E. Recording Mouse Ultrasonic Vocalizations to Evaluate Social Communication.
                  J. Vis. Exp. (112), e53871, <nuxt-link href="https://dx.doi.org/10.3791/53871" target="_blank">doi:10.3791/53871</nuxt-link> (2016).
                </v-list-item>
              </v-list>

              <v-row justify="center" no-gutters>
                <v-col
                  class="text-h4"
                >
                  {{ numberOfFiles }} vocalisation files available now!
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-card >
            <v-card-title>Here is a short video introduction to <strong>mouseTube</strong>:</v-card-title>
            <v-card-text>
              <iframe width="560" height="315" src="https://www.youtube.com/embed/-0HTEXEnwSc?si=lxsGyiq16kE3nq9K" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <logo-strip></logo-strip>
      </v-row>
    </v-container>
  </v-main>

</template>



<script>
import axios from "axios";

export default {
  name: "index",
  data: function () {
    return {
      numberOfFiles: [],
    }
  },
  methods: {
    getNumberOfFiles() {
      axios.get(`http://127.0.0.1:8000/api/file`)
          .then(response => {
            this.numberOfFiles = response.data.length
            console.log(this.numberOfFiles)
            this.dataLoaded = true
          })
          .catch(error => {
            console.log(JSON.stringify(error))
          })
    },

  },
  mounted() {
    this.getNumberOfFiles()
  }
}
</script>

<style scoped>

</style>