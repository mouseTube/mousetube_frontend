import { defineStore } from 'pinia';
import axios, { type AxiosProgressEvent } from 'axios';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';

// =====================================================
// Types
// =====================================================

export interface File {
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
  spectrogram: globalThis.File | null;
  plot: globalThis.File | null;
  number: number | null;
  is_valid_link: boolean;
  downloads: number;
  external_id: number | null;
  external_url: string | null;
  status: string;
  celery_task_id?: string | null;
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

export interface UploadFile extends globalThis.File {
  previewUrl?: string;
}

export const useFileStore = defineStore('file', {
  state: () => ({
    files: [] as File[],
    loading: false,
    error: null as string | null,
    uploadProgress: 0,
    nextPageUrl: null as string | null,
    previousPageUrl: null as string | null,
    count: 0,
  }),

  actions: {
    // -------------------------------------------------
    // Headers with auth token
    // -------------------------------------------------
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {};
    },

    // -------------------------------------------------
    // Get files
    // -------------------------------------------------
    async fetchFiles(pageUrl?: string) {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const url = pageUrl || `${apiBaseUrl}/file/`;
        const res = await axios.get(url, { headers: this.getAuthHeaders() });

        this.files = res.data.results;
        this.nextPageUrl = res.data.next;
        this.previousPageUrl = res.data.previous;
        this.count = res.data.count;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch files';
      } finally {
        this.loading = false;
      }
    },

    async fetchFilesBySessionId(sessionId: number | string, page: number = 1) {
      if (!sessionId) return [];

      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const url = `${apiBaseUrl}/file/?recording_session=${sessionId}&page=${page}`;
        const res = await axios.get(url, { headers: this.getAuthHeaders() });

        this.files = res.data.results;
        this.nextPageUrl = res.data.next;
        this.previousPageUrl = res.data.previous;
        this.count = res.data.count;

        return this.files;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch files by session id';
        this.files = [];
        this.nextPageUrl = null;
        this.previousPageUrl = null;
        return [];
      } finally {
        this.loading = false;
      }
    },

    getFileById(id: number) {
      return this.files.find((f) => f.id === id) || null;
    },

    async fetchFileById(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.get(`${apiBaseUrl}/file/${id}/`, {
          headers: this.getAuthHeaders(),
        });
        return res.data;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch file';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // -------------------------------------------------
    // Created entry file
    // -------------------------------------------------
    async createFile(data: any) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.post(`${apiBaseUrl}/file/`, data, {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
        });
        this.addFile(res.data);
        return res.data;
      } catch (err: any) {
        this.error = err.message || 'Failed to create file';
        throw err;
      }
    },

    // -------------------------------------------------
    // ✅ Temporary upload to MEDIA_ROOT/temp
    // -------------------------------------------------
    async uploadFile(file: UploadFile): Promise<{ temp_path: string; task_id: string }> {
      this.error = null;
      this.loading = true;
      this.uploadProgress = 0;

      try {
        const apiBaseUrl = useApiBaseUrl();
        const formData = new FormData();
        formData.append('file', file, file.name);

        const res = await axios.post(`${apiBaseUrl}/file/upload_async/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...this.getAuthHeaders(),
          },
          onUploadProgress: (ev: AxiosProgressEvent) => {
            if (ev.total) {
              this.uploadProgress = Math.round((ev.loaded * 100) / ev.total);
            }
          },
        });

        // Exemple backend : { temp_path, task_id }
        return res.data;
      } catch (err: any) {
        console.error('Upload failed:', err);
        this.error = err.message || 'File upload failed';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // -------------------------------------------------
    // Update metadata
    // -------------------------------------------------
    async updateFile(id: number, data: any) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.put(`${apiBaseUrl}/file/${id}/`, data, {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
        });
        const index = this.files.findIndex((f) => f.id === id);
        if (index !== -1) this.files[index] = res.data;
        return res.data;
      } catch (err: any) {
        this.error = err.message || 'Failed to update file';
        throw err;
      }
    },

    // -------------------------------------------------
    // Helpers
    // -------------------------------------------------
    addFile(file: File) {
      this.files.unshift(file);
    },

    updateFileStatus(fileId: number, data: Partial<File>) {
      const index = this.files.findIndex((f) => f.id === fileId);
      if (index !== -1) {
        this.files[index] = { ...this.files[index], ...data };
      }
    },
    // =====================================================
    // Upload to MEDIA_ROOT/temp (synchronous)
    // =====================================================
    async uploadToTemp(file: UploadFile) {
      this.loading = true;
      this.uploadProgress = 0;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const formData = new FormData();
        formData.append('file', file, file.name);

        const res = await axios.post(`${apiBaseUrl}/file/upload_async/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...this.getAuthHeaders(),
          },
          onUploadProgress: (ev: AxiosProgressEvent) => {
            if (ev.total) {
              this.uploadProgress = Math.round((ev.loaded * 100) / ev.total);
            }
          },
        });

        return res.data.temp_path;
      } catch (err: any) {
        this.error = err.message || 'Upload to temp failed';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // =====================================================
    // Create file and start Celery
    // =====================================================
    async createFileAsync(data: any) {
      this.loading = true;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.post(`${apiBaseUrl}/file/`, data, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...this.getAuthHeaders(),
          },
        });
        const file = res.data;
        this.files.unshift(file);
        return file;
      } catch (err: any) {
        this.error = err.message || 'File creation failed';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // =====================================================
    // Check status task Celery (polling)
    // =====================================================
    async fetchFileTaskStatus(fileId: number) {
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.get(`${apiBaseUrl}/file/task_status/${fileId}/`, {
          headers: this.getAuthHeaders(),
        });
        this.updateFileStatus(fileId, {
          status: res.data.status,
        });
        return res.data;
      } catch (err: any) {
        console.error('Erreur statut tâche:', err);
      }
    },

    async deleteFile(fileId: number) {
      try {
        const apiBaseUrl = useApiBaseUrl();
        await axios.delete(`${apiBaseUrl}/file/${fileId}/`, {
          headers: this.getAuthHeaders(),
        });

        this.files = this.files.filter((f) => f.id !== fileId);
        this.count = this.files.length;
      } catch (err: any) {
        console.error('Failed to delete file:', err);
        this.error = err.message || 'Failed to delete file';
      }
    },
  },
});
