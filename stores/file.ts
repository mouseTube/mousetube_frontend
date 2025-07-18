import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export const useFileStore = defineStore('file', {
  state: () => ({
    files: [] as any[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchFiles() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/file/`)
        this.files = res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch files'
      } finally {
        this.loading = false
      }
    },

    getFileById(id: number) {
      return this.files.find(f => f.id === id) || null
    },

    async fetchFileById(id: number) {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/file/${id}/`)
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch file'
        throw err
      } finally {
        this.loading = false
      }
    },

    async createFile(data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/file/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        this.files.push(res.data)
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to create file'
        throw err
      }
    },

    async updateFile(id: number, data: any) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.put(`${apiBaseUrl}/file/${id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const index = this.files.findIndex(f => f.id === id)
        if (index !== -1) this.files[index] = res.data
        return res.data
      } catch (err: any) {
        this.error = err.message || 'Failed to update file'
        throw err
      }
    },
  }
})
