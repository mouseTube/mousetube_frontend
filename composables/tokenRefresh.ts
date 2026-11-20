import axios, { type AxiosInstance } from 'axios';
import { token, refresh } from '@/composables/useAuth';

// The access token lives 1 h. On a 401, renew it once with the refresh token and replay the
// request, so users are not logged out in the middle of a session. The renewal is shared: several
// requests failing at once make a single call.
let renewing: Promise<string | null> | null = null;

function renew(authBase: string): Promise<string | null> {
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
  return renewing;
}

/** Renew the token on a 401 and replay the request. An instance made with axios.create() does not
 *  inherit the interceptors of the global axios: call this on it too. */
export function attachTokenRefresh(instance: AxiosInstance, authBase: string) {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      const isAuthCall = (config?.url ?? '').includes('/auth/jwt/');
      if (error.response?.status !== 401 || !refresh.value || config?._retried || isAuthCall) {
        return Promise.reject(error);
      }
      config._retried = true;

      const newToken = await renew(authBase);
      if (!newToken) return Promise.reject(error);
      config.headers.Authorization = `Bearer ${newToken}`;
      return instance(config);
    }
  );
}
