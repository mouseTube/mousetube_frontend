<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->
<script setup>
// Footer page
</script>

<template>
  <v-footer color="black">
    <div class="px-4 py-2 bg-black text-center w-100">
      <v-row>
        <v-col>
          <!-- <nuxt-link to="/team" class="nuxt-link"
            ><v-icon icon="mdi-account-group"></v-icon> Team</nuxt-link
          >
          - -->
          <nuxt-link to="https://mastodon.social/@mousetube" target="_blank" class="nuxt-link"
            ><v-icon icon="mdi-mastodon"></v-icon> Mastodon</nuxt-link
          >
          -
          <nuxt-link to="https://github.com/mousetube" target="_blank" class="nuxt-link"
            ><v-icon icon="mdi-github"></v-icon> GitHub</nuxt-link
          >
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          mouseTube v1.0.0 — Copyright © CNRS · INSERM · UNISTRA · ICS · IGBMC 2025 —
          <nuxt-link to="/team#privacy" class="nuxt-link me-2">
            <v-icon small class="me-1">mdi-shield-lock-outline</v-icon>
            Privacy Policy
          </nuxt-link>
          <nuxt-link to="/team#term" class="nuxt-link">
            <v-icon small class="me-1">mdi-scale-balance</v-icon>
            Terms of Use
          </nuxt-link>
        </v-col>
      </v-row>
    </div>
  </v-footer>
</template>

<style scoped>
.nuxt-link {
  color: white;
  text-decoration: None;
}

.nuxt-link:hover {
  text-decoration: underline;
}
</style>
