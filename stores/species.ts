import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export const useSpeciesStore = defineStore('species', {
  state: () => ({
    species: [] as any[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchSpecies() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/species/`)
        this.species = res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch species'
      } finally {
        this.loading = false
      }
    },

    getSpeciesById(id: number) {
      return this.species.find(s => s.id === id) || null
    },

    async createSpecies(data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/species/`, data)
        this.species.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to create species'
        throw err
      }
    },

    async updateSpecies(id: number, data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.put(`${apiBaseUrl}/species/${id}/`, data)
        const index = this.species.findIndex(s => s.id === id)
        if (index !== -1) this.species[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to update species'
        throw err
      }
    },
  }
})
