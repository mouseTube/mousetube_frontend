<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->
<script setup>
import { Users, AudioLines, MonitorCog, Mic, Warehouse, Database, User, Plus } from '@lucide/vue';
import { ref } from 'vue';
import { useDisplay } from 'vuetify';
import { useAuth } from '@/composables/useAuth';
import { useRouter } from 'vue-router';
import SoftwareModal from '@/components/modals/SoftwareModal.vue';
import HardwareModal from '@/components/modals/HardwareModal.vue';

const drawer = ref(false);
const { smAndDown } = useDisplay();
const { currentUser, logout } = useAuth();
const router = useRouter();
const route = useRoute();
const showSoftwareModal = ref(false);
const newSoftwareFromSoftware = ref(false);
const showHardwareModal = ref(false);
const newHardwareFromHardware = ref(false);

const links = [
  { to: '/vocalizations', label: 'Vocalizations', icon: AudioLines },
  { to: '/software', label: 'Software', icon: MonitorCog },
  { to: '/hardware', label: 'Hardware', icon: Mic },
  { to: '/repositories', label: 'Repositories', icon: Warehouse },
  { to: '/dataset', label: 'Dataset', icon: Database },
  { to: '/team', label: 'Team', icon: Users },
];

const isMenuOpen = ref(false);

// what can be added: a title and a line saying what it is for
const addItems = [
  {
    key: 'vocalization',
    title: 'Vocalization',
    text: 'Describe a recording and upload its files.',
    icon: AudioLines,
    run: () => refreshPage(),
  },
  {
    key: 'software',
    title: 'Software',
    text: 'A tool used to record or analyse vocalizations.',
    icon: MonitorCog,
    run: () => openSoftwareModal(),
  },
  {
    key: 'hardware',
    title: 'Hardware',
    text: 'A microphone, soundcard, speaker or amplifier.',
    icon: Mic,
    run: () => openHardwareModal(),
  },
];
const chooseAdd = (item) => {
  isMenuOpen.value = false;
  item.run();
};

const handleLogout = async () => {
  logout();
  router.push('/account/login');
};

function openSoftwareModal() {
  newSoftwareFromSoftware.value = true;
  showSoftwareModal.value = true;
}

function onSoftwareSaved(softwareId) {
  showSoftwareModal.value = false;

  if (newSoftwareFromSoftware.value) {
    router.push({ path: '/account/details', query: { tab: 'software' } });
    newSoftwareFromSoftware.value = false;
  }
}

function openHardwareModal() {
  newHardwareFromHardware.value = true;
  showHardwareModal.value = true;
}

function onHardwareSaved(hardwareId) {
  showHardwareModal.value = false;

  if (newHardwareFromHardware.value) {
    router.push({ path: '/account/details', query: { tab: 'hardware' } });
    newHardwareFromHardware.value = false;
  }
}

