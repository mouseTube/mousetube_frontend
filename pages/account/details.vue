<script setup>
import OrcidIcon from '@/components/OrcidIcon.vue';
////////////////////////////
// IMPORTS
////////////////////////////
import { ref, onMounted, watch, computed } from 'vue';
import { useAuth, isStaff } from '@/composables/useAuth';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';
import SoftwareListContent from '@/components/SoftwareListContent.vue';
import HardwareListContent from '@/components/HardwareListContent.vue';
import EmailVisibility from '@/components/EmailVisibility.vue';
import MyVocalizations from '@/components/MyVocalizations.vue';
import ReviewStatus from '@/components/ReviewStatus.vue';
import LaboratoryModal from '@/components/modals/LaboratoryModal.vue';
import { useLaboratoryStore } from '@/stores/laboratory';
import { useHardwareStore } from '@/stores/hardware';
import { useSoftwareStore } from '@/stores/software';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

////////////////////////////
// DATA
////////////////////////////
const router = useRouter();
const route = useRoute();
const { currentUser, token, id_user, fetchUser, refreshToken } = useAuth();
const labStore = useLaboratoryStore();
const hardwareStore = useHardwareStore();
const softwareStore = useSoftwareStore();

// the number on each tab: the same lists as the tabs show
const vocalizationCount = ref(null);
const reviewCount = ref(0); // administrators: what waits for a decision
const hardwareLoaded = ref(false);
const softwareLoaded = ref(false);
const hardwareCount = computed(() =>
  hardwareLoaded.value ? hardwareStore.hardwares.length : null
);
const softwareCount = computed(() =>
  softwareLoaded.value ? softwareStore.acquisitionSoftwareCount : null
);

