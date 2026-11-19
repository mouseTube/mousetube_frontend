<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->
<script setup>
import { AudioLines, MonitorCog, Mic, Warehouse, Database, Users } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';

const { currentUser } = useAuth();
// the API documentation is served by the API itself, next to /api
const apiBaseUrl = useApiBaseUrl();
const apiDocs = `${apiBaseUrl.replace(/\/api\/?$/, '')}/swagger/`;

// the version of the web application: package.json; the one of the API: asked to the API, which
// reads it in its pyproject.toml (nothing is shown while it is not known)
const version = useRuntimeConfig().public.appVersion;
const apiVersion = ref('');
onMounted(async () => {
  try {
    apiVersion.value = (await axios.get(`${apiBaseUrl}/version/`)).data.version || '';
  } catch {
    apiVersion.value = '';
  }
});
const repositories = [
  {
    name: 'mousetube_API',
    url: 'https://github.com/mouseTube/mousetube_API',
    text: 'API (Django REST framework)',
    api: true,
  },
  {
    name: 'mousetube_frontend',
    url: 'https://github.com/mouseTube/mousetube_frontend',
    text: 'Web application (Nuxt)',
  },
];

const explore = [
  // the icons of the menu of the top bar
  { to: '/vocalizations', label: 'Vocalizations', icon: AudioLines },
  { to: '/dataset', label: 'Datasets', icon: Database },
  { to: '/software', label: 'Software', icon: MonitorCog },
  { to: '/hardware', label: 'Hardware', icon: Mic },
  { to: '/repositories', label: 'Repositories', icon: Warehouse },
  { to: '/team', label: 'Team', icon: Users },
];
</script>

<template>
  <!-- the partners, in their own colours, on a light band above the black footer -->
  <section class="partners" aria-labelledby="partners-title">
    <v-container class="py-8">
      <h2 id="partners-title" class="partners-title">With the support of</h2>
      <logo-strip />
    </v-container>
  </section>

  <v-footer color="#0d0d0d" class="footer">
    <v-container class="pt-10 pb-5">
      <v-row>
        <v-col cols="12" md="3">
          <div class="d-flex align-center ga-3 mb-3">
            <img src="/logo_mousetube_carre.png" alt="" class="footer-logo" />
            <span class="footer-brand">Mouse<span class="footer-brand-tube">Tube</span></span>
          </div>
          <p class="footer-lead">
            An open database of raw rodent ultrasonic vocalizations, with the protocols, animals and
            equipment behind each recording. Findable, accessible, interoperable, reusable.
          </p>
        </v-col>

        <v-col cols="6" sm="4" md="2">
          <h2 class="footer-title">Explore</h2>
          <ul class="footer-list">
            <li v-for="link in explore" :key="link.to">
              <nuxt-link :to="link.to" class="nuxt-link">
                <component :is="link.icon" :size="16" class="footer-icon me-2" />{{ link.label }}
              </nuxt-link>
            </li>
          </ul>
        </v-col>

        <v-col cols="6" sm="4" md="2">
          <h2 class="footer-title">Contribute</h2>
          <ul class="footer-list">
            <li>
              <nuxt-link to="/vocalization/create" class="nuxt-link">Add a vocalization</nuxt-link>
            </li>
            <li v-if="currentUser">
              <nuxt-link to="/account/details?tab=vocalizations" class="nuxt-link"
                >Pick up one of my drafts</nuxt-link
              >
            </li>
            <template v-else>
              <li>
                <nuxt-link to="/account/register" class="nuxt-link">Create an account</nuxt-link>
              </li>
              <li><nuxt-link to="/account/login" class="nuxt-link">Log in</nuxt-link></li>
            </template>
            <li>
              <nuxt-link to="/team#term" class="nuxt-link">How to cite mouseTube</nuxt-link>
            </li>
          </ul>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <h2 class="footer-title">
            <v-icon size="16" class="me-1">mdi-github</v-icon>Open source
          </h2>
          <ul class="footer-list">
            <li v-for="repo in repositories" :key="repo.name">
              <a :href="repo.url" target="_blank" rel="noopener" class="nuxt-link">{{
                repo.name
              }}</a>
              <span class="footer-note d-block"
                >{{ repo.text
                }}<template v-if="repo.api ? apiVersion : version">
                  · v{{ repo.api ? apiVersion : version }}</template
                ></span
              >
            </li>
            <li>
              <a
                href="https://github.com/mouseTube"
                target="_blank"
                rel="noopener"
                class="nuxt-link"
              >
                All repositories <v-icon size="14">mdi-arrow-right</v-icon>
              </a>
            </li>
          </ul>
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <h2 class="footer-title">Resources</h2>
          <ul class="footer-list">
            <li>
              <a :href="apiDocs" target="_blank" rel="noopener" class="nuxt-link"
                >API documentation</a
              >
            </li>
            <li>
              <nuxt-link to="https://mastodon.social/@mousetube" target="_blank" class="nuxt-link">
                <v-icon size="16" class="me-1">mdi-mastodon</v-icon>Mastodon
              </nuxt-link>
            </li>
            <li>
              <a href="mailto:mousetube@igbmc.fr" class="nuxt-link">
                <v-icon size="16" class="me-1">mdi-email-outline</v-icon>mousetube@igbmc.fr
              </a>
            </li>
          </ul>
        </v-col>
      </v-row>

      <div class="footer-bottom">
        <div class="footer-text">
          mouseTube v{{ version }} · © CNRS · INSERM · UNISTRA · ICS · IGBMC 2025
        </div>
        <nav class="d-flex flex-wrap justify-center ga-5" aria-label="Legal">
          <nuxt-link to="/team#privacy" class="nuxt-link">
            <v-icon size="16" class="me-1">mdi-shield-lock-outline</v-icon>Privacy Policy
          </nuxt-link>
          <nuxt-link to="/team#term" class="nuxt-link">
            <v-icon size="16" class="me-1">mdi-scale-balance</v-icon>Terms of Use
          </nuxt-link>
        </nav>
      </div>
    </v-container>
  </v-footer>
