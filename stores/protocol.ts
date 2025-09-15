import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export interface Protocol {
  id: number
  name: string
  description: string
  animals: {
    sex: string
    age: string
    housing: string
  }
  context: {
    number_of_animals?: number | null
    duration: string
    cage: string
    bedding: string
    light_cycle: string
  }
  status: 'draft' | 'awaiting validation' | 'validated' | null
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
    animals: ["sex", "age", "housing"].reduce((acc, key) => {
      acc[key] = flat[`animals_${key}`] ?? ""
      return acc
    }, {} as any),
    context: {
      number_of_animals:
        flat.context_number_of_animals != null
          ? Number(flat.context_number_of_animals)
          : null,
      duration: flat.context_duration ?? "",
      cage: flat.context_cage ?? "",
      bedding: flat.context_bedding ?? "",
      light_cycle: flat.context_light_cycle ?? "",
    },
    status: flat.status ?? "",
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
    context_number_of_animals:
      nested.context?.number_of_animals != null
        ? Number(nested.context.number_of_animals)
        : null,
    context_duration: nested.context?.duration ?? '',
    context_cage: nested.context?.cage ?? '',
    context_bedding: nested.context?.bedding ?? '',
    context_light_cycle: nested.context?.light_cycle ?? '',
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

    addOrUpdateProtocol(protocol: Protocol) {
      const index = this.protocols.results.findIndex(p => p.id === protocol.id)
      if (index !== -1) {
        this.protocols.results[index] = protocol
      } else {
        this.protocols.results.push(protocol)
      }
      this.protocols.count = this.protocols.results.length
    },

    async fetchProtocolsPage(
      page = 1,
      searchQuery: string | null = null,
      filters: Record<string, string | number | null> = {},
      ordering: string | null = null
    ) {
      this.loading = true
      this.error = null

      try {
        const apiBaseUrl = useApiBaseUrl()
        const params: Record<string, string | number> = { page }
        if (searchQuery?.trim()) params.search = searchQuery.trim()
        params.ordering = ordering || "-is_favorite_int,name"

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== '') {
            params[key] = String(value)
          }
        })

        const res = await axios.get(`${apiBaseUrl}/protocol/`, {
          params,
          headers: this.getAuthHeaders(),
        })
        const protocols = res.data.results.map(flatToNested)

        if (page === 1) {
          this.protocols.results = protocols
        } else {
          this.protocols.results = [...this.protocols.results, ...protocols]
        }
        this.removeDuplicates()
        this.protocols.count = this.protocols.results.length
        this.currentPage = page
        this.totalPages = Math.ceil(this.protocols.count / this.pageSize)
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch protocols'
        this.protocols = { count: 0, next: null, previous: null, results: [] }
      } finally {
        this.loading = false
      }
    },

    async getProtocolById(id: number): Promise<Protocol | null> {
      let protocol = this.protocols.results.find(p => p.id === id) || null

      if (!protocol) {
        try {
          const apiBaseUrl = useApiBaseUrl()
          const response = await axios.get<Protocol>(`${apiBaseUrl}/protocol/${id}/`, {
            headers: this.getAuthHeaders(),
          })
          protocol = flatToNested(response.data)
          this.addOrUpdateProtocol(protocol)
        } catch (error) {
          console.error("Protocol not found", error)
          return null
        }
      }

      return protocol
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
        this.addOrUpdateProtocol(newProtocol)
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
        const res = await axios.put(`${apiBaseUrl}/protocol/${id}/`, flatData, {
          headers: this.getAuthHeaders(),
        })
        const updatedProtocol = flatToNested(res.data)
        this.addOrUpdateProtocol(updatedProtocol)
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
        this.protocols.results = this.protocols.results.filter(p => p.id !== id)
        this.protocols.count = this.protocols.results.length
      } catch (err: any) {
        this.error = err.message || 'Failed to delete protocol'
        throw err
      }
    },

    async duplicateProtocol(originalId: number, newName: string) {
      this.error = null
      try {
        const original = await this.getProtocolById(originalId)
        if (!original) throw new Error('Original protocol not found')

        const payload: Omit<Protocol, 'id'> = {
          name: newName,
          description: original.description ?? '',
          animals: {
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
          },
          status: 'draft',
          created_by: null,
          created_at: null,
          modified_at: null,
        }

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
          allResults = [...allResults, ...pageResults]
          url = res.data.next
        }

        this.protocols.results = allResults
        this.removeDuplicates()
        this.protocols.count = this.protocols.results.length
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch protocols'
      } finally {
        this.loading = false
      }
    },

    removeDuplicates() {
      const seen = new Set<number>()
      this.protocols.results = this.protocols.results.filter(p => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
      this.protocols.count = this.protocols.results.length
    },
  },
})
