import { defineStore } from 'pinia'
import axios, { type AxiosResponse } from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export interface Species {
  id: number
  name: string
  created_at?: string | null
  modified_at?: string | null
  created_by?: number | null
}

export interface SpeciesListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Species[]
}

export const useSpeciesStore = defineStore('species', {
  state: () => ({
    species: [] as Species[],
    loading: false,
    error: null as string | null,
    count: 0,
    next: null as string | null,
    previous: null as string | null,
  }),

  actions: {
    async fetchSpecies() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let fetchUrl: string | null = `${apiBaseUrl}/species/`
        const allSpecies: Species[] = []

        while (fetchUrl) {
          const res: AxiosResponse<SpeciesListResponse> = await axios.get(fetchUrl)
          const data: SpeciesListResponse = res.data
          allSpecies.push(...data.results)
          fetchUrl = data.next
        }

        this.species = allSpecies
        this.count = allSpecies.length
        this.next = null
        this.previous = null
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch species'
        this.species = []
      } finally {
        this.loading = false
      }
    },

    getSpeciesById(id: number) {
      return this.species.find(s => s.id === id) || null
    },

    isEmpty() {
      return this.species.length === 0;
    },
  },
})
