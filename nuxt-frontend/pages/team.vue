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
          <h1><v-img :width="600" src="logo_mousetube_big.png" alt="logo mouseTube"></v-img> Team and information</h1>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-card class="mt-4">
            <v-card-title><v-icon icon="mdi-account-multiple"></v-icon> The mouseTube Team</v-card-title>
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

            </v-card-text>
          </v-card>

          <v-card class="mt-4">
            <v-card-title>Contact and network</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item prepend-icon="mdi-email">mousetube@igbmc.fr</v-list-item>
                <v-list-item prepend-icon="mdi-mastodon">mouseTube on Mastodon: <nuxt-link to="https://mastodon.social/@mousetube" target="_blank">@mousetube@mastodon.social</nuxt-link> </v-list-item>
                <v-list-item prepend-icon="mdi-github"><nuxt-link to="https://github.com/mousetube" target="_blank" >mouseTube on GitHub</nuxt-link></v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <v-card class="mt-4">
            <v-card-title>Bibliography</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item prepend-icon="mdi-newspaper-variant-outline">
                  Torquet N., de Chaumont F., Faure P., Bourgeron T., Ey E. mouseTube – a database to collaboratively
                  unravel mouse ultrasonic communication [version 1; peer review: 2 approved].
                  F1000Research 2016, 5:2332 (<nuxt-link href="https://doi.org/10.12688/f1000research.9439.1" target="_blank">https://doi.org/10.12688/f1000research.9439.1</nuxt-link>) (2016).
                </v-list-item>
                <v-list-item prepend-icon="mdi-newspaper-variant-outline">
                  Ferhat A. T., Torquet N., Le Sourd A. M., de Chaumont F., Olivo-Marin J. C.,
                  Faure P., Bourgeron T., Ey E. Recording Mouse Ultrasonic Vocalizations to Evaluate Social Communication.
                  J. Vis. Exp. (112), e53871, <nuxt-link href="https://dx.doi.org/10.3791/53871" target="_blank">doi:10.3791/53871</nuxt-link> (2016).
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <v-card class="mt-4">
            <v-card-title>mouseTube in the media</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item prepend-icon="mdi-trophy">
                  In 2022, <strong>mouseTube</strong> was awarded the
                  <nuxt-link href="https://www.ouvrirlascience.fr/prix-science-ouverte-des-donnees-de-la-recherche/" target="_blank">
                    Science Ouverte (Open Science) prize for research data</nuxt-link>
                  by the <strong>French Ministry of Higher Education and Research</strong>.
                </v-list-item>
                <v-list-item prepend-icon="mdi-newspaper">
                  Following the open science prize of 2022, <strong>Savoir(s)</strong>, the daily newspaper of the <strong>University of Strasbourg</strong>, carried an
                  <nuxt-link href="https://savoirs.unistra.fr/innovation/mousetube-la-base-de-donnees-des-vocalisations-de-souris" target="_blank">interview</nuxt-link>.
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <v-card class="mt-4">
            <v-card-title>Acknowledgments</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item prepend-icon="mdi-account-circle"><strong>Thomas Bourgeron</strong> (Institut Pasteur, Paris, France)</v-list-item>
                <v-list-item prepend-icon="mdi-account-circle"><strong>Fabrice de Chaumont</strong> (Institut Pasteur, Paris, France)</v-list-item>
                <v-list-item prepend-icon="mdi-account-circle"><strong>Philippe Faure</strong> (ESPCI, Paris, France)</v-list-item>
                <v-list-item prepend-icon="mdi-account-circle">mouseTube logo by <strong>Ioan Lemoël</strong><br /></v-list-item>
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
a{
  text-decoration: none;
  color: teal;
}

a:hover{
  text-decoration: underline;
}
</style>