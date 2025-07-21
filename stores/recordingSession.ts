// ~/stores/recordingSession.ts
import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '@/composables/useApiBaseUrl'

export const useRecordingSessionStore = defineStore('recordingSession', {
  state: () => ({
    sessions: [] as any[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchSessions() {
      this.loading = true
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let url = `${apiBaseUrl}/recording-session/`
        const allSessions = []

        while (url) {
          const res = await axios.get(url)
          if (Array.isArray(res.data.results)) {
            allSessions.push(...res.data.results)
          } else {
            // Si pagination désactivée côté DRF, récupère les données directement
            allSessions.push(...res.data)
            break
          }
          url = res.data.next // DRF renvoie null si plus de pages
        }

        this.sessions = allSessions
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch recording sessions'
        this.sessions = []
      } finally {
        this.loading = false
      }
    },
    async createSession(data: any) {
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/recording-session/`, data)
        this.sessions.push(res.data)
        return res.data
      } catch (err: any) {
        throw err
      }
    },
    async updateSession(id: number, data: any) {
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.patch(`${apiBaseUrl}/recording-session/${id}/`, data)
        const index = this.sessions.findIndex(s => s.id === id)
        if (index !== -1) this.sessions[index] = res.data
        return res.data
      } catch (err: any) {
        throw err
      }
    },
    getSessionById(id: number) {
      return this.sessions.find(s => s.id === id) ?? null
    },
  }
})
