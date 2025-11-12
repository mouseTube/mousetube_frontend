import { defineStore } from 'pinia';
import axios from 'axios';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { token } from '@/composables/useAuth';

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  institution?: string | null;
  position?: string | null;
  unit?: string | null;
  address?: string | null;
  country?: string | null;
  status?: 'draft' | 'waiting_validation' | 'validated' | string | null;
  created_at?: string | null;
  modified_at?: string | null;
  created_by?: number | null;
}

export interface ContactPayload {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  institution?: string | null;
  position?: string | null;
  unit?: string | null;
  address?: string | null;
  country?: string | null;
  status?: string | null;
}

export interface ContactListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Contact[];
}

export const useContactStore = defineStore('contact', {
  state: () => ({
    contacts: [] as Contact[],
    loading: false,
    error: null as string | null,
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    apiBase: '' as string,
  }),

  actions: {
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {};
    },

    addOrUpdateContact(contact: Contact) {
      const idx = this.contacts.findIndex((c) => c.id === contact.id);
      if (idx !== -1) this.contacts[idx] = contact;
      else this.contacts.push(contact);
    },

    async fetchContactsPage(page = 1, search: string | null = null) {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const params: Record<string, any> = { page };
        if (search && search.trim()) params.search = search.trim();
        const res = await axios.get(`${apiBaseUrl}/contact/`, {
          params,
          headers: this.getAuthHeaders(),
        });
        this.contacts = res.data.results;
        this.currentPage = page;
        this.pageSize = res.data.results.length;
        this.totalPages = Math.ceil(res.data.count / this.pageSize || 1);
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch contacts';
        this.contacts = [];
      } finally {
        this.loading = false;
      }
    },

    async fetchAllContacts() {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        let url = `${apiBaseUrl}/contact/`;
        const all: Contact[] = [];
        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() });
          if (Array.isArray(res.data.results)) {
            all.push(...res.data.results);
            url = res.data.next;
          } else {
            all.push(...res.data);
            break;
          }
        }
        this.contacts = all;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch contacts';
        this.contacts = [];
      } finally {
        this.loading = false;
      }
    },

    async getContactById(id: number): Promise<Contact | null> {
      const existing = this.contacts.find((c) => c.id === id);
      if (existing) return existing;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.get(`${apiBaseUrl}/contact/${id}/`, {
          headers: this.getAuthHeaders(),
        });
        const contact: Contact = res.data;
        this.contacts.push(contact);
        return contact;
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Error fetching contact by id', err);
        return null;
      }
    },

    async createContact(data: ContactPayload) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.post(`${apiBaseUrl}/contact/`, data, {
          headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        });
        const created: Contact = res.data;
        this.contacts.push(created);
        return created;
      } catch (err: any) {
        this.error = err.message || 'Failed to create contact';
        throw err;
      }
    },

    async updateContact(id: number, data: Partial<ContactPayload>) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.patch(`${apiBaseUrl}/contact/${id}/`, data, {
          headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        });
        const updated: Contact = res.data;
        const idx = this.contacts.findIndex((c) => c.id === id);
        if (idx !== -1) this.contacts[idx] = updated;
        else this.contacts.push(updated);
        return updated;
      } catch (err: any) {
        this.error = err.message || 'Failed to update contact';
        throw err;
      }
    },

    async deleteContact(id: number) {
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        await axios.delete(`${apiBaseUrl}/contact/${id}/`, {
          headers: this.getAuthHeaders(),
        });
        this.contacts = this.contacts.filter((c) => c.id !== id);
      } catch (err: any) {
        this.error = err.message || 'Failed to delete contact';
        throw err;
      }
    },
  },
});
