import axios from 'axios';
import { token, refresh } from '@/composables/useAuth';

// The access token lives 1 h. On a 401, renew it once with the refresh token and replay
// the request, so users are not logged out in the middle of a session.
let renewing: Promise<string | null> | null = null;

export default defineNuxtPlugin(() => {
  const authBase = useApiBaseUrl().replace(/\/api\/?$/, '');

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      const isAuthCall = (config?.url ?? '').includes('/auth/jwt/');
      if (error.response?.status !== 401 || !refresh.value || config?._retried || isAuthCall) {
        return Promise.reject(error);
      }
      config._retried = true;

      renewing ??= axios
        .post(`${authBase}/auth/jwt/refresh/`, { refresh: refresh.value })
        .then((res) => (token.value = res.data.access as string))
        .catch(() => {
          token.value = null;
          refresh.value = null;
          return null;
        })
        .finally(() => {
          renewing = null;
        });

      const newToken = await renewing;
      if (!newToken) return Promise.reject(error);
      config.headers.Authorization = `Bearer ${newToken}`;
      return axios(config);
    }
  );
});