function refreshPage() {
  if (route.path === '/vocalization/create') {
    window.location.href = '/vocalization/create';
  } else {
    router.push('/vocalization/create');
  }
}
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
          <!-- The picture twice: the megaphone and the mouse, each cut out of the same image so
               they can move on their own when hovered. -->
          <span class="logo-img logo-badge" role="img" aria-label="MouseTube">
            <img src="/logo_mousetube_carre.png" alt="" class="logo-layer logo-megaphone" />
            <img src="/logo_mousetube_carre.png" alt="" class="logo-layer logo-mouse" />
          </span>
          <span class="ml-2 site-title">Mouse<span class="site-title-tube">Tube</span></span>
        </nuxt-link>
      </v-col>

      <!-- Navigation links -->
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
      <v-col cols="auto" v-if="!smAndDown" class="d-flex align-center flex-nowrap">
        <template v-if="currentUser">
          <v-menu v-model="isMenuOpen" location="bottom end" :offset="10" content-class="add-menu">
            <template #activator="{ props }">
              <v-btn
                color="white"
                size="small"
                v-bind="props"
                class="mr-4 nav-icon audio-hover-icon nav-item"
              >
                <Plus
                  size="20"
                  class="nav-icon audio-hover-icon"
                  :class="{ 'rotate-icon': isMenuOpen }"
                />
                Add
              </v-btn>
            </template>

            <div class="add-panel">
              <div class="add-title">Add to mouseTube</div>
              <button
                v-for="item in addItems"
                :key="item.key"
                type="button"
                class="add-item"
                @click="chooseAdd(item)"
              >
                <span class="add-icon"><component :is="item.icon" size="20" /></span>
                <span class="add-text">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.text }}</span>
                </span>
                <v-icon size="18" class="add-go">mdi-chevron-right</v-icon>
              </button>
              <nuxt-link
                to="/account/details?tab=vocalizations"
                class="add-foot"
                @click="isMenuOpen = false"
              >
                <v-icon size="16">mdi-folder-open-outline</v-icon>
                Pick up one of my drafts
              </nuxt-link>
            </div>
          </v-menu>
          <nuxt-link
            to="/account/details"
            class="nuxt-link nav-item px-2"
            exact-active-class="active-link"
          >
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
          <nuxt-link
            to="/account/login"
            class="nuxt-link nav-item px-2"
            exact-active-class="active-link"
          >
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
        <v-list-group v-if="currentUser">
          <template #activator="{ props, isOpen }">
            <v-list-item v-bind="props">
              <template #prepend>
                <Plus
                  size="20"
                  class="me-3 nav-icon audio-hover-icon"
                  :class="{ 'rotate-icon': isMenuOpen }"
                />
              </template>
              <v-list-item-title>Add</v-list-item-title>
            </v-list-item>
          </template>

          <v-list-item class="nuxt-link nav-item px-2" @click="refreshPage">
            <template #prepend>
              <AudioLines size="20" class="me-3 nav-icon audio-icon audio-hover-icon" />
            </template>
            <v-list-item-title>Vocalization</v-list-item-title>
          </v-list-item>

          <v-list-item @click="() => openSoftwareModal()">
            <template #prepend>
              <MonitorCog size="20" class="me-3 nav-icon audio-icon audio-hover-icon" />
            </template>
            <v-list-item-title>Software</v-list-item-title>
          </v-list-item>

          <v-list-item @click="() => openHardwareModal()">
            <template #prepend>
              <Mic size="20" class="me-3 nav-icon audio-icon audio-hover-icon" />
            </template>
            <v-list-item-title>Hardware</v-list-item-title>
          </v-list-item>
        </v-list-group>
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
              to="/account/details"
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
          <v-list-item to="/account/login" exact-active-class="active-link">
            <template #prepend>
              <User class="me-3 nav-icon audio-icon audio-hover-icon" size="20" />
            </template>
            <v-list-item-title>Login</v-list-item-title>
          </v-list-item>
        </template>
      </v-list>
    </div>
  </v-navigation-drawer>
  <SoftwareModal v-model="showSoftwareModal" @saved="onSoftwareSaved" />
  <HardwareModal v-model="showHardwareModal" @saved="onHardwareSaved" />
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
  font-size: 17px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  transition: color 0.2s ease;
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

/* --- logo: the mouse shouts into the megaphone when the link is hovered --- */
.logo-badge {
  --logo: 60px;
  position: relative;
  display: inline-block;
  flex: none;
  width: var(--logo);
  height: var(--logo);
  border-radius: 50%;
  background: #fff;
}
.logo-layer {
  position: absolute;
  inset: 4px;
  width: calc(100% - 8px);
  height: calc(100% - 8px);
  object-fit: contain;
}
/* megaphone (left part) and mouse (right part) of the same picture */
.logo-megaphone {
  clip-path: polygon(0 0, 63% 0, 63% 56%, 52% 62%, 50% 80%, 0 80%);
  transform-origin: 55% 60%;
}
.logo-mouse {
  clip-path: polygon(63% 0, 100% 0, 100% 100%, 40% 100%, 40% 80%, 50% 80%, 52% 62%, 63% 56%);
  transform-origin: 75% 90%;
}
/* rings that spread from the logo, like a sound */
.logo-badge::before,
.logo-badge::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #e53935;
  opacity: 0;
  pointer-events: none;
}

