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
          <v-img :width="600" src="logo_mousetube_big.png" alt="logo mouseTube"></v-img>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-card
            variant="outlined"
          >
            <v-card-title>Welcome to mouseTube 2</v-card-title>

            <v-card-text>
              This web application allows the exchange of mouse vocalisation recording files.<br />
              Data will be accessible as soon as your registration is complete.<br />
              You can be part of the community by clicking here.<br />
              Check out the mouseTube's publications: <br />
              <v-list>
                <v-list-item>
                  Torquet N., de Chaumont F., Faure P., Bourgeron T., Ey E. mouseTube – a database to collaboratively unravel mouse ultrasonic communication [version 1; peer review: 2 approved]. F1000Research 2016, 5:2332 (https://doi.org/10.12688/f1000research.9439.1)
                </v-list-item>
                <v-list-item>
                  Ferhat A. T., Torquet N., Le Sourd A. M., de Chaumont F., Olivo-Marin J. C., Faure P., Bourgeron T., Ey E. Recording Mouse Ultrasonic Vocalizations to Evaluate Social Communication. J. Vis. Exp. (112), e53871, doi:10.3791/53871 (2016).
                </v-list-item>
              </v-list>
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
    </v-container>
  </v-main>

</template>



<script>

export default {
  name: "index",

}
</script>

<style scoped>

</style>