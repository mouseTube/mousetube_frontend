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
}

export const useAnimalProfileStore = defineStore('animalProfile', {
  state: () => ({
    animalProfiles: [] as AnimalProfile[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchAnimalProfiles(): Promise<AnimalProfile[]> {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        let url = `${apiBaseUrl}/animalprofile/`;
        const allProfiles: AnimalProfile[] = [];

        while (url) {
          const res = await axios.get(url);
          if (Array.isArray(res.data.results)) {
            allProfiles.push(...res.data.results);
          } else {
            allProfiles.push(...res.data);
            break;
          }
          url = res.data.next;
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

    getAnimalProfileById(id: number): AnimalProfile | null {
      return this.animalProfiles.find(a => a.id === id) || null;
    },

    async createAnimalProfile(data: Omit<AnimalProfile, 'id'>): Promise<AnimalProfile> {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.post(`${apiBaseUrl}/animalprofile/`, data);
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
        const res = await axios.put(`${apiBaseUrl}/animalprofile/${id}/`, data);
        const index = this.animalProfiles.findIndex(a => a.id === id);
        if (index !== -1) this.animalProfiles[index] = res.data;
        return res.data;
      } catch (err: any) {
        this.error = err.message || 'Failed to update animal profile';
        throw err;
      }
    },
  },
});