.nuxt-link:hover .logo-megaphone {
  animation: megaphone-shake 0.7s ease-in-out infinite;
}
.nuxt-link:hover .logo-mouse {
  animation: mouse-squeak 0.7s ease-in-out infinite;
}
.nuxt-link:hover .logo-badge::before {
  animation: sound-ring 1.6s ease-out infinite;
}
.nuxt-link:hover .logo-badge::after {
  animation: sound-ring 1.6s ease-out 0.8s infinite;
}

@keyframes megaphone-shake {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(-4deg) scale(1.04);
  }
  75% {
    transform: rotate(3deg) scale(1.04);
  }
}
@keyframes mouse-squeak {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-1.5%) scale(1.03);
  }
}
@keyframes sound-ring {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

/* the title: "Tube" is red, as on the megaphone, when hovered and on the home page */
.site-title {
  display: inline-block;
  padding-right: 6px; /* room for the shift on hover: the link clips what overflows */
  transition: transform 0.25s ease;
}
.site-title-tube {
  transition: color 0.25s ease;
}
.nuxt-link:hover .site-title {
  transform: translateX(3px);
}
.nuxt-link:hover .site-title-tube,
.active-logo .site-title-tube {
  color: #e53935;
}

@media (prefers-reduced-motion: reduce) {
  .nuxt-link:hover .logo-megaphone,
  .nuxt-link:hover .logo-mouse,
  .nuxt-link:hover .logo-badge::before,
  .nuxt-link:hover .logo-badge::after {
    animation: none;
  }
  .nuxt-link:hover .site-title {
    transform: none;
  }
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
  stroke: rgba(255, 255, 255, 0.85);
  transition: stroke 0.2s ease;
  margin-right: 8px;
}

.site-title {
  color: white;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.nuxt-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: white;
  font-weight: 700;
  font-size: 17px;
}

.nav-item {
  padding: 8px 14px;
  border-radius: 999px;
  text-decoration: none;
}

.nav-links {
  gap: 20px;
  flex-grow: 2;
  flex-wrap: wrap;
}

@media screen and (max-width: 1400px) {
  .logo-badge {
    --logo: 40px;
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
  stroke: #e53935;
}

/* the red name is the only mark of the current page: no pill, no grey overlay */
.nav-item:hover .nav-label,
.active-link .nav-label,
.v-list-item--active .v-list-item-title {
  color: #e53935;
}

.v-list-item--active :deep(.v-list-item__overlay),
.v-list-item:hover :deep(.v-list-item__overlay) {
  opacity: 0;
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

<style>
/* the menu of the "Add" button (rendered in an overlay, so not scoped) */
.add-menu.v-overlay__content {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
}
.add-panel {
  width: 340px;
  max-width: calc(100vw - 32px);
  padding: 8px;
  background: #fff;
  color: #111;
}
.add-title {
  padding: 8px 12px 6px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #777;
}
.add-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.add-item:hover,
.add-item:focus-visible {
  background: #f4f4f4;
  outline: none;
}
.add-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fbeaea;
  color: rgb(var(--v-theme-primary));
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.add-item:hover .add-icon,
.add-item:focus-visible .add-icon {
  background: rgb(var(--v-theme-primary));
  color: #fff;
}
.add-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.add-text strong {
  font-size: 0.98rem;
}
.add-text span {
  font-size: 0.82rem;
  color: #666;
}
.add-go {
  color: #aaa;
}
.add-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 4px 2px;
  padding: 10px 12px;
  border-top: 1px solid #eee;
  font-size: 0.85rem;
  font-weight: 600;
  color: #444 !important;
  text-decoration: none;
}
.add-foot:hover {
  color: rgb(var(--v-theme-primary)) !important;
}
</style>
