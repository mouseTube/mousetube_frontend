import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

interface File {
  id: number;
  name: string;
  link: string;
  date: string | null;
  duration: number | null;
  format: string | null;
  sampling_rate: number | null;
  bit_depth: number | null;
  notes: string;
  size: number | null;
  doi: string;
  number: number | null;
  is_valid_link: boolean;
  downloads: number;
  created_at: string;
  modified_at: string;
  created_by: number | null;

  repository: {
    id: number;
    name: string;
    description: string;
    logo: string;
    area: string;
    url: string;
    url_api: string;
    created_at: string;
    modified_at: string;
    created_by: number;
  } | null;

  subjects: Array<{
    id: number;
    name: string;
    identifier: string | null;
    cohort: string | null;
    origin: string | null;
    created_at: string;
    modified_at: string;
    created_by: number | null;
    user: {
      id: number;
      name_user: string;
      first_name_user: string;
      email_user: string;
      unit_user: string;
      institution_user: string;
      address_user: string;
      country_user: string;
    };
    animal_profile: {
      id: number;
      name: string;
      description: string | null;
      sex: string;
      genotype: string;
      treatment: string;
      created_at: string;
      modified_at: string;
      created_by: number | null;
      strain: {
        id: number;
        name: string;
        background: string;
        bibliography: string;
        created_at: string;
        modified_at: string;
        created_by: number;
        species: {
          id: number;
          name: string;
          created_at: string;
          modified_at: string;
          created_by: number;
        };
      };
    };
  }>;
}

export const useFileStore = defineStore('file', {
  state: () => ({
    files: [] as File[],
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
        this.files = res.data.results
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch files'
      } finally {
        this.loading = false
      }
    },

    async fetchFilesBySessionId(sessionId: number | string) {
      if (!sessionId) {
        this.files = []
        return []
      }
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/file/`, {
          params: {
            recording_session: sessionId,
          },
        })
        this.files = res.data.results  // même correction ici
        return this.files
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch files by session id'
        this.files = []
        return []
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
  },
})
