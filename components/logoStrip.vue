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
    link: 'https://www.bristol.ac.uk/',
    src: '/logo_bristol_university_300.png',
    alt: 'University of Bristol',
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
    <!-- same height for every logo, one line when it fits, wraps on narrow screens -->
    <div class="d-flex flex-wrap justify-center align-center logo-row">
      <nuxt-link v-for="logo in logos" :key="logo.src" :to="logo.link" target="_blank">
        <img :src="logo.src" :alt="logo.alt" />
      </nuxt-link>
    </div>
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

.logo-row {
  gap: 16px 28px;
}

img {
  display: block;
  height: 56px;
  width: auto;
  max-width: 180px;
  object-fit: contain;
}
</style>
