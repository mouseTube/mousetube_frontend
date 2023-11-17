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
      <h1>Metadata</h1>
      <v-card
          prepend-icon="mdi-information"
          title="About metadata"
      >
        <v-card-text>
          Metadata are important for several reasons:
          <v-list>
            <v-list-item prepend-icon="mdi-check-circle">make your data findable</v-list-item>
            <v-list-item prepend-icon="mdi-check-circle">make your data understandable</v-list-item>
            <v-list-item prepend-icon="mdi-check-circle">make your data comparable with other data</v-list-item>
          </v-list>
          Here is the list of requested metadata. These metadata will be linked to your data and given to the repository if you
          use <strong>mouseTube</strong> to send data to one of them.
        </v-card-text>
      </v-card>

      <v-row justify="center">
        <v-col cols="auto">
          <v-card class="mt-4 mr-3">
            <v-toolbar color="black">
              <v-toolbar-title>Strain</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
              <v-list>
                <v-list-item>name_strain</v-list-item>
                <v-list-item>species</v-list-item>
                <v-list-item>background</v-list-item>
                <v-list-item>jax_number</v-list-item>
                <v-list-item>mgi_number</v-list-item>
                <v-list-item>biblio_strain</v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="auto">
          <v-card class="mt-4 mr-3">
            <v-toolbar color="black">
              <v-toolbar-title>Protocol</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
              <v-list>
                <v-list-item>name_protocol</v-list-item>
                <v-list-item>protocol_type</v-list-item>
                <v-list-item>protocol_description</v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="auto">
          <v-card class="mt-4 mr-3">
            <v-toolbar color="black">
              <v-toolbar-title>Experiment</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
              <v-list>
                <v-list-item>name_experiment</v-list-item>
                <v-list-item>protocol</v-list-item>
                <v-list-item>date_experiment</v-list-item>
                <v-list-item>group_subject</v-list-item>
                <v-list-item>temperature</v-list-item>
                <v-list-item>light_cycle</v-list-item>
                <v-list-item>microphone</v-list-item>
                <v-list-item>acquisition_harware</v-list-item>
                <v-list-item>acquisition_software</v-list-item>
                <v-list-item>sampling-frequency</v-list-item>
                <v-list-item>bit_depth</v-list-item>
                <v-list-item>laboratory</v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="auto">
          <v-card class="mt-4 mr-3">
            <v-toolbar color="black">
              <v-toolbar-title>Subject</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
              <v-list>
                <v-list-item>name_subject</v-list-item>
                <v-list-item>strain</v-list-item>
                <v-list-item>origin_subject</v-list-item>
                <v-list-item>sex</v-list-item>
                <v-list-item>group_subject</v-list-item>
                <v-list-item>genotype</v-list-item>
                <v-list-item>treatment</v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="auto">
          <v-card class="mt-4">
            <v-toolbar color="black">
              <v-toolbar-title>File</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
              <v-list>
                <v-list-item>experiment</v-list-item>
                <v-list-item>subject</v-list-item>
                <v-list-item>file_number</v-list-item>
                <v-list-item>link_file</v-list-item>
                <v-list-item>notes_file</v-list-item>
                <v-list-item>doi</v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>


<script>

</script>


<style scoped>

</style>