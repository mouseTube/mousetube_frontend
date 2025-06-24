<script setup>
////////////////////////////
// IMPORT
////////////////////////////
import { ref, onMounted } from 'vue';
import { useAuth } from '@/composables/useAuth';
import axios from 'axios';
import { User } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { watch } from 'vue';

////////////////////////////
// DATA
////////////////////////////

const router = useRouter();
const { currentUser, token, id_user, fetchUser, refreshToken } = useAuth();
const tab = ref('info');
const userProfile = ref(null);
const hardware = ref([]);
const software = ref([]);
const isLoadingUser = ref(true);
const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

////////////////////////////
// METHODS
////////////////////////////

/**
 * Fetch user profile data from the API
 */
const fetchUserProfile = async () => {
  const res = await axios.get(`${apiBaseUrl}/user_profile/?user_id=` + String(id_user.value), {
    headers: { Authorization: `Bearer ${token.value}` },
  });
  userProfile.value = res.data[0];
};

/**
 * Fetch Hardware data from the API
 */
const fetchHardware = async () => {
  const res = await axios.get(`${apiBaseUrl}/hardware/`, {
    headers: { Authorization: `Bearer ${token.value}` },
  });
  hardware.value = res.data.results || res.data;
};

/**
 * Fetch Software data from the API
 */
const fetchSoftware = async () => {
  const res = await axios.get(`${apiBaseUrl}/software/`, {
    headers: { Authorization: `Bearer ${token.value}` },
  });
  software.value = res.data.results || res.data;
};

const linkOrcid = () => {
  const state = btoa(JSON.stringify({ process: 'connect' }));
  window.location.href = `${baseUrl.value}/accounts/orcid/login/?process=connect`;
};

//////////////////////////////
// ON MOUNTED
//////////////////////////////

onMounted(async () => {
  await fetchUser();
  isLoadingUser.value = false;
  fetchUserProfile();
  fetchHardware();
  fetchSoftware();
  if (currentUser.value === null) {
    router.push('/account/login');
  }
});

////////////////////////////////
// WATCHER
////////////////////////////////

watch(
  () => currentUser.value,
  (val) => {
    if (!val && !isLoadingUser.value) {
      router.push('/account/login');
    }
  }
);
</script>

<template>
  <v-main>
    <v-container>
      <v-card max-width="700" class="mx-auto">
        <v-card-title>
          <v-avatar color="red lighten-4" size="48" class="mr-4">
            <User />
          </v-avatar>
          <span class="nav-label">{{ userProfile?.user?.username || currentUser }}</span>
        </v-card-title>
        <v-tabs v-model="tab" color="red darken-2" background-color="red lighten-5">
          <v-tab value="info">Information</v-tab>
          <v-tab value="params">Parameters</v-tab>
          <v-tab value="token">Token</v-tab>
          <v-tab value="hardware">Hardware</v-tab>
          <v-tab value="software">Software</v-tab>
        </v-tabs>
        <v-divider />
        <v-window v-model="tab" class="pa-4">
          <v-window-item value="info">
            <i>This is your user profile information.</i>
            <v-divider class="my-4"></v-divider>
            <div v-if="userProfile">
              <p><strong>Username:</strong> {{ userProfile?.user?.username }}</p>
              <p><strong>Email:</strong> {{ userProfile?.user?.email }}</p>
              <p><strong>First name:</strong> {{ userProfile?.user?.first_name }}</p>
              <p><strong>Last name:</strong> {{ userProfile?.user?.last_name }}</p>
              <p>
                <strong>Orcid: </strong>
                <template v-if="userProfile?.orcid">
                  {{ userProfile.orcid }}
                </template>
                <template v-else>
                  <v-btn
                    color="green darken-2"
                    size="small"
                    class="ml-2"
                    @click="linkOrcid"
                    prepend-icon="mdi-link"
                  >
                    Link my Orcid account
                  </v-btn>
                </template>
              </p>
              <p>
                <strong>Unit:</strong>
                {{ userProfile?.laboratory?.unit || 'No unit available' }}
              </p>
              <p>
                <strong>Institution:</strong>
                {{ userProfile?.laboratory?.institution || 'No institution available' }}
              </p>
            </div>
          </v-window-item>
          <v-window-item value="params">
            <div>
              <p>Parameters tab content (add your settings here).</p>
            </div>
          </v-window-item>
          <v-window-item value="token">
            <div>
              <p><strong>Token:</strong> {{ token }}</p>
              <v-btn color="red darken-2" @click="refreshToken">Refresh Token</v-btn>
            </div>
          </v-window-item>
          <v-window-item value="hardware">
            <div>
              <h4>My Hardware</h4>
              <v-list>
                <v-list-item v-for="hw in hardware" :key="hw.id">
                  <v-list-item-title>{{ hw.name }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </div>
          </v-window-item>
          <v-window-item value="software">
            <div>
              <h4>My Software</h4>
              <v-list>
                <v-list-item v-for="sw in software" :key="sw.id">
                  <v-list-item-title>{{ sw.name }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </div>
          </v-window-item>
        </v-window>
      </v-card>
    </v-container>
  </v-main>
</template>