</template>

<style scoped>
.footer {
  padding-top: 0;
  padding-bottom: 0;
  /* a plain line over the whole width where the page meets the black band (as on fair3r.fr) */
  border-top: 3px solid rgb(var(--v-theme-primary));
}
.footer-logo {
  /* a white disc, as behind the logo of the top bar: the picture has black parts */
  width: 40px;
  height: 40px;
  padding: 4px;
  border-radius: 50%;
  background: #fff;
  object-fit: contain;
}
.footer-brand {
  color: #fff;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.footer-brand-tube {
  color: #e53935;
}
.footer-lead {
  max-width: 34ch;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.875rem;
  line-height: 1.6;
}
.footer-title {
  margin-bottom: 12px;
  color: #9a9a9a;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.footer-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.footer-icon {
  vertical-align: -3px;
  stroke: rgba(255, 255, 255, 0.7);
  transition: stroke 0.2s ease;
}
.nuxt-link:hover .footer-icon,
.nuxt-link:focus-visible .footer-icon {
  stroke: #e53935;
}
.partners {
  background: #f6f6f6;
  border-top: 1px solid #e4e4e4;
}
.partners-title {
  margin: 0 0 4px;
  color: #666;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-align: center;
  text-transform: uppercase;
}
.footer-note {
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.8rem;
}
.footer-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
@media (min-width: 960px) {
  .footer-bottom {
    flex-direction: row;
  }
}

.footer-text {
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.875rem;
}

.nuxt-link {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.875rem;
  text-decoration: none;
}

.nuxt-link:hover,
.nuxt-link:focus-visible {
  color: #fff;
}
/* as in the menu: the name stays white, the icon turns red */
.nuxt-link .v-icon {
  transition: color 0.2s ease;
}
.nuxt-link:hover .v-icon,
.nuxt-link:focus-visible .v-icon {
  color: #e53935;
}
</style>
