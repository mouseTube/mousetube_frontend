import { defineStore } from 'pinia';
import axios from 'axios';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { type Strain } from '~/stores/strain';

export interface AnimalProfile {
  id: number;
  name: string;
  description: string;
  strain: Strain | null;
  sex: string;
  genotype: string;
  treatment: string;
  status: string;
}

export const useAnimalProfileStore = defineStore('animalProfile', {
  state: () => ({
    animalProfiles: [] as AnimalProfile[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {}
    },
    async fetchAnimalProfiles(): Promise<AnimalProfile[]> {
      this.loading = true;
      this.error = null;
      this.animalProfiles = [];

      try {
        const apiBaseUrl = useApiBaseUrl();
        let url: string | null = `${apiBaseUrl}/animalprofile/`;
        const allProfiles: AnimalProfile[] = [];

        while (url) {
          const res: import('axios').AxiosResponse<{
            results?: AnimalProfile[];
            next?: string | null;
            [key: string]: any;
          }> = await axios.get(url, {
            headers: this.getAuthHeaders(),
          });

          if (Array.isArray(res.data.results)) {
            allProfiles.push(...res.data.results);
          } else {
            break;
          }

          url = res.data.next ?? null; 
        }

        this.animalProfiles = allProfiles;
        return this.animalProfiles;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch animal profiles';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchAnimalProfilesPage(
      page = 1,
      filters: Record<string, any> = {}
    ): Promise<{ results: AnimalProfile[]; count: number; next: string | null; previous: string | null }> {
      this.loading = true;
      this.error = null;

      try {
        const apiBaseUrl = useApiBaseUrl();

        const params = { page, ...filters };

        const res: import("axios").AxiosResponse<{
          results: AnimalProfile[];
          count: number;
          next: string | null;
          previous: string | null;
        }> = await axios.get(`${apiBaseUrl}/animalprofile/`, {
          params,
          headers: this.getAuthHeaders(),
        });

        this.animalProfiles = res.data.results;

        return res.data;
      } catch (err: any) {
        this.error = err.message || "Failed to fetch animal profiles page";
        throw err;
      } finally {
        this.loading = false;
      }
    },


    getAnimalProfileById(id: number): AnimalProfile | null {
      return this.animalProfiles.find(a => a.id === id) || null;
    },

    async createAnimalProfile(data: Omit<AnimalProfile, 'id'>): Promise<AnimalProfile> {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const payload = {
          ...data,
          strain_id: data.strain ? data.strain.id : null,
        };
        const res = await axios.post(`${apiBaseUrl}/animalprofile/`,
          payload,
          { headers: this.getAuthHeaders() }
        );
        const created: AnimalProfile = res.data;
        this.animalProfiles.push(created);
        return created;
      } catch (err: any) {
        this.error = err.message || 'Failed to create animal profile';
        throw err;
      }
    },

    async updateAnimalProfile(id: number, data: Partial<AnimalProfile>): Promise<AnimalProfile> {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const payload = {
          ...data,
          strain_id: data.strain ? data.strain.id : null,
        };
        const res = await axios.put(`${apiBaseUrl}/animalprofile/${id}/`, payload, {
          headers: this.getAuthHeaders()
        });
        const index = this.animalProfiles.findIndex(a => a.id === id);
        if (index !== -1) this.animalProfiles[index] = res.data;
        return res.data;
      } catch (err: any) {
        this.error = err.message || 'Failed to update animal profile';
        throw err;
      }
    },

    async deleteAnimalProfile(id: number): Promise<void> {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        await axios.delete(`${apiBaseUrl}/animalprofile/${id}/`, {
          headers: this.getAuthHeaders()
        });
        this.animalProfiles = this.animalProfiles.filter(a => a.id !== id);
      } catch (err: any) {
        this.error = err.message || 'Failed to delete animal profile';
        throw err;
      }
    },
    isEmpty() {
      return this.animalProfiles.length === 0;
    }
  }
});
