<script setup>
////////////////////////////
// IMPORTS
////////////////////////////
import { ref, onMounted, watch, computed } from 'vue';
import { useAuth } from '@/composables/useAuth';
import axios from 'axios';
import { User } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';
import SoftwareListContent from '@/components/SoftwareListContent.vue';
import HardwareListContent from '@/components/HardwareListContent.vue';
import LaboratoryModal from '@/components/modals/LaboratoryModal.vue';
import { useLaboratoryStore } from '@/stores/laboratory';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

////////////////////////////
// DATA
////////////////////////////
const router = useRouter();
const route = useRoute();
const { currentUser, token, id_user, fetchUser, refreshToken } = useAuth();
const labStore = useLaboratoryStore();

const tab = ref('info');
const userProfile = ref(null);
const viewMode = ref('cards');
const snackbar = ref(false);
const isLoadingUser = ref(true);

const apiBaseUrl = useApiBaseUrl();
const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));

// Laboratory-related
const laboratories = ref([]);
const selectedLabId = ref(null);
const showLabModal = ref(false);
const editLabId = ref(null);
const saveSnackbar = ref(false);

////////////////////////////
// METHODS
////////////////////////////
function copyToken() {
  if (navigator.clipboard && token) {
    navigator.clipboard.writeText(token.value).then(() => {
      snackbar.value = true;
    });
  }
}

const fetchUserProfile = async () => {
  const res = await axios.get(`${apiBaseUrl}/user_profile/?user_id=${id_user.value}`, {
    headers: { Authorization: `Bearer ${token.value}` },
  });
  userProfile.value = res.data[0];
  if (userProfile.value?.view_mode) viewMode.value = userProfile.value.view_mode;
  if (userProfile.value?.laboratory?.id) selectedLabId.value = userProfile.value.laboratory.id;
};

const saveViewMode = async (newMode) => {
  if (!userProfile.value) return;
  try {
    await axios.patch(
      `${apiBaseUrl}/user_profile/${userProfile.value.id}/`,
      { view_mode: newMode },
      { headers: { Authorization: `Bearer ${token.value}` } }
    );
    userProfile.value.view_mode = newMode;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save view mode:', error);
  }
};

const linkOrcid = () => {
  const state = btoa(JSON.stringify({ process: 'connect' }));
  window.location.href = `${baseUrl.value}/accounts/orcid/login/?process=connect`;
};

// Laboratory management
async function fetchLaboratories() {
  await labStore.fetchAllLaboratories();
  laboratories.value = labStore.laboratories;
}

function openCreateLabModal() {
  editLabId.value = null;
  showLabModal.value = true;
}

function openEditLabModal() {
  const lab = laboratories.value.find((l) => l.id === selectedLabId.value);
  if (!lab) return;
  if (lab.created_by !== id_user.value) {
    alert('You can only edit laboratories you created.');
    return;
  }
  editLabId.value = lab.id;
  showLabModal.value = true;
}

const canEditSelectedLab = computed(() => {
  const lab = laboratories.value.find((l) => l.id === selectedLabId.value);
  return lab && lab.created_by === id_user.value;
});

async function onLabSaved() {
  showLabModal.value = false;
  await fetchLaboratories();
  await fetchUserProfile();
}

// Save selected laboratory
const saveLaboratory = async () => {
  if (!userProfile.value) return;
  try {
    await axios.patch(
      `${apiBaseUrl}/user_profile/${userProfile.value.id}/`,
      { laboratory_id: selectedLabId.value },
      { headers: { Authorization: `Bearer ${token.value}` } }
    );
    await fetchUserProfile();
    saveSnackbar.value = true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to save laboratory', e);
  }
};

//////////////////////////////
// ON MOUNTED
//////////////////////////////
onMounted(async () => {
  isLoadingUser.value = true;
  await fetchUser();
  if (!currentUser.value) {
    router.push('/account/login');
    return;
  }

  await fetchUserProfile();
  await fetchLaboratories();

  if (route.query.tab) {
    tab.value = String(route.query.tab);
  }

  isLoadingUser.value = false;
});

