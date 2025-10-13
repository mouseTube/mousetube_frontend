import { defineStore } from 'pinia';
import axios from 'axios';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';

export interface Repository {
  id: number;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  area?: string;
  url?: string | null;
  url_api?: string | null;
}

export const useRepositoryStore = defineStore('repository', {
  state: () => ({
    repositories: [] as Repository[],
    selectedRepository: null as Repository | null,
    loading: false,
  }),

  actions: {
    async fetchRepositories() {
      this.loading = true;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
        const res = await axios.get(`${apiBaseUrl}/repository/`);

        const data = Array.isArray(res.data) ? res.data : res.data.results || [];

        this.repositories = data.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          logo_url: r.logo ? `${baseUrl}${r.logo}` : null,
          area: r.area,
          url: r.url,
          url_api: r.url_api,
        }));

        // ✅ Pré-sélection automatique du repository id=1
        if (!this.selectedRepository && this.repositories.length > 0) {
          const defaultRepo = this.repositories.find((r) => r.id === 1) || this.repositories[0];
          this.selectedRepository = defaultRepo;
        }
      } catch (err) {
        console.error('Failed to fetch repositories:', err);
      } finally {
        this.loading = false;
      }
    },

    selectRepository(repo: Repository) {
      this.selectedRepository = repo;
    },
  },
});
