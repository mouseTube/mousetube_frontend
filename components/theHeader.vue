<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->
<script setup>
import { Users, AudioLines, MonitorCog, Mic, Warehouse, Database, User } from 'lucide-vue-next';
import { ref } from 'vue';
import { useDisplay } from 'vuetify';
import { useAuth } from '@/composables/useAuth';
import { useRouter } from 'vue-router';

const drawer = ref(false);
const { smAndDown } = useDisplay();
const { currentUser, logout } = useAuth();
const router = useRouter();

const links = [
  { to: '/vocalizations', label: 'Vocalizations', icon: AudioLines },
  { to: '/software', label: 'Software', icon: MonitorCog },
  { to: '/hardware', label: 'Hardware', icon: Mic },
  { to: '/repositories', label: 'Repositories', icon: Warehouse },
  { to: '/dataset', label: 'Dataset', icon: Database },
  { to: '/team', label: 'Team', icon: Users },
];

const handleLogout = async () => {
  logout();
  router.push('/login');
};
</script>

<template>
  <v-app-bar role="navigation" color="#0d0d0d" height="56" dense flat>
    <v-row no-gutters align="center" class="w-100">
      <!-- Burger -->
      <v-col cols="auto" v-if="smAndDown">
        <v-btn icon @click="drawer = !drawer" aria-label="Toggle menu">
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </v-col>

      <!-- Logo -->
      <v-col cols="auto" class="d-flex align-center flex-shrink-1">
        <nuxt-link to="/" class="nuxt-link text-truncate" exact-active-class="active-logo">
          <v-img
            :width="smAndDown ? 40 : 60"
            :height="smAndDown ? 40 : 60"
            src="/logo_mousetube_carre.png"
            alt="MouseTube"
            class="logo-img"
            style="background: white; padding: 4px; object-fit: contain; border-radius: 50%"
          />
          <span class="ml-2 site-title">MouseTube</span>
        </nuxt-link>
      </v-col>

      <!-- Liens navbar (hors mobile) -->
      <v-col cols="auto" class="nav-links d-flex justify-center align-center" v-if="!smAndDown">
        <template v-for="link in links" :key="link.to">
          <nuxt-link :to="link.to" class="nav-item px-2" exact-active-class="active-link">
            <span class="nav-link-content">
              <component :is="link.icon" class="nav-icon audio-hover-icon" />
              <span class="nav-label">{{ link.label }}</span>
            </span>
          </nuxt-link>
        </template>
      </v-col>

      <!-- Login button -->
      <v-col
        cols="auto"
        v-if="!smAndDown"
        class="d-flex align-center flex-nowrap"
        style="width: 200px"
      >
        <template v-if="currentUser">
          <nuxt-link to="/account" class="nuxt-link nav-item px-2" exact-active-class="active-link">
            <span class="nav-link-content mr-2">
              <User class="nav-icon audio-hover-icon" />
              <span class="nav-label">{{ currentUser }}</span>
            </span>
          </nuxt-link>
          <v-btn
            class="ml-n2"
            color="red darken-2"
            variant="text"
            size="small"
            @click="handleLogout"
          >
            Log out
          </v-btn>
        </template>
        <template v-else>
          <nuxt-link to="/login" class="nuxt-link nav-item px-2" exact-active-class="active-link">
            <span class="nav-link-content">
              <User class="nav-icon audio-hover-icon" />
              <span class="nav-label">Login</span>
            </span>
          </nuxt-link>
        </template>
      </v-col>
    </v-row>
  </v-app-bar>

  <!-- Drawer mobile -->
  <v-navigation-drawer v-model="drawer" temporary location="left" color="black" class="text-white">
    <div class="d-flex flex-column h-100">
      <v-list nav dense>
        <template v-for="link in links" :key="link.to">
          <v-list-item :to="link.to" exact-active-class="active-link">
            <template #prepend>
              <component
                :is="link.icon"
                class="me-3 nav-icon audio-icon audio-hover-icon"
                size="20"
              />
            </template>
            <v-list-item-title>{{ link.label }}</v-list-item-title>
          </v-list-item>
        </template>
      </v-list>

      <v-spacer />

      <v-divider color="white" />

      <v-list nav dense>
        <template v-if="currentUser">
          <v-list-item>
            <template #prepend>
              <User class="me-3 nav-icon audio-icon audio-hover-icon" size="20" />
            </template>
            <nuxt-link
              to="/account"
              class="nuxt-link nav-item px-2"
              exact-active-class="active-link"
            >
              <v-list-item-title>{{ currentUser }}</v-list-item-title>
            </nuxt-link>
            <template #append>
              <v-btn color="primary" variant="text" size="small" @click="handleLogout">
                Log out
              </v-btn>
            </template>
          </v-list-item>
        </template>
        <template v-else>
          <v-list-item to="/login" exact-active-class="active-link">
            <template #prepend>
              <User class="me-3 nav-icon audio-icon audio-hover-icon" size="20" />
            </template>
            <v-list-item-title>Login</v-list-item-title>
          </v-list-item>
        </template>
      </v-list>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
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

.nav-label {
  font-size: 20px;
  font-weight: 700;
  color: white;
  transition: color 0.3s ease;
}

.nav-item:hover .audio-hover-icon {
  animation: wiggle 0.5s ease-in-out;
}

.logo-img {
  filter: grayscale(30%);
  transition:
    filter 0.3s ease,
    box-shadow 0.3s ease;
}

.nuxt-link:hover .logo-img,
.active-logo .logo-img {
  filter: grayscale(0%);
  box-shadow:
    inset 0 0 5px rgba(157, 157, 157, 0.5),
    inset 0 0 10px rgba(157, 157, 157, 0.3),
    inset 0 0 20px rgba(157, 157, 157, 0.2);
}

.nav-icon {
  stroke: white;
  transition: stroke 0.3s ease;
  margin-right: 8px;
}

.nav-label {
  color: white;
  transition: color 0.3s ease;
}

.site-title {
  color: white;
  font-size: 20px;
  font-weight: 800;
}

.nuxt-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: white;
  font-weight: 800;
  font-size: 20px;
}

.nav-item {
  padding: 8px 16px;
  text-decoration: none;
}

.nav-links {
  gap: 16px;
  flex-grow: 2;
  flex-wrap: wrap;
}

@media screen and (max-width: 1400px) {
  .nav-label {
    font-size: 16px;
    font-weight: 700;
  }
  .nav-item {
    font-size: 16px;
    padding: 8px 12px;
  }
  .site-title {
    font-size: 16px;
  }
  .logo-img {
    width: 40px;
  }
}

@media screen and (max-width: 1250px) {
  .nav-label {
    font-size: 12px;
    font-weight: 700;
  }
  .nav-item {
    font-size: 12px;
    padding: 8px 12px;
  }
}

@media screen and (max-width: 1150px) {
  .nav-icon {
    width: 23px;
    height: 23px;
  }
  .nav-label {
    display: none;
  }
}

.nav-item:hover .nav-icon,
.active-link .nav-icon {
  stroke: red;
}

.nav-item:hover .nav-label,
.active-link .nav-label {
  color: #ccc;
}

.v-list-item:hover .audio-hover-icon {
  animation: wiggle 0.5s ease-in-out;
  stroke: red;
}

.nav-link-content {
  display: inline-flex;
  align-items: center;
}

.nav-item {
  display: inline-flex;
  align-items: center;
}
</style>
