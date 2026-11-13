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
  <v-footer color="#0d0d0d" class="footer">
    <v-container
      class="d-flex flex-column flex-md-row align-center justify-space-between ga-3 py-4"
    >
      <div class="footer-text">mouseTube v1.0.0 · © CNRS · INSERM · UNISTRA · ICS · IGBMC 2025</div>
      <nav class="d-flex flex-wrap justify-center ga-5" aria-label="Footer">
        <nuxt-link to="/team#privacy" class="nuxt-link">
          <v-icon size="16" class="me-1">mdi-shield-lock-outline</v-icon>Privacy Policy
        </nuxt-link>
        <nuxt-link to="/team#term" class="nuxt-link">
          <v-icon size="16" class="me-1">mdi-scale-balance</v-icon>Terms of Use
        </nuxt-link>
        <nuxt-link to="https://mastodon.social/@mousetube" target="_blank" class="nuxt-link">
          <v-icon size="16" class="me-1">mdi-mastodon</v-icon>Mastodon
        </nuxt-link>
        <nuxt-link to="https://github.com/mousetube" target="_blank" class="nuxt-link">
          <v-icon size="16" class="me-1">mdi-github</v-icon>GitHub
        </nuxt-link>
      </nav>
    </v-container>
  </v-footer>
</template>

<style scoped>
.footer-text {
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.875rem;
}

.nuxt-link {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.875rem;
  text-decoration: none;
}

.nuxt-link:hover {
  color: #fff;
  text-decoration: underline;
}
</style>
