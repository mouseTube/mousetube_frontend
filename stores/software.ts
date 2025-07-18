import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export const useSoftwareStore = defineStore('software', {
  state: () => ({
    softwares: [] as any[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchSoftwares() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/software/`)
        this.softwares = res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch software'
      } finally {
        this.loading = false
      }
    },

    getSoftwareById(id: number) {
      return this.softwares.find(s => s.id === id) || null
    },

    async createSoftware(data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/software/`, data)
        this.softwares.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to create software'
        throw err
      }
    },

    async updateSoftware(id: number, data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.put(`${apiBaseUrl}/software/${id}/`, data)
        const index = this.softwares.findIndex(s => s.id === id)
        if (index !== -1) this.softwares[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to update software'
        throw err
      }
    },
  }
})
