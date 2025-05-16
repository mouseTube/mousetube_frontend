<!--
Created by Nicolas Torquet at 26/01/2024
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->

<template>
  <v-main>
    <v-container>
      <h1>Dataset</h1>
      <v-card>
        <v-card-title>Mouse dataset</v-card-title>
        <v-card-item>
          In this page, you will find a reference dataset to train, test or compare vocalization
          analysis software.
        </v-card-item>
        <v-card-item>
          This dataset is composed of:
          <v-list>
            <v-list-item>File 1: pups vocalizations (link to the file)</v-list-item>
            <v-list-item>File 2: female mice with bedding (link to the file)</v-list-item>
            <v-list-item>File 3: male mouse with a female (link to the file)</v-list-item>
          </v-list>
        </v-card-item>
        <v-card-actions>
          <v-btn color="teal-accent-4" prepend-icon="mdi-download">
            <a href="" target="_blank">Download</a>
          </v-btn>
          <v-chip class="ma-2" label color="#03DAC6">
            <strong>DOI:</strong> 10.5281/zenodo.5787352
          </v-chip>
        </v-card-actions>
      </v-card>
    </v-container>
  </v-main>
</template>

<script></script>

<style scoped>
a {
  text-decoration: none;
  color: teal;
}

a:hover {
  text-decoration: underline;
}
</style>
