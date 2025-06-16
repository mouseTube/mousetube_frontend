<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->

<script setup>
////////////////////////////////
// IMPORT
////////////////////////////////
import { ref, onMounted } from 'vue';
import axios from 'axios';

////////////////////////////////
// DATA
////////////////////////////////
const numberOfFiles = ref(0);
const dataLoaded = ref(false);
const apiBaseUrl = useApiBaseUrl();
const filters = ref(['is_valid_link']);

////////////////////////////////
// METHODS
////////////////////////////////
const getNumberOfFiles = () => {
  axios
    .get(`${apiBaseUrl}/file/?filter=${filters.value}`)
    .then((response) => {
      numberOfFiles.value = response.data.count;
      dataLoaded.value = true;
    })
    .catch((error) => {
      //eslint-disable-next-line no-console
      console.log(JSON.stringify(error));
    });
};

onMounted(() => {
  getNumberOfFiles();
});
</script>

<template>
  <v-main>
    <v-container>
      <v-row class="d-flex" align="stretch">
        <v-col cols="12" md="6" class="h-100">
          <v-card variant="flat" class="mx-auto flex-grow-1 mt-5">
            <v-row justify="center" no-gutters>
              <v-img
                contain
                height="250"
                src="/logo_mousetube_big.png"
                alt="logo MouseTube"
                class="d-flex justify-center mx-10"
              ></v-img>
            </v-row>
            <!-- <v-card-title class="text-h2 mt-5">Welcome to MouseTube</v-card-title> -->
            <v-card-text class="mt-10">
              <v-row justify="center" no-gutters>
                <v-col
                  class="text-h4 font-weight-bold d-flex align-center justify-center flex-column"
                  v-if="dataLoaded"
                >
                  <div class="soundwaves mb-10">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                  <nuxt-link to="/vocalizations" style="color: black">
                    {{ numberOfFiles }} vocalization files available
                  </nuxt-link>
                </v-col>
                <v-col v-else>
                  <v-progress-circular color="red-darken-4" indeterminate></v-progress-circular>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
          <v-card
            class="mx-4 py-2 px-2 flex-grow-1 mt-8 rounded-lg border elevation-3"
            variant="tonal"
          >
            <v-card-title class="font-weight-bold mx-4 my-4">
              <v-icon class="me-2">mdi-handshake-outline</v-icon>
              Call for papers
            </v-card-title>
            <v-card-text class="text-justify">
              Working on ultrasonic vocalizations? Together, Dr. Elodie Ey and Dr. Markus Wöhr are
              serving as guest editors for a Behavioural Brain Research special issue on Ultrasonic
              Communication in Rodents. They are more than happy to learn about your most recent
              discoveries.<br />
              <br />
              More information here:
              <nuxt-link
                href="https://www.sciencedirect.com/special-issue/317071/ultrasonic-communication-in-rodents"
                target="_blank"
                >Behavioural Brain Research - Ultrasonic Communication in Rodents</nuxt-link
              >
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" class="h-100">
          <v-card
            class="mx-4 py-2 px-2 flex-grow-1 mt-2 rounded-lg border elevation-3"
            variant="tonal"
          >
            <v-card-title class="font-weight-bold mx-4 my-4">
              <v-icon class="me-2">mdi-rodent</v-icon>
              What is MouseTube?
            </v-card-title>
            <v-card-text class="text-justify">
              Rodents communicate with each other through their various sensory modalities:
              olfaction (scent marking, glands), vision (postures), touch (contacts) and hearing
              (vocalizations). In the latter case, vocalizations are mainly emitted in the
              ultrasonic range, beyond human perception capabilities (<nuxt-link
                href="https://doi.org/10.1126/science.119.3101.808"
                target="_blank"
                >Anderson, 1954</nuxt-link
              >; Brudzynski,
              <nuxt-link href="https://doi.org/10.1007/s10519-004-0858-3" target="_blank"
                >2005</nuxt-link
              >,
              <nuxt-link href="https://doi.org/10.3390/brainsci11050605" target="_blank"
                >2021</nuxt-link
              >;
              <nuxt-link
                href="https://www.metris.nl/media/documents/TypesandFunctionsofUSVinLabRatsandMice.pdf"
                target="_blank"
                >Portfors, 2007</nuxt-link
              >;
              <nuxt-link href="https://doi.org/10.7554/eLife.54020" target="_blank"
                >Schweinfurth, 2020</nuxt-link
              >). Ultrasonic vocalizations are emitted in various contexts: by isolated pups during
              the first two weeks of life, by juveniles and adults during same-sex social
              interactions, by males in the presence of females, and by individuals in aversive or
              appetitive situations (restraint stress, anticipation of pain, social play, food
              rewards) and exploring an unfamiliar environment. These ultrasonic vocalizations are
              used as markers of motivation and social communication (<nuxt-link
                href="https://doi.org/10.1111/j.1601-183X.2010.00610.x"
                target="_blank"
                >Fischer and Hammerschmidt, 2010</nuxt-link
              >;
              <nuxt-link href="https://doi.org/10.7554/eLife.54020" target="_blank"
                >Schweinfurth, 2020</nuxt-link
              >), or of susceptibility to stress or anxiety, depending on the type of signal
              examined (<nuxt-link href="https://doi.org/10.1007/s10519-004-0858-3" target="_blank"
                >Brudzynski, 2005</nuxt-link
              >). Ultrasonic vocalizations are therefore routinely measured in rodent models of
              neuropsychiatric conditions (<nuxt-link
                href="https://doi.org/10.1111/ejn.15957"
                target="_blank"
                >Premoli et al., 2023</nuxt-link
              >).
            </v-card-text>
            <v-card-text class="text-justify">
              The mechanisms of production, the temporal organization into sequences, the
              significance of the acoustic features and the effect on the recipient are far from
              elucidated. Understanding the complexity of this communication system requires a vast
              amount of data to explore with high-performance analysis methods. For that purpose, we
              developed <strong>MouseTube</strong>, a database designed to facilitate sharing,
              archiving and analysing raw recording files of rodent ultrasonic vocalizations
              following the FAIR (Findable, Accessible, Interoperable, Reusable) principles
              (<nuxt-link href="https://doi.org/10.1038/sdata.2016.18" target="_blank"
                >Wilkinson et al., 2016</nuxt-link
              >).
            </v-card-text>
          </v-card>
          <!-- <v-card
            class="mx-4 py-2 px-2 flex-grow-1 mt-8 rounded-lg border elevation-3"
            variant="tonal"
          >
            <v-card-title class="font-weight-bold mx-4 my-4">
              <v-icon class="me-2">mdi-newspaper-variant-multiple-outline</v-icon>
              MouseTube's publications
            </v-card-title>
            <v-card-text class="text-justify">
              Torquet N., de Chaumont F., Faure P., Bourgeron T., Ey E. MouseTube – a database to
              collaboratively unravel mouse ultrasonic communication [version 1; peer review: 2
              approved]. F1000Research 2016, 5:2332 (<nuxt-link
                href="https://doi.org/10.12688/f1000research.9439.1"
                target="_blank"
                >https://doi.org/10.12688/f1000research.9439.1</nuxt-link
              >) (2016). Ferhat A. T., Torquet N., Le Sourd A. M., de Chaumont F., Olivo-Marin J.
              C., Faure P., Bourgeron T., Ey E. Recording Mouse Ultrasonic Vocalizations to Evaluate
              Social Communication. J. Vis. Exp. (112), e53871,
              <nuxt-link href="https://dx.doi.org/10.3791/53871" target="_blank"
                >doi:10.3791/53871</nuxt-link
              >
              (2016).
            </v-card-text>
            <v-card-actions>
              <nuxt-link to="https://mastodon.social/@mousetube" target="_blank" class="nuxt-link"
                ><v-btn prepend-icon="mdi-mastodon">Follow MouseTube on Mastodon</v-btn></nuxt-link
              >
            </v-card-actions>
          </v-card> -->
        </v-col>
      </v-row>
      <v-row>
        <logo-strip></logo-strip>
      </v-row>
    </v-container>
  </v-main>
</template>

<style scoped>
a {
  text-decoration: none;
  color: #b71c1c;
}

a:hover {
  text-decoration: underline;
}

.soundwaves {
  display: flex;
  gap: 4px;
  height: 10px;
  align-items: center;
}

.soundwaves div {
  width: 3px;
  height: 100%;
  background-color: rgb(230, 45, 45);
  animation: wave 1s infinite ease-in-out;
  transform-origin: center center;
  border-radius: 10px;
}

.soundwaves div:nth-child(1) {
  animation-delay: 0s;
}
.soundwaves div:nth-child(2) {
  animation-delay: 0.2s;
}
.soundwaves div:nth-child(3) {
  animation-delay: 0.4s;
}
.soundwaves div:nth-child(4) {
  animation-delay: 0.6s;
}
.soundwaves div:nth-child(5) {
  animation-delay: 0.8s;
}
.soundwaves div:nth-child(6) {
  animation-delay: 1s;
}

@keyframes wave {
  0%,
  100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(3);
  }
}

:deep(.v-expansion-panel-title) {
  padding: 7px 7px;
}
</style>
