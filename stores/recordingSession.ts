// ~/stores/recordingSession.ts
import { defineStore } from 'pinia';
import axios from 'axios';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { token } from '@/composables/useAuth';
import type { SoftwareVersion } from '@/stores/software';
import type { AnimalProfile } from '@/stores/animalProfile';

export interface Study {
  id: number;
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
}
export interface Protocol {
  id: number;
  name: string;
}
export interface Hardware {
  id: number;
  name: string;
  type: string;
}
export interface Laboratory {
  id: number;
  name: string;
  institution?: string | null;
  unit?: string | null;
  address?: string | null;
  country?: string | null;
  contact?: string | null;
}

export interface RecordingSession {
  id: number;
  name: string;
  is_multiple: boolean;
  protocol: Protocol | null;
  studies: Study[];
  description?: string | null;
  date?: string | null;
  status: 'draft' | 'published';
  duration?: number | null;
  laboratory?: Laboratory | null;
  animal_profiles: AnimalProfile[];

  context_temperature_value?: string | null;
  context_temperature_unit?: '°C' | '°F' | null;
  context_brightness?: number | null;

  equipment_acquisition_software: SoftwareVersion[];
  equipment_acquisition_hardware_soundcards: Hardware[];
  equipment_acquisition_hardware_speakers: Hardware[];
  equipment_acquisition_hardware_amplifiers: Hardware[];
  equipment_acquisition_hardware_microphones: Hardware[];

  equipment_channels?: 'mono' | 'stereo' | 'more than 2' | null;
  equipment_sound_isolation?:
    | 'soundproof room'
    | 'soundproof cage'
    | 'no specific sound isolation'
    | null;

  created_by?: number | null;
  created_at?: string | null;
  modified_at?: string | null;
}

export interface RecordingSessionPayload {
  name: string;
  protocol?: number | null;
  is_multiple?: boolean;
  description?: string | null;
  date?: string | null;
  duration?: number | null;
  laboratory?: number | null;
  studies?: number[];
  animal_profiles?: number[];

  context?: {
    temperature?: { value: string | null; unit: '°C' | '°F' | null | undefined };
    brightness?: number | null;
  };

  equipment?: {
    channels?: 'mono' | 'stereo' | 'more than 2' | null;
    sound_isolation?: 'soundproof room' | 'soundproof cage' | 'no specific sound isolation' | null;
    soundcards?: number[];
    microphones?: number[];
    speakers?: number[];
    amplifiers?: number[];
    acquisition_software?: number[];
  };
}