async function loadCounts() {
  axios
    .get(`${apiBaseUrl}/recording-session/`, {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    .then((res) => (vocalizationCount.value = res.data.count))
    .catch(() => {});
  if (isStaff.value) {
    axios
      .get(`${apiBaseUrl}/review/`, { headers: { Authorization: `Bearer ${token.value}` } })
      .then((res) => (reviewCount.value = res.data.total))
      .catch(() => {});
  }
  hardwareStore
    .fetchAllHardware()
    .then(() => (hardwareLoaded.value = true))
    .catch(() => {});
  softwareStore
    .fetchAllSoftwareVersions()
    .then(() => (softwareLoaded.value = true))
    .catch(() => {});
}

const tab = ref('info');
const showToken = ref(false);
const profileError = ref(false);
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
  profileError.value = false;
  try {
    const res = await axios.get(`${apiBaseUrl}/user_profile/?user_id=${id_user.value}`, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    userProfile.value = res.data[0] ?? null;
    profileError.value = !userProfile.value; // answered, but nothing for this account
    if (userProfile.value?.view_mode) viewMode.value = userProfile.value.view_mode;
    if (userProfile.value?.laboratory?.id) selectedLabId.value = userProfile.value.laboratory.id;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load the profile', e);
    userProfile.value = null;
    profileError.value = true;
  }
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

async function onLabSaved(newLab) {
  showLabModal.value = false;
  await fetchLaboratories();
  if (newLab?.id) {
    selectedLabId.value = newLab.id;
    await saveLaboratory();
  }
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

// Change the first and last name (shown with every recording of the user)
const editingName = ref(false);
const savingName = ref(false);
const nameError = ref('');
const nameForm = ref({ first_name: '', last_name: '' });
const nameSnackbar = ref(false);

const startEditName = () => {
  nameForm.value = {
    first_name: userProfile.value?.user?.first_name || '',
    last_name: userProfile.value?.user?.last_name || '',
  };
  nameError.value = '';
  editingName.value = true;
};

const saveName = async () => {
  savingName.value = true;
  nameError.value = '';
  try {
    const res = await axios.patch(
      `${baseUrl.value}/auth/users/me/`,
      {
        first_name: nameForm.value.first_name.trim(),
        last_name: nameForm.value.last_name.trim(),
      },
      { headers: { Authorization: `Bearer ${token.value}` } }
    );
    userProfile.value = {
      ...userProfile.value,
      user: { ...userProfile.value.user, ...res.data },
    };
    editingName.value = false;
    nameSnackbar.value = true;
  } catch (e) {
    const data = e?.response?.data || {};
    nameError.value =
      data.first_name?.[0] ||
      data.last_name?.[0] ||
      data.detail ||
      'The name could not be saved. Please try again.';
  } finally {
    savingName.value = false;
  }
};

// What the header shows about the user
const displayName = computed(
  () =>
    [userProfile.value?.user?.first_name, userProfile.value?.user?.last_name]
      .filter(Boolean)
      .join(' ') ||
    userProfile.value?.user?.username ||
    currentUser.value ||
    ''
);
const initials = computed(() =>
  displayName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
);
const selectedLab = computed(() => laboratories.value.find((l) => l.id === selectedLabId.value));
// the token is a secret: masked until the user asks to see it
const maskedToken = computed(() =>
  token.value ? `${token.value.slice(0, 8)}…${token.value.slice(-6)}` : ''
);

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
  loadCounts();

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
  <v-main class="w-100">
    <v-container fluid>
      <v-card variant="flat" class="mx-auto" max-width="1000">
        <div class="eyebrow">
          <span class="title-bar" aria-hidden="true"></span>
          <span class="text-overline">Account</span>
        </div>

        <!-- Who you are -->
        <v-card variant="outlined" rounded="xl" class="profile-head mt-4 pa-5">
          <div class="d-flex align-center flex-wrap ga-4">
            <v-avatar color="grey-darken-3" size="64" class="profile-avatar">
              <span class="text-h6">{{ initials || '?' }}</span>
            </v-avatar>
            <div class="flex-grow-1">
              <div class="d-flex align-center flex-wrap ga-2">
                <h1 class="text-h6 font-weight-bold">{{ displayName }}</h1>
                <v-chip v-if="isStaff" size="small" variant="tonal" color="primary" label>
                  Administrator
                </v-chip>
              </div>
              <div class="text-body-2 text-medium-emphasis">
                @{{ userProfile?.user?.username || currentUser }}
                <template v-if="userProfile?.user?.email"> · {{ userProfile.user.email }}</template>
              </div>
            </div>
            <div class="d-flex align-center ga-2">
              <!-- administrators only: what waits for their decision -->
              <v-btn
                v-if="isStaff"
                to="/review"
                color="primary"
                variant="flat"
                size="small"
                prepend-icon="mdi-clipboard-check-outline"
              >
                Review
                <span v-if="reviewCount" class="review-count">{{ reviewCount }}</span>
              </v-btn>
              <v-chip
                v-if="userProfile?.orcid"
                :href="`https://orcid.org/${userProfile.orcid}`"
                target="_blank"
                size="small"
                variant="tonal"
                color="success"
                label
              >
                <v-icon start size="16" :icon="OrcidIcon" />
                {{ userProfile.orcid }}
              </v-chip>
              <v-btn
                v-else-if="userProfile"
                size="small"
                variant="outlined"
                :prepend-icon="OrcidIcon"
                @click="linkOrcid"
              >
                Link my ORCID
              </v-btn>
            </div>
          </div>
        </v-card>

        <!-- Tabs -->
        <v-tabs v-model="tab" class="account-tabs mt-6" color="primary" hide-slider show-arrows>
          <v-tab value="info">Profile</v-tab>
          <v-tab value="params">Preferences</v-tab>
          <v-tab value="vocalizations"
            >My vocalizations<span v-if="vocalizationCount !== null" class="tab-count">{{
              vocalizationCount
            }}</span></v-tab
          >
          <v-tab value="hardware"
            >My hardware<span v-if="hardwareCount !== null" class="tab-count">{{
              hardwareCount
            }}</span></v-tab
          >
          <v-tab value="software"
            >My software<span v-if="softwareCount !== null" class="tab-count">{{
              softwareCount
            }}</span></v-tab
          >
          <v-tab value="token">API token</v-tab>
        </v-tabs>

        <v-card variant="outlined" rounded="xl" class="account-card mt-3">
          <v-window v-model="tab" class="pa-5">
            <!-- Profile -->
            <v-window-item value="info">
              <v-alert
                v-if="profileError"
                type="warning"
                variant="tonal"
                class="mb-4"
                title="We could not load your profile"
              >
                Your session may have expired, or the server did not answer.
                <template #append>
                  <v-btn variant="outlined" size="small" @click="fetchUserProfile">Try again</v-btn>
                </template>
              </v-alert>
              <div v-if="userProfile">
                <div class="d-flex align-center justify-space-between mb-3">
                  <h2 class="section-title ma-0">Identity</h2>
                  <v-btn
                    v-if="!editingName"
                    variant="text"
                    size="small"
                    prepend-icon="mdi-pencil-outline"
                    @click="startEditName"
                  >
                    Edit name
                  </v-btn>
                </div>

                <v-form v-if="editingName" class="mb-6" @submit.prevent="saveName">
                  <div class="d-flex flex-wrap ga-3">
                    <v-text-field
                      v-model="nameForm.first_name"
                      label="First name"
                      variant="outlined"
                      density="comfortable"
                      maxlength="150"
                      autocomplete="given-name"
                      hide-details="auto"
                      class="flex-grow-1"
                      style="min-width: 220px"
                    />
                    <v-text-field
                      v-model="nameForm.last_name"
                      label="Last name"
                      variant="outlined"
                      density="comfortable"
                      maxlength="150"
                      autocomplete="family-name"
                      hide-details="auto"
                      class="flex-grow-1"
                      style="min-width: 220px"
                    />
                  </div>
                  <p class="text-caption text-medium-emphasis mt-2 mb-0">
                    Your name is shown with every recording you add, including the ones already
                    published.
                  </p>
                  <p v-if="nameError" class="text-caption text-error mt-2 mb-0" role="alert">
                    {{ nameError }}
                  </p>
                  <div class="d-flex ga-2 mt-3">
                    <v-btn type="submit" color="primary" :loading="savingName">Save</v-btn>
                    <v-btn variant="text" :disabled="savingName" @click="editingName = false">
                      Cancel
                    </v-btn>
                  </div>
                </v-form>

                <dl class="facts mb-6">
                  <div class="fact">
                    <dt>Username</dt>
                    <dd>{{ userProfile.user?.username }}</dd>
                  </div>
                  <div v-if="!editingName" class="fact">
                    <dt>First name</dt>
                    <dd>{{ userProfile.user?.first_name || '—' }}</dd>
                  </div>
                  <div v-if="!editingName" class="fact">
                    <dt>Last name</dt>
                    <dd>{{ userProfile.user?.last_name || '—' }}</dd>
                  </div>
                  <div class="fact">
                    <dt>E-mail</dt>
                    <dd>{{ userProfile.user?.email || '—' }}</dd>
                  </div>
                </dl>

                <h2 class="section-title">Laboratory</h2>
                <div class="d-flex align-start flex-wrap ga-3">
                  <v-select
                    v-model="selectedLabId"
                    :items="laboratories"
                    item-title="name"
                    item-value="id"
                    label="Your laboratory"
                    density="comfortable"
                    variant="outlined"
                    clearable
                    hide-details
                    class="flex-grow-1"
                    style="min-width: 260px"
                    @update:model-value="saveLaboratory"
                  />
                  <v-btn variant="outlined" prepend-icon="mdi-plus" @click="openCreateLabModal">
                    New laboratory
                  </v-btn>
                  <v-btn
                    v-if="canEditSelectedLab"
                    variant="text"
                    prepend-icon="mdi-pencil-outline"
                    @click="openEditLabModal"
                  >
                    Edit
                  </v-btn>
                </div>

                <dl v-if="userProfile.laboratory" class="facts mt-4">
                  <div class="fact">
                    <dt>Unit</dt>
                    <dd>{{ userProfile.laboratory.unit || '—' }}</dd>
                  </div>
                  <div class="fact">
                    <dt>Institution</dt>
                    <dd>{{ userProfile.laboratory.institution || '—' }}</dd>
                  </div>
                  <div class="fact">
                    <dt>Country</dt>
                    <dd>{{ userProfile.laboratory.country || '—' }}</dd>
                  </div>
                </dl>
                <p v-else class="text-body-2 text-medium-emphasis mt-3 mb-0">
                  No laboratory selected yet. Choose one, or create it if it is missing.
                </p>
                <div v-if="selectedLab && canEditSelectedLab" class="mt-3">
                  <ReviewStatus
                    :key="selectedLab.id"
                    endpoint="laboratory"
                    :id="selectedLab.id"
                    :status="selectedLab.status"
                  />
                </div>
              </div>
            </v-window-item>

            <!-- Preferences -->
            <v-window-item value="params">
              <h2 class="section-title">Lists</h2>
              <p class="text-body-2 text-medium-emphasis mb-4">
                How the vocalization, software and hardware lists open by default.
              </p>
              <v-btn-toggle
                v-model="viewMode"
                mandatory
                divided
                density="comfortable"
                color="primary"
              >
                <v-btn value="cards" prepend-icon="mdi-view-agenda-outline">Cards</v-btn>
                <v-btn value="table" prepend-icon="mdi-table">Table</v-btn>
              </v-btn-toggle>

              <v-divider class="my-6" />
              <h2 class="section-title">Privacy</h2>
              <EmailVisibility />
            </v-window-item>

            <!-- Vocalizations -->
            <v-window-item value="vocalizations">
              <MyVocalizations @deleted="loadCounts" />
            </v-window-item>

            <!-- Hardware -->
            <v-window-item value="hardware">
              <HardwareListContent />
            </v-window-item>

            <!-- Software -->
            <v-window-item value="software">
              <SoftwareListContent />
            </v-window-item>

            <!-- Token -->
            <v-window-item value="token">
              <h2 class="section-title">Personal access token</h2>
              <p class="text-body-2">
                This key lets a script or an application act as <strong>you</strong> on the
                mouseTube API (Swagger, Python, <code>curl</code>…).
              </p>
              <v-alert type="warning" variant="tonal" density="comfortable" class="my-4">
                For developers only. Never share it or put it in code that others can read: anyone
                who has it can act on your behalf.
              </v-alert>

              <div class="token-box">
                <code>{{ showToken ? token : maskedToken }}</code>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  :aria-label="showToken ? 'Hide the token' : 'Show the token'"
                  @click="showToken = !showToken"
                >
                  <v-icon>{{ showToken ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  aria-label="Copy the token"
                  @click="copyToken"
                >
                  <v-icon>mdi-content-copy</v-icon>
                </v-btn>
              </div>
              <v-btn
                variant="outlined"
                class="mt-4"
                prepend-icon="mdi-refresh"
                @click="refreshToken"
              >
                Refresh the token
              </v-btn>

              <v-snackbar v-model="snackbar" :timeout="3000" color="success">
                Token copied!
              </v-snackbar>
            </v-window-item>
          </v-window>
        </v-card>

        <v-snackbar v-model="nameSnackbar" :timeout="3000" color="success" location="top">
          Name saved!
        </v-snackbar>
        <v-snackbar v-model="saveSnackbar" :timeout="3000" color="success" location="top">
          Laboratory saved!
        </v-snackbar>
      </v-card>
    </v-container>

    <!-- Laboratory Modal -->
    <LaboratoryModal v-model="showLabModal" :edit-id="editLabId" @saved="onLabSaved" />
  </v-main>
</template>

<style scoped>
h1 {
  margin: 0;
}
.profile-head {
  border-color: #e4e4e4;
}
.profile-avatar {
  color: #fff;
}
.account-card {
  border-color: #e4e4e4;
}
.account-tabs :deep(.v-slide-group__content) {
  gap: 6px;
}
.account-tabs .v-tab {
  min-width: 0;
  padding: 0 14px;
  border-radius: 12px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}
.account-tabs .v-tab--selected {
  background: #f6f6f6;
}
/* the number of items of a tab, in a small round */
.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  margin-left: 8px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ececec;
  color: #444;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.review-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  margin-left: 8px;
  padding: 0 6px;
  border-radius: 999px;
  background: #fff;
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 700;
}
.account-tabs .v-tab--selected .tab-count {
  background: rgb(var(--v-theme-primary));
  color: #fff;
}
.section-title {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 700;
}
.token-box {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 8px 8px 14px;
  border: 1px solid #e4e4e4;
  border-radius: 12px;
  background: #fafafa;
}
.token-box code {
  flex: 1;
  overflow-wrap: anywhere;
  font-size: 0.8rem;
}
</style>
