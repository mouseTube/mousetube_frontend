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

const tiles = [
  {
    to: '/vocalizations',
    icon: 'mdi-waveform',
    title: 'Vocalizations',
    text: 'Search recordings by species, protocol or equipment.',
  },
  {
    to: '/dataset',
    icon: 'mdi-database',
    title: 'Datasets',
    text: 'Curated collections with their metadata, ready to cite.',
  },
  {
    to: '/software',
    icon: 'mdi-application-cog',
    title: 'Software',
    text: 'Tools used to record and analyse vocalizations.',
  },
  {
    to: '/hardware',
    icon: 'mdi-microphone',
    title: 'Hardware',
    text: 'Microphones, sound cards and speakers.',
  },
  {
    to: '/repositories',
    icon: 'mdi-warehouse',
    title: 'Repositories',
    text: 'Where the files are stored and how to reach them.',
  },
];
const fair = ['Findable', 'Accessible', 'Interoperable', 'Reusable'];

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
      console.error(JSON.stringify(error));
    });
};

onMounted(() => {
  getNumberOfFiles();
});
</script>

<template>
  <v-main class="w-100 home">
    <!-- Hero -->
    <section class="hero">
      <v-container class="pt-5 pb-8 pb-md-10">
        <v-row align="center">
          <v-col cols="12" md="7">
            <div class="eyebrow">
              <span class="title-bar" aria-hidden="true"></span>
              <span class="text-overline">Open science</span>
            </div>
            <h1 class="hero-title">
              Share, find and reuse<br />
              rodent ultrasonic vocalizations
            </h1>
            <p class="hero-lead">
              MouseTube is an open database of raw recordings, with the protocols, animals and
              equipment behind each of them.
            </p>
            <nuxt-link to="/vocalizations" class="stat mt-6" aria-live="polite">
              <div class="soundwaves" aria-hidden="true">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
              <span v-if="dataLoaded">
                <strong>{{ numberOfFiles }}</strong> vocalization files available
              </span>
              <v-progress-circular v-else color="primary" size="16" width="2" indeterminate />
            </nuxt-link>
          </v-col>
          <v-col cols="12" md="5" class="d-flex justify-center">
            <img src="/logo_mousetube_big.png" alt="MouseTube logo" class="hero-logo" />
          </v-col>
        </v-row>
      </v-container>
    </section>

    <v-container class="py-8">
      <!-- Where to go -->
      <v-row>
        <v-col v-for="tile in tiles" :key="tile.to" cols="12" sm="6" md="4" class="tile-col">
          <v-card :to="tile.to" variant="outlined" class="tile h-100" rounded="xl">
            <v-card-text class="d-flex flex-column ga-2">
              <v-avatar color="grey-darken-3" variant="tonal" size="44">
                <v-icon class="tile-icon">{{ tile.icon }}</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold">{{ tile.title }}</div>
              <div class="text-body-2 text-medium-emphasis">{{ tile.text }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- What's new -->
      <v-card class="news mt-8" variant="flat" rounded="xl">
        <v-card-text class="d-flex flex-column flex-md-row ga-4 pa-6">
          <v-avatar color="grey-darken-3" size="52"
            ><v-icon size="28">mdi-newspaper-variant-outline</v-icon></v-avatar
          >
          <div>
            <div class="text-h6 font-weight-bold mb-3">What’s new?</div>
            <div class="news-item">
              <div class="news-date">09/10/2026</div>
              <p class="mb-0 text-body-1">
                A publication in The Biologist, the magazine from the Royal Society of Biology
                (RSB), presents the original framework of MouseTube and its perspectives. Read how
                mouseTube integrates into the scientific landscape
                <nuxt-link
                  href="https://biologist.rsb.org.uk/can_you_squeak_up_please.html"
                  target="_blank"
                  >here</nuxt-link
                >.
              </p>
            </div>
            <div class="news-item">
              <div class="news-date">10/06/2026</div>
              <p class="mb-0 text-body-1">
                Two datasets were added: one with mouse vocalisation recordings and one with rat
                vocalisation recordings. These recordings are manually annotated by two experts and
                automatically analysed by six algorithms with basic settings (DeepSqueak, Avisoft
                SASLab Pro, Sonotrack, LMT USV Toolbox, UsvSeg, RatRec). Annotations and
                segmentations are available for benchmarking or to challenge your own application.
              </p>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- About -->
      <v-row class="mt-6">
        <v-col cols="12" md="4">
          <h2 class="text-h5 font-weight-bold d-flex align-center">
            <v-icon class="me-2">mdi-rodent</v-icon>
            What is MouseTube?
          </h2>
          <div class="accent mt-3"></div>
        </v-col>
        <v-col cols="12" md="8">
          <p class="prose">
            Rodents communicate with each other through their various sensory modalities: olfaction
            (scent marking, glands), vision (postures), touch (contacts) and hearing
            (vocalizations). In the latter case, vocalizations are mainly emitted in the ultrasonic
            range, beyond human perception capabilities (<nuxt-link
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
            >), or of susceptibility to stress or anxiety, depending on the type of signal examined
            (<nuxt-link href="https://doi.org/10.1007/s10519-004-0858-3" target="_blank"
              >Brudzynski, 2005</nuxt-link
            >). Ultrasonic vocalizations are therefore routinely measured in rodent models of
            neuropsychiatric conditions (<nuxt-link
              href="https://doi.org/10.1111/ejn.15957"
              target="_blank"
              >Premoli et al., 2023</nuxt-link
            >).
          </p>
          <p class="prose">
            The mechanisms of production, the temporal organization into sequences, the significance
            of the acoustic features and the effect on the recipient are far from elucidated.
            Understanding the complexity of this communication system requires a vast amount of data
            to explore with high-performance analysis methods. For that purpose, we developed
            <strong>MouseTube</strong>, a database designed to facilitate sharing, archiving and
            analysing raw recording files of rodent ultrasonic vocalizations following the FAIR
            (Findable, Accessible, Interoperable, Reusable) principles (<nuxt-link
              href="https://doi.org/10.1038/sdata.2016.18"
              target="_blank"
              >Wilkinson et al., 2016</nuxt-link
            >).
          </p>
          <div class="d-flex flex-wrap ga-2 mt-2">
            <v-chip v-for="p in fair" :key="p" variant="tonal">{{ p }}</v-chip>
          </div>
        </v-col>
      </v-row>

      <!-- Partners -->
      <div class="text-overline text-medium-emphasis text-center mt-10">With the support of</div>
      <logo-strip />
    </v-container>
  </v-main>
</template>

<style scoped>
a {
  color: #222;
  text-decoration: underline;
  text-decoration-color: #bbb;
  text-underline-offset: 3px;
}

a:hover {
  text-decoration-color: #c62828;
}

.hero {
  background: linear-gradient(180deg, #fff 0%, #f6f6f6 100%);
  border-bottom: 1px solid #ececec;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: #555;
}

.title-bar {
  width: 40px;
  height: 4px;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
}

.hero-title {
  font-size: clamp(1.9rem, 4vw, 3rem);
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.hero-lead {
  max-width: 34rem;
  margin-top: 16px;
  font-size: 1.15rem;
  line-height: 1.6;
  color: #555;
}

.hero-logo {
  width: 100%;
  max-width: 380px;
  height: auto;
}

.stat,
.tile {
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.stat:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  border-color: #222;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 18px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e4e4e4;
  color: #111;
  font-size: 0.95rem;
  text-decoration: none;
}

.stat strong {
  font-weight: 800;
}

.stat:hover .soundwaves div {
  animation-duration: 0.5s;
}

.tile {
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  border-color: #e4e4e4;
}

.tile:hover :deep(.v-card__overlay) {
  opacity: 0;
}

.tile:hover .tile-icon {
  color: rgb(var(--v-theme-primary));
  animation: wiggle 0.5s ease-in-out;
}

@keyframes wiggle {
  0% {
    transform: rotate(0deg) scaleY(1);
  }
  25% {
    transform: rotate(-3deg) scaleY(1.1);
  }
  50% {
    transform: rotate(3deg) scaleY(1.05);
  }
  75% {
    transform: rotate(-2deg) scaleY(1.08);
  }
  100% {
    transform: rotate(0deg) scaleY(1);
  }
}

.tile:hover {
  text-decoration: none;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  border-color: #222;
}

.news {
  background: #f6f6f6;
  border: 1px solid #e4e4e4;
}

.news-item + .news-item {
  margin-top: 16px;
}

.news-date {
  margin-bottom: 2px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #666;
}

.accent {
  width: 56px;
  height: 4px;
  border-radius: 4px;
  background: #222;
}

.prose {
  max-width: 46rem;
  margin-bottom: 1rem;
  font-size: 1rem;
  line-height: 1.75;
  color: #333;
}

/* five tiles on one row on large screens (Vuetify has no 1/5 column) */
@media (min-width: 1280px) {
  .tile-col {
    flex: 0 0 20%;
    max-width: 20%;
  }
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

@media (prefers-reduced-motion: reduce) {
  .soundwaves div {
    animation: none;
  }
  .tile,
  .stat {
    transition: none;
  }
  .tile:hover .tile-icon {
    animation: none;
  }
}
</style>
