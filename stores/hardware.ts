import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export interface Hardware {
  id?: number;
  name: string;
  type: 'soundcard' | 'microphone' | 'speaker' | 'amplifier' | '';
  made_by: string;
  description: string;
  references?: number[]; // ou string[] selon ton API
  created_at?: string;
  modified_at?: string;
  created_by?: number | null;
}

export const useHardwareStore = defineStore('hardware', {
  state: () => ({
    hardwares: [] as Hardware[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchHardwares() {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.get(`${apiBaseUrl}/hardware/`);
        this.hardwares = res.data;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch hardware';
      } finally {
        this.loading = false;
      }
    },

    async fetchHardwareById(id: number) {
      try {
        const apiBaseUrl = useApiBaseUrl();

        const res = await fetch(`${apiBaseUrl}/hardware/${id}`);
        if (!res.ok) throw new Error('Failed to fetch hardware');
        const hw = await res.json();

        const index = this.hardwares.findIndex((h) => h.id === id);
        if (index !== -1) {
          this.hardwares[index] = hw;
        } else {
          this.hardwares.push(hw);
        }
        return hw;
      } catch (e) {
        console.error('Error fetching hardware by ID:', e);
        return null;
      }
    },

    getHardwareById(id: number) {
      return this.hardwares.find(h => h.id === id) || null;
    },

    async createHardware(data: Hardware) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.post(`${apiBaseUrl}/hardware/`, data);
        this.hardwares.push(res.data);
        return res.data;
      } catch (err: any) {
        this.error = err.message || 'Failed to create hardware';
        throw err;
      }
    },

    async updateHardware(id: number, data: Hardware) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.put(`${apiBaseUrl}/hardware/${id}/`, data);
        const index = this.hardwares.findIndex(h => h.id === id);
        if (index !== -1) this.hardwares[index] = res.data;
        return res.data;
      } catch (err: any) {
        this.error = err.message || 'Failed to update hardware';
        throw err;
      }
    },
  },
});
