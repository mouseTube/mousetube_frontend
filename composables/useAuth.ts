import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import axios from 'axios'
import { useFavoriteStore } from '@/stores/favorite';

export const currentUser = ref<string | null>(null)
export const id_user = ref<number | null>(null)
export const token = useStorage<string | null>('auth_token', null, localStorage)
export const refresh = useStorage<string | null>('refresh_token', null, localStorage)

export function useAuth() {
  const apiBaseUrl = useApiBaseUrl();
  const baseUrl = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''))
  const favoriteStore = useFavoriteStore()

  const init = async () => {
    if (token.value) {
      try {
        await fetchUser()
      } catch (e) {
        console.warn('[auth] Token invalid, logging out')
        logout()
      }
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const res = await axios.post(`${baseUrl.value}/auth/jwt/create/`, {
        username,
        password,
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      token.value = res.data.access;
      if (res.data.refresh) refresh.value = res.data.refresh;
      currentUser.value = username;
      await favoriteStore.fetchAllFavorites();
      return true;
    } catch (error: any) {
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.username?.[0] ||
        error.message;
      throw new Error(msg);
    }
  };

  const logout = () => {
    currentUser.value = null
    token.value = null
    refresh.value = null
  }

  const loginWithToken = async (accessToken: string) => {
    try {
      token.value = accessToken;

      const res = await axios.get(`${baseUrl.value}/auth/users/me/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      currentUser.value = res.data.username;
      id_user.value = res.data.id;

      await favoriteStore.fetchAllFavorites()
      
      return true;
    } catch (error: any) {
      logout();
      throw new Error('Invalid token');
    }
  };

  const fetchUser = async () => {
    if (!token.value) return null

    const res = await axios.get(`${baseUrl.value}/auth/users/me/`, {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    })
    id_user.value = res.data.id
    currentUser.value = res.data.username
    return res.data
  }

  const refreshToken = async () => {
    if (!refresh.value) return
    const res = await axios.post(`${baseUrl.value}/auth/jwt/refresh/`, {
      refresh: refresh.value,
    });
    token.value = res.data.access;
  };

  const loggedIn = computed(() => !!token.value);

  return {
    currentUser,
    token,
    refresh,
    id_user,
    loggedIn,
    login,
    logout,
    fetchUser,
    refreshToken,
    loginWithToken,
    init
  }
}