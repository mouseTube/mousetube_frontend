import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'
import type { Species } from './species'

export interface Protocol {
  id: number
  name: string
  description: string
  animals: {
    sex: string
    age: string
    housing: string
    species: Species | null
  }
  context: {
    number_of_animals?: number | null
    duration: string
    cage: string
    bedding: string
    light_cycle: string
    temperature: {
      value: number | string
      unit: string
    }
    brightness: number | null
  }
  created_by?: number | null
  created_at?: string | null
  modified_at?: string | null
}

export interface ProtocolListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Protocol[]
}

// --- MAPPING FLAT ↔ NESTED ---
export function flatToNested(flat: any): Protocol {
  return {
    id: flat.id,
    name: flat.name,
    description: flat.description ?? "",
    animals: ["sex", "age", "housing", "species"].reduce((acc, key) => {
      acc[key] = flat[`animals_${key}`] ?? ""
      return acc
    }, {} as any),
    context: [
      "number_of_animals",
      "duration",
      "cage",
      "bedding",
      "light_cycle",
      "temperature_value",
      "temperature_unit",
      "brightness",
    ].reduce((acc, key) => {
      if (key.startsWith("temperature")) {
        // on regroupe temperature_value + temperature_unit dans context.temperature
        acc.temperature = acc.temperature || {}
        acc.temperature[key.replace("temperature_", "")] =
          flat[`context_${key}`] ?? ""
      } else {
        acc[key] = flat[`context_${key}`] ?? ""
      }
      return acc
    }, {} as any),

    created_by: flat.created_by ?? null,
    created_at: flat.created_at ?? null,
    modified_at: flat.modified_at ?? null,
  }
}

function nestedToFlat(nested: Protocol | Omit<Protocol, 'id'>) {
  return {
    name: nested.name,
    description: nested.description ?? '',
    animals_sex: nested.animals?.sex ?? '',
    animals_age: nested.animals?.age ?? '',
    animals_housing: nested.animals?.housing ?? '',
    animals_species_id: nested.animals.species
    ? typeof nested.animals.species === 'object'
      ? nested.animals.species.id
      : nested.animals.species
    : null,
    context_number_of_animals: nested.context?.number_of_animals ?? null,
    context_duration: nested.context?.duration ?? '',
    context_cage: nested.context?.cage ?? '',
    context_bedding: nested.context?.bedding ?? '',
    context_light_cycle: nested.context?.light_cycle ?? '',
    context_temperature_value:
      nested.context?.temperature?.value != null
        ? Number(nested.context.temperature.value)
        : null,
    context_temperature_unit: nested.context?.temperature?.unit ?? '',
    context_brightness:
      nested.context?.brightness != null
        ? Number(nested.context.brightness)
        : null,
    created_by: nested.created_by ?? null,
    created_at: nested.created_at ?? null,
    modified_at: nested.modified_at ?? null,
  }
}

