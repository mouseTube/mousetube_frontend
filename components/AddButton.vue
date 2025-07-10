<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { computed } from 'vue';

const router = useRouter();
const auth = useAuth();
const isAuthenticated = computed(() => auth.loggedIn);

type NavItem = {
  title: string;
  icon: string;
  to: string;
};

const items: NavItem[] = [
  { title: 'Vocalization', icon: 'mdi-waveform', to: '/files/create' },
  { title: 'Software', icon: 'mdi-application', to: '/softwares/create' },
  { title: 'Hardware', icon: 'mdi-cpu-64-bit', to: '/hardwares/create' },
];

function navigate(item: NavItem) {
  router.push(item.to);
}
</script>

<template>
  <div v-if="isAuthenticated.value">
    <v-menu>
      <template #activator="{ props }">
        <v-btn color="primary" icon v-bind="props">
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-list-item v-for="item in items" :key="item.title" @click="navigate(item)">
          <v-list-item-title>{{ item.title }}</v-list-item-title>
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>
