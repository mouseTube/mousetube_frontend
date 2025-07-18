import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export const useAnimalProfileStore = defineStore('animalProfile', {
  state: () => ({
    animalProfiles: [] as any[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchAnimalProfiles() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/animalprofile/`)
        this.animalProfiles = res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch animal profiles'
      } finally {
        this.loading = false
      }
    },

    getAnimalProfileById(id: number) {
      return this.animalProfiles.find(a => a.id === id) || null
    },

    async createAnimalProfile(data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/animalprofile/`, data)
        this.animalProfiles.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to create animal profile'
        throw err
      }
    },

    async updateAnimalProfile(id: number, data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.put(`${apiBaseUrl}/animalprofile/${id}/`, data)
        const index = this.animalProfiles.findIndex(a => a.id === id)
        if (index !== -1) this.animalProfiles[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to update animal profile'
        throw err
      }
    },
  }
})
