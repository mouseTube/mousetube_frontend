import { defineStore } from 'pinia';
import axios from 'axios';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { useAuth } from '~/composables/useAuth';

export interface Reference {
  id: number;
  name: string;
  description?: string | null;
  url?: string | null;
  doi?: string | null;
  status: 'draft' | 'waiting validation' | 'validated' | '';
  created_by?: number | null;
  created_at?: string | null;
  modified_at?: string | null;
}

export interface ReferenceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Reference[];
}

export const useReferenceStore = defineStore('reference', {
  state: () => ({
    references: {
      count: 0,
      next: null,
      previous: null,
      results: [] as Reference[],
    } as ReferenceListResponse,
    loading: false,
    error: null as string | null,
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
  }),

  actions: {
    getAuthHeaders() {
      const { token } = useAuth();
      return token.value ? { Authorization: `Bearer ${token.value}` } : {};
    },

    addOrUpdateReference(reference: Reference) {
      const index = this.references.results.findIndex((r) => r.id === reference.id);
      if (index !== -1) {
        this.references.results[index] = reference;
      } else {
        this.references.results.push(reference);
      }
      this.references.count = this.references.results.length;
    },

    async fetchReferencesPage(
      page = 1,
      searchQuery: string | null = null,
      filters: Record<string, string | number | null> = {},
      ordering: string | null = null
    ) {
      this.loading = true;
      this.error = null;

      try {
        const apiBaseUrl = useApiBaseUrl();
        const params: Record<string, string | number> = { page };
        if (searchQuery?.trim()) params.search = searchQuery.trim();
        if (ordering) params.ordering = ordering;

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== '') params[key] = String(value);
        });

        const res = await axios.get(`${apiBaseUrl}/reference/`, {
          params,
          headers: this.getAuthHeaders(),
        });

        const refs: Reference[] = (res.data.results ?? []) as Reference[];
        this.references.results = refs;
        this.references.count = res.data.count;
        this.currentPage = page;
        this.totalPages = Math.ceil(this.references.count / this.pageSize);
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch references';
        this.references = { count: 0, next: null, previous: null, results: [] };
      } finally {
        this.loading = false;
      }
    },

    async getReferenceById(id: number): Promise<Reference | null> {
      let ref = this.references.results.find((r) => r.id === id) || null;
      if (!ref) {
        try {
          const apiBaseUrl = useApiBaseUrl();
          const res = await axios.get<Reference>(`${apiBaseUrl}/reference/${id}/`, {
            headers: this.getAuthHeaders(),
          });
          ref = res.data;
          if (ref) this.addOrUpdateReference(ref);
        } catch (err) {
          console.error('Reference not found', err);
          return null;
        }
      }
      return ref;
    },

    async createReference(data: Omit<Reference, 'id'>) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.post(`${apiBaseUrl}/reference/`, data, {
          headers: this.getAuthHeaders(),
        });
        const newRef: Reference = res.data;
        this.addOrUpdateReference(newRef);
        return newRef;
      } catch (err: any) {
        this.error = err.message || 'Failed to create reference';
        throw err;
      }
    },

    async updateReference(id: number, data: Partial<Reference>) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.put(`${apiBaseUrl}/reference/${id}/`, data, {
          headers: this.getAuthHeaders(),
        });
        const updatedRef: Reference = res.data;
        this.addOrUpdateReference(updatedRef);
        return updatedRef;
      } catch (err: any) {
        this.error = err.message || 'Failed to update reference';
        throw err;
      }
    },

    async deleteReference(id: number) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        await axios.delete(`${apiBaseUrl}/reference/${id}/`, {
          headers: this.getAuthHeaders(),
        });
        this.references.results = this.references.results.filter((r) => r.id !== id);
        this.references.count = this.references.results.length;
      } catch (err: any) {
        this.error = err.message || 'Failed to delete reference';
        throw err;
      }
    },

    async fetchAllReferences() {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        let url = `${apiBaseUrl}/reference/`;
        let allResults: Reference[] = [];

        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() });
          const pageResults: Reference[] = (res.data.results ?? []) as Reference[];
          allResults = [...allResults, ...pageResults];
          url = res.data.next;
        }

        this.references.results = allResults;
        this.references.count = allResults.length;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch references';
      } finally {
        this.loading = false;
      }
    },
  },
});
