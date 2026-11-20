<script setup>
// "Check links": administrators check that the download links of the files still answer. Same
// frame as the Review page, and open to administrators only.
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth, isStaff } from '@/composables/useAuth';
import LinkCheck from '@/components/LinkCheck.vue';

const router = useRouter();
const { currentUser, fetchUser } = useAuth();

onMounted(async () => {
  if (!currentUser.value) await fetchUser();
  if (!isStaff.value) router.replace('/');
});
</script>

<template>
  <v-main class="w-100">
    <v-container fluid>
      <v-card variant="flat" class="mx-auto" max-width="1000">
        <div class="d-flex align-center justify-space-between">
          <div class="eyebrow">
            <span class="title-bar" aria-hidden="true"></span>
            <span class="text-overline">Admin</span>
          </div>
          <v-btn
            to="/account/details"
            variant="text"
            size="small"
            prepend-icon="mdi-arrow-left"
            class="me-n2"
          >
            Back to my profile
          </v-btn>
        </div>
        <h1>Check links</h1>
        <p class="text-body-1 mt-2 mb-4">
          Checks that the download link of each file still answers, and updates its state. It runs
          in the background, one link a second, so it takes a while: you can leave this page and
          come back.
        </p>
        <LinkCheck v-if="isStaff" />
      </v-card>
    </v-container>
  </v-main>
</template>
