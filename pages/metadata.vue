<!--
Created by Nicolas Torquet at 16/11/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->

<script setup>
import { useProtocolMetadataStore } from '@/stores/metadataStore.js';
const storeMetadata = useProtocolMetadataStore();
storeMetadata.fetchProtocolMetadata();
</script>

<template>
  <v-main>
    <v-container>
      <h1>Metadata</h1>
      <v-card prepend-icon="mdi-information" title="About metadata">
        <v-card-text>
          Metadata are important for several reasons:
          <v-list>
            <v-list-item prepend-icon="mdi-check-circle">make your data findable</v-list-item>
            <v-list-item prepend-icon="mdi-check-circle">make your data understandable</v-list-item>
            <v-list-item prepend-icon="mdi-check-circle"
              >make your data comparable with other data</v-list-item
            >
          </v-list>
          Here is the list of requested metadata. These metadata will be linked to your data and
          given to the repository if you use <strong>mouseTube</strong> to send data to one of them.
        </v-card-text>
      </v-card>

      <v-card class="mt-4 mr-3">
        <v-card-title>Metadata protocol</v-card-title>
        <v-card-text>
          <v-list v-if="storeMetadata.protocol_metadata_loaded">
            <v-list-item v-for="(category, key) in storeMetadata.metadata_category" :title="key">
              <v-list>
                <v-list-item v-for="(field, field_key) in category" :title="field_key">
                  <v-list>
                    <v-list-item v-for="metadata in field">
                      {{ metadata }}
                    </v-list-item>
                  </v-list>
                </v-list-item>
              </v-list>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-container>
  </v-main>
</template>

<style scoped></style>
