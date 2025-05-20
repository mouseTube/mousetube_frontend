<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->

<script setup>
const logos = [
  {
    link: 'http://www.cnrs.fr/',
    src: '/logo_cnrs.png',
    alt: 'CNRS',
  },
  {
    link: 'http://www.igbmc.fr',
    src: '/logo_igbmc.png',
    alt: 'IGBMC',
  },
  {
    link: 'https://www.france-bioinformatique.fr/',
    src: '/logo_ifb.png',
    alt: 'Institut français de bioinformatique',
  },
  {
    link: 'http://www.pasteur.fr/',
    src: '/logo_pasteur.jpg',
    alt: 'Institut Pasteur',
  },
  {
    link: 'http://www.inserm.fr/',
    src: '/logo_inserm.jpg',
    alt: 'Inserm',
  },
  {
    link: 'http://www.ics-mci.fr/',
    src: '/ics2010.png',
    alt: 'ICS',
  },
  {
    link: 'https://www.fc3r.com/',
    src: '/logo-fc3r_bleu.png',
    alt: 'FC3R',
  },
];
</script>

<template>
  <v-container>
    <v-row align="center" justify="center">
      <v-col v-for="(logo, i) in logos" :key="i" class="d-flex justify-center align-center">
        <v-sheet class="pa-1 ma-1">
          <nuxt-link :to="logo.link" target="_blank">
            <img :src="logo.src" :alt="logo.alt" />
          </nuxt-link>
        </v-sheet>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.nuxt-link {
  color: white;
  text-decoration: None;
}

.nuxt-link:hover {
  text-decoration: underline;
}

img {
  max-width: 150px;
  height: auto;
}
</style>
