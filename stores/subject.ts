import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export const useSubjectStore = defineStore('subject', {
  state: () => ({
    subjects: [] as any[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchSubjects() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/subject/`)
        this.subjects = res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch subjects'
      } finally {
        this.loading = false
      }
    },

    getSubjectById(id: number) {
      return this.subjects.find(s => s.id === id) || null
    },

    async createSubject(data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/subject/`, data)
        this.subjects.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to create subject'
        throw err
      }
    },

    async updateSubject(id: number, data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.put(`${apiBaseUrl}/subject/${id}/`, data)
        const index = this.subjects.findIndex(s => s.id === id)
        if (index !== -1) this.subjects[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to update subject'
        throw err
      }
    },
  }
})
