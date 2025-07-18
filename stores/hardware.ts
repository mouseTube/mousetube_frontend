import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export const useHardwareStore = defineStore('hardware', {
  state: () => ({
    hardwares: [] as any[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchHardwares() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/hardware/`)
        this.hardwares = res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch hardware'
      } finally {
        this.loading = false
      }
    },

    getHardwareById(id: number) {
      return this.hardwares.find(h => h.id === id) || null
    },

    async createHardware(data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/hardware/`, data)
        this.hardwares.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to create hardware'
        throw err
      }
    },

    async updateHardware(id: number, data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.put(`${apiBaseUrl}/hardware/${id}/`, data)
        const index = this.hardwares.findIndex(h => h.id === id)
        if (index !== -1) this.hardwares[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to update hardware'
        throw err
      }
    },
  }
})
