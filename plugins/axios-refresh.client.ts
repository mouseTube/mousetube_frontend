import axios from 'axios';
import { attachTokenRefresh } from '@/composables/tokenRefresh';

export default defineNuxtPlugin(() => {
  const authBase = useApiBaseUrl().replace(/\/api\/?$/, '');
  attachTokenRefresh(axios, authBase);
});
