// ~/stores/recordingSession.ts
import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '@/composables/useApiBaseUrl'
import { token } from '@/composables/useAuth'
import type { SoftwareVersion } from '@/stores/software'

export interface Study { id: number; name: string; description?: string | null; start_date?: string | null; end_date?: string | null; created_at?: string | null; modified_at?: string | null }
export interface Protocol { id: number; name: string }
export interface Hardware { id: number; name: string; type: string }
export interface Laboratory { id: number; name: string; institution?: string | null; unit?: string | null; address?: string | null; country?: string | null; contact?: string | null }
export interface AnimalProfile { id: number; name: string }

export interface RecordingSession {
  id: number
  name: string
  protocol: Protocol | null
  studies: Study[]
  description?: string | null
  date?: string | null
  status: 'draft' | 'published'
  duration?: number | null
  laboratory?: Laboratory | null
  animal_profiles: AnimalProfile[]

  context_temperature_value?: string | null
  context_temperature_unit?: '°C' | '°F' | null
  context_brightness?: number | null

  equipment_acquisition_software: SoftwareVersion[]
  equipment_acquisition_hardware_soundcards: Hardware[]
  equipment_acquisition_hardware_speakers: Hardware[]
  equipment_acquisition_hardware_amplifiers: Hardware[]
  equipment_acquisition_hardware_microphones: Hardware[]

  equipment_channels?: 'mono' | 'stereo' | 'more than 2' | null
  equipment_sound_isolation?: 'soundproof room' | 'soundproof cage' | 'no specific sound isolation' | null

  created_at?: string | null
  modified_at?: string | null
}

export interface RecordingSessionPayload {
  name: string
  description?: string | null
  date?: string | null
  status?: 'draft' | 'published'
  duration?: number | null
  laboratory?: number | null
  studies?: number[]
  animal_profiles?: number[]

  context_temperature_value?: string | null
  context_temperature_unit?: '°C' | '°F' | null
  context_brightness?: number | null

  equipment_acquisition_software?: number[]
  equipment_acquisition_hardware_soundcards?: number[]
  equipment_acquisition_hardware_speakers?: number[]
  equipment_acquisition_hardware_amplifiers?: number[]
  equipment_acquisition_hardware_microphones?: number[]

  equipment_channels?: 'mono' | 'stereo' | 'more than 2' | null
  equipment_sound_isolation?: 'soundproof room' | 'soundproof cage' | 'no specific sound isolation' | null
}

function toDjangoPayload(session: RecordingSessionPayload) {
  const {
    studies,
    animal_profiles,
    equipment_acquisition_software,
    equipment_acquisition_hardware_soundcards,
    equipment_acquisition_hardware_speakers,
    equipment_acquisition_hardware_amplifiers,
    equipment_acquisition_hardware_microphones,
    laboratory,
    ...rest
  } = session

  return {
    ...rest,
    laboratory_id: laboratory,
    study_ids: studies,
    animal_profile_ids: animal_profiles,
    equipment_acquisition_software_ids: equipment_acquisition_software,
    equipment_acquisition_hardware_soundcard_ids: equipment_acquisition_hardware_soundcards,
    equipment_acquisition_hardware_speaker_ids: equipment_acquisition_hardware_speakers,
    equipment_acquisition_hardware_amplifier_ids: equipment_acquisition_hardware_amplifiers,
    equipment_acquisition_hardware_microphone_ids: equipment_acquisition_hardware_microphones,
  }
}

