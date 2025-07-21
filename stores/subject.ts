import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

// Interfaces pour typer les données subject
interface Species {
  id: number
  name: string
  created_at: string
  modified_at: string
  created_by: number
}

interface Strain {
  id: number
  species: Species
  name: string
  background: string
  bibliography: string
  created_at: string
  modified_at: string
  created_by: number
}

interface AnimalProfile {
  id: number
  strain: Strain
  name: string
  description: string | null
  sex: string
  genotype: string
  treatment: string
  created_at: string
  modified_at: string
  created_by: number | null
}

interface User {
  id: number
  name_user: string
  first_name_user: string
  email_user: string
  unit_user: string
  institution_user: string
  address_user: string
  country_user: string
}

export interface Subject {
  id: number
  user: User
  animal_profile: AnimalProfile
  name: string
  identifier: string | null
  cohort: string
  origin: string
  created_at: string
  modified_at: string
  created_by: number | null
}

export const useSubjectStore = defineStore('subject', {
  state: () => ({
    subjects: [] as Subject[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchSubjects() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let url = `${apiBaseUrl}/subject/`
        const allSubjects: Subject[] = []

        while (url) {
          const res = await axios.get(url)
          if (Array.isArray(res.data.results)) {
            allSubjects.push(...res.data.results)
          }
          url = res.data.next // DRF renvoie null si plus de page
        }

        this.subjects = allSubjects
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch subjects'
        this.subjects = []
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
  },
})
