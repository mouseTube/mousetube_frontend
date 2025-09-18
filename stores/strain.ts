// stores/strain.ts
import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'
import { type Species } from '~/stores/species'

export interface Strain {
  id: number
  name: string
  background?: string | null
  species?: Species | null
  bibliography?: string | null
  created_at?: string | null
  modified_at?: string | null
}

export const useStrainStore = defineStore('strain', {
  state: () => ({
    strains: [] as Array<any>,
    loading: false,
    error: null as null | string,
  }),
  actions: {
    async fetchStrains() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/strain/`)
        this.strains = res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch strains'
      } finally {
        this.loading = false
      }
    },

    getStrainById(id: number) {
      return this.strains.find(s => s.id === id) || null
    },

    async createStrain(data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/strain/`, data)
        this.strains.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to create strain'
        throw err
      }
    },

    async updateStrain(id: number, data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.put(`${apiBaseUrl}/strain/${id}/`, data)
        const index = this.strains.findIndex(s => s.id === id)
        if (index !== -1) this.strains[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to update strain'
        throw err
      }
    }
  }
})
