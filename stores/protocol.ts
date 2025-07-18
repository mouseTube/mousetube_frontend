import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export const useProtocolStore = defineStore('protocol', {
  state: () => ({
    protocols: [] as any[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchProtocols() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/protocol/`)
        this.protocols = res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch protocols'
      } finally {
        this.loading = false
      }
    },

    getProtocolById(id: number) {
      return this.protocols.find(p => p.id === id) || null
    },

    async createProtocol(data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/protocol/`, data)
        this.protocols.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to create protocol'
        throw err
      }
    },

    async updateProtocol(id: number, data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.put(`${apiBaseUrl}/protocol/${id}/`, data)
        const index = this.protocols.findIndex(p => p.id === id)
        if (index !== -1) this.protocols[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to update protocol'
        throw err
      }
    },
  }
})
