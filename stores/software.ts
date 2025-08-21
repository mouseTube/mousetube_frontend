import { defineStore } from 'pinia'
import axios, { type AxiosResponse } from 'axios'
import { useApiBaseUrl } from '@/composables/useApiBaseUrl'
import { token } from '@/composables/useAuth'

export interface Software {
  id: number
  name: string
  type: 'acquisition' | 'analysis' | 'acquisition and analysis' | null
  made_by?: string
  description?: string
  technical_requirements?: string
  created_at?: string
  modified_at?: string
}

export interface SoftwareVersion {
  id: number
  software: Software
  version?: string
  release_date?: string | null
  created_at?: string
  modified_at?: string
}

export interface SoftwareVersionPayload {
  version: string
  release_date: string | null
  software: number
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const useSoftwareStore = defineStore('software', {
  state: () => ({
    softwares: [] as Software[],
    softwareVersions: [] as SoftwareVersion[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {};
    },

    // --- Software ---
    async fetchAllSoftware() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let nextPage: string | null = `${apiBaseUrl}/software/`
        const allSoftwares: Software[] = []

        while (nextPage) {
          const res: AxiosResponse<PaginatedResponse<Software>> = await axios.get(nextPage, {
            headers: this.getAuthHeaders(),
          })
          const data = res.data
          allSoftwares.push(...data.results)
          nextPage = data.next
        }
        this.softwares = allSoftwares
      } catch (err: any) {
        this.error = err?.message ?? 'Failed to fetch software'
        // eslint-disable-next-line no-console
        console.error('Error fetching all softwares:', err)
      } finally {
        this.loading = false
      }
    },

    async fetchSoftwareById(id: number) {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res: AxiosResponse<Software> = await axios.get(`${apiBaseUrl}/software/${id}/`, {
          headers: this.getAuthHeaders(),
        })
        return res.data
      } catch (err: any) {
        this.error = err?.message ?? 'Failed to fetch software'
        return null
      } finally {
        this.loading = false
      }
    },

    getSoftwareById(id: number) {
      return this.softwares.find(s => s.id === id) || null
    },

    async createSoftware(data: Partial<Software>) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res: AxiosResponse<Software> = await axios.post(`${apiBaseUrl}/software/`, data, {
          headers: this.getAuthHeaders(),
        })
        this.softwares.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err?.message ?? 'Failed to create software'
        throw err
      }
    },

    async updateSoftware(id: number, data: Partial<Software>) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res: AxiosResponse<Software> = await axios.put(`${apiBaseUrl}/software/${id}/`, data, {
          headers: this.getAuthHeaders(),
        })
        const index = this.softwares.findIndex(s => s.id === id)
        if (index !== -1) this.softwares[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err?.message ?? 'Failed to update software'
        throw err
      }
    },

    // --- SoftwareVersion ---
    async fetchAllSoftwareVersions() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let nextPage: string | null = `${apiBaseUrl}/software-version/`
        const allVersions: SoftwareVersion[] = []

        while (nextPage) {
          const res: AxiosResponse<PaginatedResponse<SoftwareVersion>> = await axios.get(nextPage, {
            headers: this.getAuthHeaders(),
          })
          const data = res.data
          allVersions.push(...data.results)
          nextPage = data.next
        }
        this.softwareVersions = allVersions
      } catch (err: any) {
        this.error = err?.message ?? 'Failed to fetch software versions'
        // eslint-disable-next-line no-console
        console.error('Error fetching all software versions:', err)
      } finally {
        this.loading = false
      }
    },

    async fetchSoftwareVersionById(id: number) {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res: AxiosResponse<SoftwareVersion> = await axios.get(`${apiBaseUrl}/software-version/${id}/`, {
          headers: this.getAuthHeaders(),
        })
        return res.data
      } catch (err: any) {
        this.error = err?.message ?? 'Failed to fetch software version'
        return null
      } finally {
        this.loading = false
      }
    },

    getSoftwareVersionById(id: number) {
      return this.softwareVersions.find(sv => sv.id === id) || null
    },

    async createSoftwareVersion(data: SoftwareVersionPayload) {
      this.error = null
      try {
        // Convert empty release_date to null
        const payload = {
          version: data.version,
          release_date: data.release_date || null,
          software_id: data.software,
        }
        const apiBaseUrl = useApiBaseUrl()
        const res: AxiosResponse<SoftwareVersion> = await axios.post(`${apiBaseUrl}/software-version/`, payload, {
          headers: this.getAuthHeaders(),
        })
        this.softwareVersions.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err?.message ?? 'Failed to create software version'
        throw err
      }
    },

    async updateSoftwareVersion(id: number, data: SoftwareVersionPayload) {
      this.error = null
      try {
        // Convert empty release_date to null
        const payload = {
          version: data.version,
          release_date: data.release_date || null,
          software_id: data.software,
        }
        const apiBaseUrl = useApiBaseUrl()
        const res: AxiosResponse<SoftwareVersion> = await axios.put(`${apiBaseUrl}/software-version/${id}/`, payload, {
          headers: this.getAuthHeaders(),
        })
        const index = this.softwareVersions.findIndex(sv => sv.id === id)
        if (index !== -1) this.softwareVersions[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err?.message ?? 'Failed to update software version'
        throw err
      }
    },
    async deleteSoftware(id: number) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        this.softwareVersions = this.softwareVersions.filter(v => v.software.id !== id);

        await axios.delete(`${apiBaseUrl}/software/${id}/`, {
          headers: this.getAuthHeaders(),
        });

        this.softwares = this.softwares.filter(s => s.id !== id);
      } catch (err: any) {
        this.error = err?.message ?? 'Failed to delete software';
        throw err;
      }
    },
    async deleteSoftwareVersion(id: number) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        await axios.delete(`${apiBaseUrl}/software-version/${id}/`, {
          headers: this.getAuthHeaders(),
        });
        this.softwareVersions = this.softwareVersions.filter(v => v.id !== id);
      } catch (err: any) {
        this.error = err?.message ?? 'Failed to delete software version';
        throw err;
      }
    },
  },
})
