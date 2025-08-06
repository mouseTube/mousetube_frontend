import { defineStore } from 'pinia';
import axios from 'axios';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { useAuth } from '@/composables/useAuth';

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
      const { token } = useAuth();
      return token.value ? { Authorization: `Bearer ${token.value}` } : {};
    },

    async fetchLaboratories() {
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
        const res = await axios.post(`${apiBaseUrl}/laboratory/`, data, {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
        });
        this.laboratories.push(res.data);
        return res.data;
      } catch (err: any) {
        throw err;
      }
    },

    async updateLaboratory(id: number, data: LaboratoryPayload) {
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.patch(`${apiBaseUrl}/laboratory/${id}/`, data, {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
        });
        const index = this.laboratories.findIndex((l) => l.id === id);
        if (index !== -1) this.laboratories[index] = res.data;
        return res.data;
      } catch (err: any) {
        throw err;
      }
    },

    async fetchLaboratoryById(id: number) {
      try {
        const headers: Record<string, string> = {};
        const apiBaseUrl = useApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/laboratory/${id}`, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch laboratory with id ${id}`);
        }
        const lab = await response.json();

        const index = this.laboratories.findIndex((l) => l.id === id);
        if (index !== -1) {
          this.laboratories[index] = lab;
        } else {
          this.laboratories.push(lab);
        }

        return lab;
      } catch (error) {
        console.error('Error fetching laboratory by ID:', error);
        return null;
      }
    },

    getLaboratoryById(id: number): Laboratory | null {
      return this.laboratories.find((l) => l.id === id) ?? null;
    },
  },
});
