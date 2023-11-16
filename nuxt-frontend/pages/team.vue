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
      <v-row>
        <v-col>
          <v-img :width="600" src="logo_mousetube_big.png" alt="logo mouseTube"></v-img>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-card>
            <v-card-title>Team</v-card-title>

            <v-card-text class="mt-4">
              <v-list>
                <v-list-item prepend-icon="mdi-account-circle"><strong>Elodie Ey</strong> (PhD -
                  <nuxt-link to="http://www.igbmc.fr/research/department/4/team/45/" target="_blank">Physiopathology of aneuploidy, gene dosage effect and Down syndrome</nuxt-link>
                  - <nuxt-link to="https://www.igbmc.fr/" target="_blank">CNRS UMR 7104 - Institut de Génétique et de Biologie Moléculaire et Cellulaire: IGBMC</nuxt-link>)
                </v-list-item>
                <v-list-item prepend-icon="mdi-account-circle"><strong>Nicolas Torquet</strong> (Research and Development pole -
                  <nuxt-link to="http://www.ics-mci.fr/en/" target="_blank">Institut Clinique de la Souris</nuxt-link> -
                  <nuxt-link to="https://www.igbmc.fr/" target="_blank">CNRS UMR 7104 - Institut de Génétique et de Biologie Moléculaire et Cellulaire: IGBMC</nuxt-link>)
                </v-list-item>
              </v-list>
              Logo by <strong>Ioan Lemoël</strong><br />

            </v-card-text>
          </v-card>
          <v-card class="mt-4">
            <v-card-title>Contact and information</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item prepend-icon="mdi-email">mousetube@igbmc.fr</v-list-item>
                <v-list-item prepend-icon="mdi-github"><nuxt-link to="https://github.com/mousetube" target="_blank" >mouseTube on GitHub</nuxt-link></v-list-item>
              </v-list>
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

export default {
  name: "team",

}
</script>

<style scoped>

</style>