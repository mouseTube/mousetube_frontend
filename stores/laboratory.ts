import { defineStore } from 'pinia';
import axios from 'axios';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { token } from '@/composables/useAuth';

export interface Laboratory {
  id: number;
  name: string;
  institution?: string | null;
  unit?: string | null;
  address?: string | null;
  country?: string | null;
  contact?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
  created_by?: number | null;
}

export interface LaboratoryPayload {
  name: string;
  institution?: string | null;
  unit?: string | null;
  address?: string | null;
  country?: string | null;
  contact?: string | null;
}

export const useLaboratoryStore = defineStore('laboratory', {
  state: () => ({
    laboratories: [] as Laboratory[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {};
    },

    async fetchAllLaboratories() {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        let url = `${apiBaseUrl}/laboratory/`;
        const allLabs: Laboratory[] = [];

        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() });
          if (Array.isArray(res.data.results)) {
            allLabs.push(...res.data.results);
          } else {
            allLabs.push(...res.data);
            break;
          }
          url = res.data.next;
        }

        this.laboratories = allLabs;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch laboratories';
        this.laboratories = [];
      } finally {
        this.loading = false;
      }
    },

    async createLaboratory(data: LaboratoryPayload) {
      try {
        const apiBaseUrl = useApiBaseUrl();
        const payload = { ...data, country: data.country ?? null };
        const res = await axios.post(`${apiBaseUrl}/laboratory/`, payload, {
          headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        });
        this.laboratories.push(res.data);
        return res.data;
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Error creating laboratory:', err);
        throw err;
      }
    },

    async updateLaboratory(id: number, data: LaboratoryPayload) {
      try {
        const apiBaseUrl = useApiBaseUrl();
        const payload = { ...data, country: data.country ?? null };
        const res = await axios.patch(`${apiBaseUrl}/laboratory/${id}/`, payload, {
          headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        });
        const index = this.laboratories.findIndex((l) => l.id === id);
        if (index !== -1) this.laboratories[index] = res.data;
        return res.data;
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Error updating laboratory:', err);
        throw err;
      }
    },

    async getLaboratoryById(id: number): Promise<Laboratory | null> {
      const existing = this.laboratories.find((l) => l.id === id);
      if (existing) return existing;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.get(`${apiBaseUrl}/laboratory/${id}/`, {
          headers: this.getAuthHeaders(),
        });
        const lab: Laboratory = res.data;
        this.laboratories.push(lab); // ajoute au store local
        return lab;
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error(`Error fetching laboratory by ID ${id}:`, err);
        return null;
      }
    },
  },
});
