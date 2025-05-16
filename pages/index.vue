<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->
<template>
  <v-main>
    <v-container>
      <v-row>
        <v-col>
          <v-card variant="flat" class="mx-auto" max-width="800">
            <v-img cover :width="600" src="logo_mousetube_big.png" alt="logo mouseTube"></v-img>
            <v-card-title class="text-h2 mt-5">Welcome to mouseTube</v-card-title>
            <v-card-item>
              <v-card-text>
                Rodents communicate with each other through their various sensory modalities:
                olfaction (scent marking, glands), vision (postures), touch (contacts) and hearing
                (vocalizations). In the latter case, vocalizations are mainly emitted in the
                ultrasonic range, beyond human perception capabilities (Anderson, 1954; Brudzynski,
                2005, 2021; Portfors, 2007; Schweinfurth, 2020). Ultrasonic vocalizations are
                emitted in various contexts: by isolated pups during the first two weeks of life, by
                juveniles and adults during same-sex social interactions, by males in the presence
                of females, and by individuals in aversive or appetitive situations (restraint
                stress, anticipation of pain, social play, food rewards) and exploring an unfamiliar
                environment. These ultrasonic vocalizations are used as markers of motivation and
                social communication (Fischer and Hammerschmidt, 2010; Schweinfurth, 2020), or
                susceptibility to stress or anxiety, depending on the type of signal examined
                (Brudzynski, 2005). Ultrasonic vocalizations are therefore routinely measured in
                rodent models of neuropsychiatric conditions (Premoli et al., 2023).
              </v-card-text>
              <v-card-text>
                The mechanisms of production, the temporal organization into sequences, the
                significance of the acoustic features and the effect on the recipient are far from
                elucidated. Understanding the complexity of this complex communication system
                requires a vast amount of data to explore with high-performance analysis methods.
                For that purpose, we developed <strong>mouseTube</strong>, a database designed to
                facilitate sharing, archiving and analysing raw recording files of rodent ultrasonic
                vocalisations following the FAIR (Findable, Accessible, Interoperable, Reusable)
                principles (Wilkinson et al., 2016).
              </v-card-text>
              <v-card-text>
                New functionalities since the first launch in 2014 (Ferhat et al., 2016; Torquet et
                al., 2016):
                <v-list>
                  <v-list-item class="mt-0"
                    >- <strong>mouseTube</strong> will have an API (Application Program Interface)
                    to allow the automation of analyses through external programs.</v-list-item
                  >
                  <v-list-item class="mt-0"
                    >- Data will be accessible without authentication.</v-list-item
                  >
                  <v-list-item class="mt-0"
                    >- The search engine will be optimised through key words.</v-list-item
                  >
                  <v-list-item class="mt-0"
                    >- We will open the database to other species such as rats.</v-list-item
                  >
                  <v-list-item class="mt-0"
                    >- The direct upload of the recording files and their metadata on certified
                    institutional data repositories (Zenodo, Recherche Data Gouv) will be
                    possible.</v-list-item
                  >
                  <v-list-item class="mt-0"
                    >- A fully annotated set of data will be available to compare analysis solutions
                    with manual annotations by experts.</v-list-item
                  >
                </v-list>
              </v-card-text>
            </v-card-item>
          </v-card>
          <v-card variant="flat" class="mx-auto mt-8" max-width="800">
            <v-card-text class="mt-4">
              This web application allows the exchange of mouse vocalisation recording files.<br />
              <v-img
                :width="300"
                class="mt-3 mb-3"
                src="fair_data_principles.jpg"
                alt="FAIR"
              ></v-img>
              This new version is more
              <nuxt-link href="https://www.go-fair.org/fair-principles/" target="_blank"
                >FAIR (Findable, Accessible, Interoperable, Reusable)</nuxt-link
              >. Through mouseTube, you can upload your data on a repository.<br />
              You can be part of the community by clicking here.<br />
              Check out the mouseTube's publications: <br />
              <v-list>
                <v-list-item>
                  Torquet N., de Chaumont F., Faure P., Bourgeron T., Ey E. mouseTube – a database
                  to collaboratively unravel mouse ultrasonic communication [version 1; peer review:
                  2 approved]. F1000Research 2016, 5:2332 (<nuxt-link
                    href="https://doi.org/10.12688/f1000research.9439.1"
                    target="_blank"
                    >https://doi.org/10.12688/f1000research.9439.1</nuxt-link
                  >) (2016).
                </v-list-item>
                <v-list-item>
                  Ferhat A. T., Torquet N., Le Sourd A. M., de Chaumont F., Olivo-Marin J. C., Faure
                  P., Bourgeron T., Ey E. Recording Mouse Ultrasonic Vocalizations to Evaluate
                  Social Communication. J. Vis. Exp. (112), e53871,
                  <nuxt-link href="https://dx.doi.org/10.3791/53871" target="_blank"
                    >doi:10.3791/53871</nuxt-link
                  >
                  (2016).
                </v-list-item>
              </v-list>

              <v-row justify="center" no-gutters>
                <v-col class="text-h4">
                  {{ numberOfFiles }} vocalisation files available now!
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-actions>
              <nuxt-link to="https://mastodon.social/@mousetube" target="_blank" class="nuxt-link"
                ><v-btn prepend-icon="mdi-mastodon">Follow mouseTube on Mastodon</v-btn></nuxt-link
              >
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <logo-strip></logo-strip>
      </v-row>
    </v-container>
  </v-main>
</template>

<script>
import axios from 'axios';

export default {
  name: 'index',
  data: function () {
    return {
      numberOfFiles: [],
    };
  },
  methods: {
    getNumberOfFiles() {
      axios
        .get(`http://127.0.0.1:8000/api/file`)
        .then((response) => {
          this.numberOfFiles = response.data.length;
          this.dataLoaded = true;
        })
        .catch((error) => {
          //eslint-disable-next-line no-console
          console.log(JSON.stringify(error));
        });
    },
  },
  mounted() {
    this.getNumberOfFiles();
  },
};
</script>

<style scoped>
a {
  text-decoration: none;
  color: teal;
}

a:hover {
  text-decoration: underline;
}

.max-v-list-height {
  max-height: 200px;
  overflow-y: auto;
}
</style>