function toDjangoPayload(session: RecordingSessionPayload) {
  const {
    studies,
    animal_profiles,
    laboratory,
    context,
    equipment,
    is_multiple,
    protocol,
    ...rest
  } = session;

  const payload: any = {
    ...rest,
    is_multiple,
    laboratory_id: laboratory,
    study_ids: studies,
    animal_profile_ids: animal_profiles,
    equipment_acquisition_software_ids: equipment?.acquisition_software,
    equipment_acquisition_hardware_soundcard_ids: equipment?.soundcards,
    equipment_acquisition_hardware_speaker_ids: equipment?.speakers,
    equipment_acquisition_hardware_amplifier_ids: equipment?.amplifiers,
    equipment_acquisition_hardware_microphone_ids: equipment?.microphones,
    equipment_channels: equipment?.channels,
    equipment_sound_isolation: equipment?.sound_isolation,
    context_temperature_value: context?.temperature?.value ?? null,
    context_temperature_unit: context?.temperature?.unit ?? null,
    context_brightness: context?.brightness ?? null,
  };

  // include protocol_id only when caller explicitly provided a protocol field
  if (typeof protocol !== 'undefined') {
    payload.protocol_id = protocol ?? null;
  }

  // include animal_profile_ids only when caller explicitly provided animal_profiles
  if (typeof animal_profiles !== 'undefined') {
    payload.animal_profile_ids = animal_profiles ?? null;
  }

  return payload;
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
      return token.value ? { Authorization: `Bearer ${token.value}` } : {};
    },

    async fetchSessions() {
      this.loadingSessions = true;
      this.errorSessions = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        let url = `${apiBaseUrl}/recording-session/`;
        const allSessions: RecordingSession[] = [];

        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() });
          if (Array.isArray(res.data.results)) allSessions.push(...res.data.results);
          else {
            allSessions.push(...res.data);
            break;
          }
          url = res.data.next;
        }

        this.sessions = allSessions;
      } catch (err: any) {
        this.errorSessions = err.message || 'Failed to fetch recording sessions';
        this.sessions = [];
      } finally {
        this.loadingSessions = false;
      }
    },

    async fetchSessionsPage(
      page = 1,
      searchQuery: string | null = null,
      isMultiple: boolean | null = null,
      ordering: string | null = null
    ) {
      this.loadingSessions = true;
      this.errorSessions = null;

      try {
        const apiBaseUrl = useApiBaseUrl();

        const params: any = { page };
        if (searchQuery?.trim()) params.search = searchQuery.trim();
        if (isMultiple !== null) params.is_multiple = isMultiple;
        if (ordering) params.ordering = ordering;

        const res = await axios.get(`${apiBaseUrl}/recording-session/`, {
          headers: this.getAuthHeaders(),
          params,
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

    async fetchStudies() {
      this.loadingStudies = true;
      this.errorStudies = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        let url = `${apiBaseUrl}/study/`;
        const allStudies: Study[] = [];

        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() });
          if (Array.isArray(res.data.results)) allStudies.push(...res.data.results);
          else {
            allStudies.push(...res.data);
            break;
          }
          url = res.data.next;
        }

        this.studies = allStudies;
      } catch (err: any) {
        this.errorStudies = err.message || 'Failed to fetch studies';
        this.studies = [];
      } finally {
        this.loadingStudies = false;
      }
    },

    async createSession(data: RecordingSessionPayload) {
      const payload = toDjangoPayload(data);
      const apiBaseUrl = useApiBaseUrl();
      const res = await axios.post(`${apiBaseUrl}/recording-session/`, payload, {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      });
      this.sessions.push(res.data);
      return res.data;
    },

    async duplicateSession(original: RecordingSession, newName: string, newDate: string | null) {
      const payload: RecordingSessionPayload = {
        name: newName,
        date: newDate,
        is_multiple: original.is_multiple,
        protocol: original.protocol?.id ?? undefined,
        laboratory: original.laboratory?.id ?? undefined,
        studies: original.studies?.map((s) => s.id) ?? [],
        animal_profiles: original.animal_profiles?.map((a) => a.id) ?? [],
        description: original.description ?? null,
        duration: original.duration ?? null,
        context: {
          temperature: original.context_temperature_value
            ? {
                value: original.context_temperature_value,
                unit: original.context_temperature_unit,
              }
            : undefined,
          brightness: original.context_brightness ?? undefined,
        },
        equipment: {
          channels: original.equipment_channels ?? undefined,
          sound_isolation: original.equipment_sound_isolation ?? undefined,
          soundcards: original.equipment_acquisition_hardware_soundcards?.map((h) => h.id) ?? [],
          microphones: original.equipment_acquisition_hardware_microphones?.map((h) => h.id) ?? [],
          speakers: original.equipment_acquisition_hardware_speakers?.map((h) => h.id) ?? [],
          amplifiers: original.equipment_acquisition_hardware_amplifiers?.map((h) => h.id) ?? [],
          acquisition_software: original.equipment_acquisition_software?.map((s) => s.id) ?? [],
        },
      };
      return await this.createSession(payload);
    },

    async updateSession(id: number, data: RecordingSessionPayload) {
      const payload = toDjangoPayload(data);
      const apiBaseUrl = useApiBaseUrl();
      const res = await axios.patch(`${apiBaseUrl}/recording-session/${id}/`, payload, {
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
      });
      const index = this.sessions.findIndex((s) => s.id === id);
      const newSession = res.data as RecordingSession;
      if (index !== -1) {
        const existing = this.sessions[index];
        this.sessions[index] = {
          ...existing,
          ...newSession,
          // prefer server values, but fall back to existing nested objects when missing
          protocol: newSession.protocol ?? existing.protocol,
          animal_profiles: newSession.animal_profiles ?? existing.animal_profiles,
        };
      } else {
        this.sessions.push(newSession);
      }
      return res.data;
    },

    async updateSessionProtocol(sessionId: number, protocolId: number) {
      try {
        const apiBaseUrl = useApiBaseUrl();
        const payload = { protocol_id: protocolId };
        const res = await axios.patch(`${apiBaseUrl}/recording-session/${sessionId}/`, payload, {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
        });
        const index = this.sessions.findIndex((s) => s.id === sessionId);
        const newSession = res.data as RecordingSession;
        if (index !== -1) {
          const existing = this.sessions[index];
          this.sessions[index] = {
            ...existing,
            ...newSession,
            protocol: newSession.protocol ?? existing.protocol,
            animal_profiles: newSession.animal_profiles ?? existing.animal_profiles,
          };
        } else {
          this.sessions.push(newSession);
        }
        return res.data;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error updating session protocol:', err);
        throw err;
      }
    },

    async getSessionById(id: number): Promise<RecordingSession | null> {
      const cached = this.sessions.find((s) => s.id === id);
      if (cached) return cached;

      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.get(`${apiBaseUrl}/recording-session/${id}/`, {
          headers: this.getAuthHeaders(),
        });
        const session = res.data as RecordingSession;
        this.sessions.push(session);
        return this.sessions.find((s) => s.id === id) || null;
      } catch (err: any) {
        console.error('Failed to fetch session from API:', err.message);
        return null;
      }
    },

    async deleteSession(id: number) {
      try {
        const apiBaseUrl = useApiBaseUrl();
        await axios.delete(`${apiBaseUrl}/recording-session/${id}/`, {
          headers: this.getAuthHeaders(),
        });
        this.sessions = this.sessions.filter((s) => s.id !== id);
        return true;
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete session:', err.message);
        throw err;
      }
    },
    async updateSessionAnimalProfiles(sessionId: number, profileIds: number[]) {
      try {
        const apiBaseUrl = useApiBaseUrl();
        const payload = { animal_profile_ids: profileIds }; // juste le champ à mettre à jour
        const res = await axios.patch(`${apiBaseUrl}/recording-session/${sessionId}/`, payload, {
          headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        });

        const index = this.sessions.findIndex((s) => s.id === sessionId);
        const newSession = res.data as RecordingSession;
        if (index !== -1) {
          const existing = this.sessions[index];
          this.sessions[index] = {
            ...existing,
            ...newSession,
            // preserve nested relations when the response omits them
            protocol: newSession.protocol ?? existing.protocol,
            animal_profiles: newSession.animal_profiles ?? existing.animal_profiles,
          };
        } else {
          this.sessions.push(newSession);
        }
        return res.data;
      } catch (err) {
        console.error('Failed to update animal profiles:', err);
        throw err;
      }
    },
    async updateSessionStatus(sessionId: number, status: 'draft' | 'published') {
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.get(`${apiBaseUrl}/recording-session/${sessionId}/`, {
          headers: this.getAuthHeaders(),
        });
        const fetched = res.data as RecordingSession;
        // apply requested status locally (in case API hasn't propagated it yet)
        fetched.status = status;

        const idx = this.sessions.findIndex((s) => s.id === sessionId);
        if (idx !== -1) {
          const existing = this.sessions[idx];
          this.sessions[idx] = {
            ...existing,
            ...fetched,
            protocol: fetched.protocol ?? existing.protocol,
            animal_profiles: fetched.animal_profiles ?? existing.animal_profiles,
          };
        } else {
          this.sessions.push(fetched);
        }
        return fetched;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch session when updating status:', err);
        return null;
      }
    },
  },
});
