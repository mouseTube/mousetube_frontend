import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'
import { token } from '@/composables/useAuth'

export const useStudyStore = defineStore('study', {
  state: () => ({
    studies: [] as any[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {};
    },

    async fetchAllStudies() {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        let nextPage = `${apiBaseUrl}/study/`;
        const allStudies: any[] = [];

        while (nextPage) {
          const res = await axios.get(nextPage, { headers: this.getAuthHeaders?.() });
          allStudies.push(...res.data.results);
          nextPage = res.data.next;
        }

        this.studies = allStudies;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch studies';
        console.error('Error fetching all studies:', err);
      } finally {
        this.loading = false;
      }
    },

    getStudyById(id: number) {
      return this.studies.find(s => s.id === id) || null
    },

    async createStudy(data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/study/`, data)
        this.studies.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to create study'
        throw err
      }
    },

    async updateStudy(id: number, data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.put(`${apiBaseUrl}/study/${id}/`, data)
        const index = this.studies.findIndex(s => s.id === id)
        if (index !== -1) this.studies[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to update study'
        throw err
      }
    },
  }
})
