<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->
<template>
  <v-footer color="black">
    <div class="px-4 py-2 bg-black text-center w-100">
      <v-row>
        <v-col>mouseTube - Copyright © CNRS - INSERM - UNISTRA - ICS - IGBMC 2024</v-col>
      </v-row>
      <v-row>
        <v-col>
          <nuxt-link to="/team" class="nuxt-link"><v-icon icon="mdi-account-group"></v-icon> Team</nuxt-link> -
          <nuxt-link to="https://mastodon.social/@mousetube" target="_blank" class="nuxt-link"><v-icon icon="mdi-mastodon"></v-icon> Mastodon</nuxt-link> -
          <nuxt-link to="https://github.com/mousetube" target="_blank" class="nuxt-link"><v-icon icon="mdi-github"></v-icon> GitHub</nuxt-link>
        </v-col>
      </v-row>
    </div>
  </v-footer>
</template>

<script>

export default {
  name: "TheFooter",

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