// --- STORE ---
export const useProtocolStore = defineStore('protocol', {
  state: () => ({
    protocols: {
      count: 0,
      next: null,
      previous: null,
      results: [] as Protocol[],
    } as ProtocolListResponse,
    loading: false,
    error: null as string | null,
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
  }),

  actions: {
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {}
    },

    async fetchProtocolsPage(
      page = 1,
      searchQuery: string | null = null,
      ordering: string | null = null
    ) {
      this.loading = true
      this.error = null

      try {
        const apiBaseUrl = useApiBaseUrl()
        const params: any = { page }
        if (searchQuery?.trim()) params.search = searchQuery.trim()
        if (ordering) params.ordering = ordering

        const res = await axios.get(`${apiBaseUrl}/protocol/`, {
          params,
          headers: this.getAuthHeaders(),
        })
        const protocols = res.data.results.map(flatToNested)

        this.protocols = {
          count: res.data.count,
          next: res.data.next,
          previous: res.data.previous,
          results: protocols,
        }
        this.currentPage = page
        this.totalPages = Math.ceil(res.data.count / this.pageSize)
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch protocols'
        this.protocols = { count: 0, next: null, previous: null, results: [] }
      } finally {
        this.loading = false
      }
    },

    async getProtocolById(id: number): Promise<Protocol | null> {
      let protocol = this.protocols.results.find(p => p.id === id) || null;

      if (!protocol) {
        try {
          const response = await axios.get<Protocol>(`/api/protocols/${id}/`);
          protocol = response.data;
        } catch (error) {
          console.error("Protocol not found", error);
          return null;
        }
      }

      return protocol;
    },

    async createProtocol(data: Omit<Protocol, 'id'>) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const flatData = nestedToFlat(data)
        const res = await axios.post(`${apiBaseUrl}/protocol/`, flatData, {
          headers: this.getAuthHeaders(),
        })
        const newProtocol = flatToNested(res.data)
        this.protocols.results.push(newProtocol)
        this.protocols.count += 1
        return newProtocol
      } catch (err: any) {
        this.error = err.message || 'Failed to create protocol'
        throw err
      }
    },

    async updateProtocol(id: number, data: Partial<Protocol>) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const flatData = nestedToFlat(data as Protocol)
        const res = await axios.put(
          `${apiBaseUrl}/protocol/${id}/`,
          flatData,
          { headers: this.getAuthHeaders() }
        )
        const updatedProtocol = flatToNested(res.data)
        const index = this.protocols.results.findIndex(p => p.id === id)
        if (index !== -1) this.protocols.results[index] = updatedProtocol
        return updatedProtocol
      } catch (err: any) {
        this.error = err.message || 'Failed to update protocol'
        throw err
      }
    },

    async deleteProtocol(id: number) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        await axios.delete(`${apiBaseUrl}/protocol/${id}/`, {
          headers: this.getAuthHeaders(),
        })

        // Mise à jour locale
        this.protocols.results = this.protocols.results.filter(p => p.id !== id)
        this.protocols.count = Math.max(0, this.protocols.count - 1)
      } catch (err: any) {
        this.error = err.message || 'Failed to delete protocol'
        throw err
      }
    },

    async duplicateProtocol(originalId: number, newName: string) {
      this.error = null
      try {
        // On retrouve le protocole original dans le cache
        const original = await this.getProtocolById(originalId)
        if (!original) throw new Error('Original protocol not found')
        const payload: Omit<Protocol, 'id'> = {
          name: newName,
          description: original.description ?? '',
          animals: {
            species: original.animals?.species ?? null,
            sex: original.animals?.sex ?? null,
            age: original.animals?.age ?? null,
            housing: original.animals?.housing ?? null,
          },
          context: {
            number_of_animals: original.context?.number_of_animals ?? null,
            duration: original.context?.duration ?? null,
            cage: original.context?.cage ?? null,
            bedding: original.context?.bedding ?? null,
            light_cycle: original.context?.light_cycle ?? null,
            temperature: {
              value: original.context?.temperature?.value ?? null,
              unit: original.context?.temperature?.unit ?? null,
            },
            brightness: original.context?.brightness ?? null,
          },
          created_by: null,
          created_at: null,
          modified_at: null,
        }

        // On passe par createProtocol
        return await this.createProtocol(payload)
      } catch (err: any) {
        this.error = err.message || 'Failed to duplicate protocol'
        throw err
      }
    },

    async fetchAllProtocols() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let url = `${apiBaseUrl}/protocol/`
        let allResults: Protocol[] = []

        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() })
          const pageResults = res.data.results.map(flatToNested)
          allResults = allResults.concat(pageResults)
          url = res.data.next
        }

        this.protocols = {
          count: allResults.length,
          next: null,
          previous: null,
          results: allResults,
        }
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch protocols'
      } finally {
        this.loading = false
      }
    },
  },
})
