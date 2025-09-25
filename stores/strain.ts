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
  status?: string | null
  created_by?: number | null
  created_at?: string | null
  modified_at?: string | null
}

export const useStrainStore = defineStore('strain', {
  state: () => ({
    strains: [] as Array<any>,
    loading: false,
    error: null as null | string,
    count: 0,
    next: null as string | null,
    previous: null as string | null,
  }),
  actions: {
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {}
    },

    async fetchStrains() {
      this.loading = true
      this.error = null
      this.strains = []

      try {
        const apiBaseUrl = useApiBaseUrl()
        let nextUrl: string | null = `${apiBaseUrl}/strain/`

        while (nextUrl) {
          const res: { data: any } = await axios.get(nextUrl, {
            headers: this.getAuthHeaders(),
          })

          if (Array.isArray(res.data.results)) {
            this.strains.push(...res.data.results)
          } else {
            this.strains.push(...res.data)
            break
          }

          this.count = res.data.count || 0
          this.next = res.data.next || null
          this.previous = res.data.previous || null
          nextUrl = res.data.next || null
        }
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
        const res = await axios.post(`${apiBaseUrl}/strain/`,
          data,
          { headers: this.getAuthHeaders() }
        )
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
        const res = await axios.put(`${apiBaseUrl}/strain/${id}/`,
          data,
          { headers: this.getAuthHeaders() }
        )
        const index = this.strains.findIndex(s => s.id === id)
        if (index !== -1) this.strains[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to update strain'
        throw err
      }
    },

    async deleteStrain(id: number) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        await axios.delete(`${apiBaseUrl}/strain/${id}/`, {
          headers: this.getAuthHeaders()
        })
        this.strains = this.strains.filter(s => s.id !== id)
      } catch (err: any) {
        this.error = err.message || 'Failed to delete strain'
        throw err
      }
    },
    isEmpty() {
      return this.strains.length === 0;
    },
  },
})
