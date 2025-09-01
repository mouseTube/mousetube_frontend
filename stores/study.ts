// ~/stores/study.ts
import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '@/composables/useApiBaseUrl'
import { token } from '@/composables/useAuth'

export interface Study {
  id: number
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  created_at?: string | null
  modified_at?: string | null
}

export const useStudyStore = defineStore('study', {
  state: () => ({
    studies: [] as Study[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {}
    },

    async fetchAllStudies() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let url = `${apiBaseUrl}/study/`
        const allStudies: Study[] = []

        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() })
          if (Array.isArray(res.data.results)) {
            allStudies.push(...res.data.results)
          } else {
            allStudies.push(...res.data)
            break
          }
          url = res.data.next
        }

        this.studies = allStudies
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch studies'
        this.studies = []
      } finally {
        this.loading = false
      }
    },

    async createStudy(data: Omit<Study, 'id'>) {
      const apiBaseUrl = useApiBaseUrl()
      const res = await axios.post(`${apiBaseUrl}/study/`, data, {
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      })
      this.studies.push(res.data)
      return res.data
    },

    async updateStudy(id: number, data: Partial<Omit<Study, 'id'>>) {
      const apiBaseUrl = useApiBaseUrl()
      const res = await axios.put(`${apiBaseUrl}/study/${id}/`, data, {
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      })

      const index = this.studies.findIndex(s => s.id === id)
      if (index !== -1) {
        this.studies[index] = res.data
      } else {
        this.studies.push(res.data)
      }
      return res.data
    },

    async getStudyById(id: number): Promise<Study | null> {
      const found = this.studies.find(s => s.id === id)
      if (found) return found
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/study/${id}/`, {
          headers: this.getAuthHeaders(),
        })
        const study: Study = res.data
        this.studies.push(study)
        return study
      } catch (err: any) {
        this.error = err.message || `Failed to fetch study ${id}`
        return null
      }
    },

    async deleteStudy(id: number) {
      const apiBaseUrl = useApiBaseUrl()
      try {
        await axios.delete(`${apiBaseUrl}/study/${id}/`, {
          headers: this.getAuthHeaders(),
        })
        this.studies = this.studies.filter(s => s.id !== id)
        return true
      } catch (err: any) {
        this.error = err.message || `Failed to delete study ${id}`
        return false
      }
    }
  }
})