export const useRecordingSessionStore = defineStore('recordingSession', {
  state: () => ({
    sessions: [] as RecordingSession[],
    studies: [] as Study[],
    loadingSessions: false,
    loadingStudies: false,
    errorSessions: null as string | null,
    errorStudies: null as string | null,
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
  }),

  actions: {
    getAuthHeaders() {
      return token.value ? { Authorization: `Bearer ${token.value}` } : {}
    },

    async fetchSessions() {
      this.loadingSessions = true
      this.errorSessions = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let url = `${apiBaseUrl}/recording-session/`
        const allSessions: RecordingSession[] = []

        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() })
          if (Array.isArray(res.data.results)) allSessions.push(...res.data.results)
          else { allSessions.push(...res.data); break }
          url = res.data.next
        }

        this.sessions = allSessions
      } catch (err: any) {
        this.errorSessions = err.message || 'Failed to fetch recording sessions'
        this.sessions = []
      } finally {
        this.loadingSessions = false
      }
    },

    async fetchSessionsPage(page = 1) {
      this.loadingSessions = true;
      this.errorSessions = null;

      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.get(`${apiBaseUrl}/recording-session/?page=${page}`, {
          headers: this.getAuthHeaders(),
        });

        this.sessions = res.data.results;
        this.currentPage = page;
        this.totalPages = Math.ceil(res.data.count / this.pageSize);
      } catch (err: any) {
        this.errorSessions = err.message || 'Failed to fetch sessions';
        this.sessions = [];
      } finally {
        this.loadingSessions = false;
      }
    },

    async searchRecordingSessions(query: string) {
      this.loadingSessions = true;
      this.errorSessions = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.get(`${apiBaseUrl}/recording-session/`, {
          headers: this.getAuthHeaders(),
          params: { search: query },
        });
        this.sessions = res.data.results;
        this.currentPage = 1;
        this.totalPages = Math.ceil(res.data.count / this.pageSize);
      } catch (err: any) {
        this.errorSessions = err.message || 'Failed to search recording sessions'
        this.sessions = []
      } finally {
        this.loadingSessions = false
      }
    },

    async fetchStudies() {
      this.loadingStudies = true
      this.errorStudies = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let url = `${apiBaseUrl}/study/`
        const allStudies: Study[] = []

        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() })
          if (Array.isArray(res.data.results)) allStudies.push(...res.data.results)
          else { allStudies.push(...res.data); break }
          url = res.data.next
        }

        this.studies = allStudies
      } catch (err: any) {
        this.errorStudies = err.message || 'Failed to fetch studies'
        this.studies = []
      } finally {
        this.loadingStudies = false
      }
    },

    async createSession(data: RecordingSessionPayload) {
      const payload = toDjangoPayload(data)
      const apiBaseUrl = useApiBaseUrl()
      const res = await axios.post(`${apiBaseUrl}/recording-session/`, payload, {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      })
      this.sessions.push(res.data)
      return res.data
    },

    async updateSession(id: number, data: RecordingSessionPayload) {
      const payload = toDjangoPayload(data)
      const apiBaseUrl = useApiBaseUrl()
      const res = await axios.patch(`${apiBaseUrl}/recording-session/${id}/`, payload, {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      })
      const index = this.sessions.findIndex(s => s.id === id)
      if (index !== -1) this.sessions[index] = res.data
      return res.data
    },

    // 🔹 Nouvelle fonction pour mettre à jour le protocole d'une session
    async updateSessionProtocol(sessionId: number, protocolId: number) {
      try {
        const apiBaseUrl = useApiBaseUrl()
        const payload = { protocol_id: protocolId }
        const res = await axios.patch(
          `${apiBaseUrl}/recording-session/${sessionId}/`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              ...this.getAuthHeaders(),
            },
          }
        )
        const index = this.sessions.findIndex((s) => s.id === sessionId)
        if (index !== -1) this.sessions[index] = res.data
        return res.data
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error updating session protocol:', err)
        throw err
      }
    },

    async getSessionById(id: number): Promise<RecordingSession | null> {
      const cached = this.sessions.find(s => s.id === id)
      if (cached) return cached

      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.get(`${apiBaseUrl}/recording-session/${id}/`, {
          headers: this.getAuthHeaders(),
        })
        return res.data as RecordingSession
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch session from API:', err.message)
        return null
      }
    },
  },
})
