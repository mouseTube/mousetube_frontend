<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->
<template>
  <v-card variant="outlined" class="mt-5" v-for="software in softwares">
    <v-card-title>{{ software.software_name }}</v-card-title>
    <v-card-text>
      <p>{{ software.maded_by }}</p>
      <h3 class="mt-5">Technical requirements:</h3>
        {{ software.description }}
      <h3 class="mt-5">References and tutorials:</h3>
        <v-list>
          <v-list-item v-for="ref in software.references_and_tutorials">
            <a :href="ref.url" target="_blank">{{ ref.name_reference }}</a>
          </v-list-item>
        </v-list>
      <h3 class="mt-5">Contact:</h3>
      <v-list>
          <v-list-item v-for="contact in software.contacts">
            <a href='mailto:{{contact.email}}' target="_blank">{{ contact.firstname }} {{ contact.lastname }}</a>
          </v-list-item>
        </v-list>
    </v-card-text>
  </v-card>
</template>

<script>

export default {
  name: "software",
  props: {
    software: Object,
  },
  components: {
  },
  data() {}
}
</script>

<style scoped>

</style>