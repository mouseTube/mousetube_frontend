<script setup lang="ts">
// The optional e-mails: the user chooses which ones he receives (stored in the profile). The mails about
// the security of the account and the answer to an account request are not optional.
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

const { token, id_user, fetchUser } = useAuth();
const apiBaseUrl = useApiBaseUrl();
const headers = () => ({ headers: { Authorization: `Bearer ${token.value}` } });

type Key = 'notify_validation' | 'notify_publication';
const profileId = ref<number | null>(null);
const values = ref<Record<Key, boolean>>({ notify_validation: true, notify_publication: true });
const saving = ref<Key | null>(null);
const failed = ref(false);

const options: { key: Key; label: string; hint: string }[] = [
  {
    key: 'notify_validation',
    label: 'When an administrator validates, or sends back, what I submitted',
    hint: 'Recording sessions, hardware, software, protocols...',
  },
  {
    key: 'notify_publication',
    label: 'When the publication of a session on a repository is done or fails',
    hint: 'For example the deposit on Zenodo.',
  },
];

onMounted(async () => {
  try {
    if (!id_user.value) await fetchUser();
    const res = await axios.get(`${apiBaseUrl}/user_profile/?user_id=${id_user.value}`, headers());
    const profile = res.data[0];
    profileId.value = profile?.id ?? null;
    for (const { key } of options) values.value[key] = profile?.[key] !== false;
  } catch {
    failed.value = true;
  }
});

const save = async (key: Key, value: boolean | null) => {
  if (!profileId.value) return;
  saving.value = key;
  failed.value = false;
  try {
    await axios.patch(
      `${apiBaseUrl}/user_profile/${profileId.value}/`,
      { [key]: !!value },
      headers()
    );
  } catch {
    values.value[key] = !value; // the server refused: show what is really stored
    failed.value = true;
  } finally {
    saving.value = null;
  }
};
</script>

<template>
  <div v-if="profileId">
    <p class="text-body-2 mb-1">Send me an e-mail:</p>
    <div v-for="option in options" :key="option.key" class="mb-1">
      <v-switch
        v-model="values[option.key]"
        :loading="saving === option.key"
        :disabled="saving !== null"
        color="primary"
        density="compact"
        hide-details
        :label="option.label"
        @update:model-value="(v) => save(option.key, v)"
      />
      <p class="text-caption text-medium-emphasis mb-0 ml-12">{{ option.hint }}</p>
    </div>
    <p class="text-caption text-medium-emphasis mt-2 mb-0">
      You always receive the e-mails about the security of your account (password, e-mail address)
      and the answer to an account request.
    </p>
    <p v-if="failed" class="text-caption text-error mb-0" role="alert">
      The setting could not be saved. Please try again.
    </p>
  </div>
</template>
