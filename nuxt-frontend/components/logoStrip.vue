<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->

<template>
  <v-container>
    <v-row align="center" justify="center">
      <v-col><v-sheet class="pa-2 ma-2">
        <nuxt-link to="http://www.cnrs.fr/" target="_blank"><img src="logo_cnrs.png" alt="CNRS" /></nuxt-link>
      </v-sheet></v-col>
      <v-col><v-sheet class="pa-2 ma-2">
        <nuxt-link to="http://www.igbmc.fr" target="_blank"><img src="logo_igbmc.png" alt="IGBMC" /></nuxt-link>
      </v-sheet></v-col>
      <v-col><v-sheet class="pa-2 ma-2">
        <nuxt-link to="http://www.pasteur.fr/" target="_blank"><img src="logo_pasteur.jpg" alt="Institut Pasteur" /></nuxt-link>
      </v-sheet></v-col>
      <v-col><v-sheet class="pa-2 ma-2">
        <nuxt-link to="http://www.inserm.fr/" target="_blank"><img src="logo_inserm.jpg" alt="Inserm" /></nuxt-link>
      </v-sheet></v-col>
      <v-col><v-sheet class="pa-2 ma-2">
        <nuxt-link to="http://www.ics-mci.fr/" target="_blank"><img src="phenomin_ics.png" alt="ICS" /></nuxt-link>
      </v-sheet></v-col>
    </v-row>
  </v-container>
</template>

<script>

export default {
  name: "logoStrip",

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