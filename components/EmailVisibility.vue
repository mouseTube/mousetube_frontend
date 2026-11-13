<script setup>
// Lets the signed-in user show or hide his e-mail address next to his recordings.
// Hidden by default: it is the user profile that stores the choice (email_public).
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

const { token, id_user, fetchUser } = useAuth();
const apiBaseUrl = useApiBaseUrl();
const headers = () => ({ headers: { Authorization: `Bearer ${token.value}` } });

const profileId = ref(null);
const isPublic = ref(false);
const saving = ref(false);
const failed = ref(false);

onMounted(async () => {
  try {
    if (!id_user.value) await fetchUser();
    const res = await axios.get(`${apiBaseUrl}/user_profile/?user_id=${id_user.value}`, headers());
    profileId.value = res.data[0]?.id ?? null;
    isPublic.value = !!res.data[0]?.email_public;
  } catch {
    failed.value = true;
  }
});

const save = async (value) => {
  if (!profileId.value) return;
  saving.value = true;
  failed.value = false;
  try {
    await axios.patch(
      `${apiBaseUrl}/user_profile/${profileId.value}/`,
      { email_public: value },
      headers()
    );
  } catch {
    isPublic.value = !value; // the server refused: show what is really stored
    failed.value = true;
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div v-if="profileId" class="email-visibility">
    <v-switch
      v-model="isPublic"
      :loading="saving"
      :disabled="saving"
      color="primary"
      density="compact"
      hide-details
      label="Show my e-mail address next to my recordings"
      @update:model-value="save"
    />
    <p class="text-caption text-medium-emphasis mb-0">
      {{
        isPublic
          ? 'Visitors can see your e-mail address on your recordings.'
          : 'Your e-mail address is hidden: only you and the administrators can see it.'
      }}
      You can change this at any time in your account settings.
    </p>
    <p v-if="failed" class="text-caption text-error mb-0" role="alert">
      The setting could not be saved. Please try again.
    </p>
  </div>
</template>