//////////////////////////////
// WATCHERS
//////////////////////////////
watch(viewMode, (newVal) => saveViewMode(newVal));
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
        <!-- User Info -->
        <v-card-title>
          <v-avatar color="red lighten-4" size="48" class="me-4">
            <User />
          </v-avatar>
          <span class="nav-label">{{ userProfile?.user?.username || currentUser }}</span>
        </v-card-title>

        <!-- Tabs -->
        <v-tabs v-model="tab" color="red darken-2" background-color="red lighten-5">
          <v-tab value="info">Information</v-tab>
          <v-tab value="params">Parameters</v-tab>
          <v-tab value="hardware">Hardware</v-tab>
          <v-tab value="software">Software</v-tab>
          <v-tab value="token">Token</v-tab>
        </v-tabs>

        <v-divider />

        <v-window v-model="tab" class="pa-4">
          <!-- Info Tab -->
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
                    class="ms-2"
                    @click="linkOrcid"
                    prepend-icon="mdi-link"
                  >
                    Link my Orcid account
                  </v-btn>
                </template>
              </p>

              <!-- Laboratory Section -->
              <v-divider class="my-4"></v-divider>
              <p class="mb-2"><strong>Laboratory:</strong></p>
              <v-select
                v-model="selectedLabId"
                :items="laboratories"
                item-title="name"
                item-value="id"
                label="Select your laboratory"
                density="comfortable"
                variant="outlined"
                clearable
              />

              <v-row class="mt-2" dense>
                <v-col cols="auto">
                  <v-btn color="primary" size="small" @click="openCreateLabModal">
                    <v-icon start>mdi-plus</v-icon>
                    Add Laboratory
                  </v-btn>
                </v-col>
                <v-col cols="auto" v-if="canEditSelectedLab">
                  <v-btn color="secondary" size="small" @click="openEditLabModal">
                    <v-icon start>mdi-pencil</v-icon>
                    Edit Laboratory
                  </v-btn>
                </v-col>
                <v-col cols="auto">
                  <v-btn color="success" size="small" @click="saveLaboratory">
                    <v-icon start>mdi-content-save</v-icon>
                    Save
                  </v-btn>
                </v-col>
              </v-row>

              <p class="mt-3">
                <strong>Unit:</strong> {{ userProfile?.laboratory?.unit || 'No unit available' }}
              </p>
              <p>
                <strong>Institution:</strong>
                {{ userProfile?.laboratory?.institution || 'No institution available' }}
              </p>
              <p>
                <strong>Country:</strong>
                {{ userProfile?.laboratory?.country || 'No country available' }}
              </p>
            </div>
          </v-window-item>
          <v-snackbar v-model="saveSnackbar" :timeout="3000" color="green" top>
            Laboratory saved successfully!
          </v-snackbar>

          <!-- Params Tab -->
          <v-window-item value="params">
            <div>
              <p>Choose your default view mode:</p>
              <v-radio-group v-model="viewMode" row>
                <v-radio label="Cards" value="cards" />
                <v-radio label="Table" value="table" />
              </v-radio-group>
            </div>
          </v-window-item>

          <!-- Hardware Tab -->
          <v-window-item value="hardware">
            <HardwareListContent />
          </v-window-item>

          <!-- Software Tab -->
          <v-window-item value="software">
            <SoftwareListContent />
          </v-window-item>

          <!-- Token Tab -->
          <!-- Token Tab -->
          <v-window-item value="token">
            <div class="pa-4">
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-h6">🔐 Developer Access Token</v-card-title>
                <v-card-text>
                  <p>
                    This token is a <strong>personal access key</strong> that allows external
                    applications or scripts to authenticate as <strong>you</strong> when
                    communicating with the mouseTube API.
                  </p>
                  <p>
                    ⚠️ <strong>For developers only</strong>: never share your token publicly or
                    include it in code that others can see. Anyone with this token can act on your
                    behalf.
                  </p>
                  <p class="text-caption text-grey">
                    Example usage: accessing the API programmatically from Python, R, or
                    command-line tools like <code>curl</code>.
                  </p>
                </v-card-text>
              </v-card>

              <p><strong>Your Token:</strong></p>
              <v-sheet color="grey-lighten-4" rounded class="pa-2 mb-3">
                <code>{{ token }}</code>
              </v-sheet>

              <v-btn color="primary" @click="refreshToken" class="me-4">Refresh Token</v-btn>
              <v-btn color="primary" @click="copyToken">Copy Token</v-btn>

              <v-snackbar v-model="snackbar" :timeout="3000" color="green">
                Token copied!
              </v-snackbar>
            </div>
          </v-window-item>
        </v-window>
      </v-card>
    </v-container>

    <!-- Laboratory Modal -->
    <LaboratoryModal v-model="showLabModal" :edit-id="editLabId" @saved="onLabSaved" />
  </v-main>
</template>
