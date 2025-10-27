import { defineStore } from 'pinia';
import axios, { type AxiosInstance } from 'axios';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { token } from '@/composables/useAuth';

export interface Hardware {
  id?: number;
  name: string;
  type: 'soundcard' | 'microphone' | 'speaker' | 'amplifier' | '';
  made_by: string;
  description: string;
  references?: number[];
  status: 'draft' | 'waiting validation' | 'validated' | '';
  created_at?: string;
  modified_at?: string;
  created_by?: number | null;
}

export const useHardwareStore = defineStore('hardware', {
  state: () => ({
    hardwares: [] as Hardware[],
    loading: false,
    error: null as string | null,
    api: null as AxiosInstance | null, // instance Axios
  }),

  actions: {
    initApi() {
      const apiBaseUrl = useApiBaseUrl();
      this.api = axios.create({
        baseURL: apiBaseUrl,
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
      });
    },

    async fetchAllHardware() {
      this.loading = true;
      this.error = null;
      try {
        if (!this.api) this.initApi();

        let nextPage = `/hardware/`;
        const allHardwares: Hardware[] = [];

        while (nextPage) {
          const res = await this.api!.get(nextPage);
          allHardwares.push(...res.data.results);
          nextPage = res.data.next ? res.data.next.replace(this.api!.defaults.baseURL!, '') : null;
        }

        this.hardwares = allHardwares;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch hardware';
        // eslint-disable-next-line no-console
        console.error('Error fetching all hardware:', err);
      } finally {
        this.loading = false;
      }
    },

    async fetchHardwareById(id: number) {
      try {
        if (!this.api) this.initApi();
        const res = await this.api!.get(`/hardware/${id}/`);
        const hw = res.data;

        const index = this.hardwares.findIndex((h) => h.id === id);
        if (index !== -1) {
          this.hardwares[index] = hw;
        } else {
          this.hardwares.push(hw);
        }
        return hw;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error fetching hardware by ID:', e);
        return null;
      }
    },

    getHardwareById(id: number) {
      return this.hardwares.find((h) => h.id === id) || null;
    },

    async createHardware(data: Hardware) {
      this.error = null;
      try {
        if (!this.api) this.initApi();
        const res = await this.api!.post(`/hardware/`, data);
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
        if (!this.api) this.initApi();
        const res = await this.api!.put(`/hardware/${id}/`, data);
        const index = this.hardwares.findIndex((h) => h.id === id);
        if (index !== -1) this.hardwares[index] = res.data;
        return res.data;
      } catch (err: any) {
        this.error = err.message || 'Failed to update hardware';
        throw err;
      }
    },

    async deleteHardware(id: number) {
      this.error = null;
      try {
        if (!this.api) this.initApi();
        await this.api!.delete(`/hardware/${id}/`);
        this.hardwares = this.hardwares.filter((h) => h.id !== id);
      } catch (err: any) {
        this.error = err.message || 'Failed to delete hardware';
        throw err;
      }
    },
  },
});
