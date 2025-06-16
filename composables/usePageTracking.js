// composables/usePageTracking.js
import { useRoute } from 'vue-router';
import { onMounted, watch } from 'vue';
import axios from 'axios';

export function usePageTracking() {
  const route = useRoute();

  onMounted(() => {
    trackPageVisit(route.path);
  });

  watch(
    () => route.path,
    (newPath) => {
      trackPageVisit(newPath);
    }
  );
}

// send API request to record page visits
function trackPageVisit(path) {
  const apiBaseUrl = useApiBaseUrl();
  axios.post(`${apiBaseUrl}/track-page/`, { path }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to track page visit', error);
  });
}
