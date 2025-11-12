import { defineStore } from 'pinia';
import axios from 'axios';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';

export interface Favorite {
  id: number;
  content_type:
    | 'protocol'
    | 'software'
    | 'hardware'
    | 'animalprofile'
    | 'strain'
    | 'species'
    | 'reference'
    | 'contact';
  object_id: number;
  created_at: string | null;
}

export const useFavoriteStore = defineStore('favorite', {
  state: () => ({
    favorites: [] as Favorite[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {};
    },

    async fetchAllFavorites() {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        let page = 1;
        let allResults: Favorite[] = [];
        let hasNext = true;

        while (hasNext) {
          const res = await axios.get(`${apiBaseUrl}/favorite/`, {
            headers: this.getAuthHeaders(),
            params: { page },
          });

          allResults = allResults.concat(res.data.results);
          hasNext = !!res.data.next;
          page += 1;
        }

        this.favorites = allResults;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch favorites';
      } finally {
        this.loading = false;
      }
    },

    async addFavorite(content_type: Favorite['content_type'], object_id: number) {
      this.error = null;
      try {
        if (this.isFavorite(content_type, object_id)) return null;
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.post(
          `${apiBaseUrl}/favorite/`,
          { content_type_name: content_type, object_id },
          { headers: this.getAuthHeaders() }
        );

        this.favorites.push(res.data);
        return res.data;
      } catch (err: any) {
        this.error = err.message || 'Failed to add favorite';
        throw err;
      }
    },

    async removeFavorite(favoriteId: number) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        await axios.delete(`${apiBaseUrl}/favorite/${favoriteId}/`, {
          headers: this.getAuthHeaders(),
        });

        this.favorites = this.favorites.filter((f) => f.id !== favoriteId);
      } catch (err: any) {
        this.error = err.message || 'Failed to remove favorite';
        throw err;
      }
    },

    getFavoriteId(content_type: Favorite['content_type'], object_id: number) {
      const fav = this.favorites.find(
        (f) => f.content_type === content_type && f.object_id === object_id
      );
      return fav?.id ?? null;
    },

    isFavorite(content_type: Favorite['content_type'], object_id: number) {
      return this.favorites.some(
        (f) => f.content_type === content_type && f.object_id === object_id
      );
    },

    isEmpty() {
      return this.favorites.length === 0;
    },

    async toggleFavorite(content_type: Favorite['content_type'], object_id: number) {
      const favId = this.getFavoriteId(content_type, object_id);

      if (favId) {
        await this.removeFavorite(favId);
      } else {
        await this.addFavorite(content_type, object_id);
      }
    },
  },
});
