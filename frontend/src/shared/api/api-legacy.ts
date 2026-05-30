/**
 * Single source for all HTTP calls to the backend.
 *
 * - We use one shared axios instance so the JWT is added to every request.
 * - When the server returns 401/403 we try to refresh the access token once.
 *   If that fails we log the user out.
 *
 * The exported `xxxApi` objects group calls by feature (auth, decks, study,
 * students, chat, lessons, share). Pages should always call those instead of axios
 * directly.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import type { User } from '../types';

import type {
  AppNotificationItem,
  AssignmentsViewPayload,
  CardItem,
  ChatConversation,
  ChatMessage,
  ChatThread,
  ChatUnreadTotal,
  ClassroomLessonFocusSnapshot,
  ClassroomLessonOption,
  ClassroomTimerPayload,
  ClassroomWorkspacePayload,
  DeckItem,
  DeckShare,
  DueReviewPayload,
  DueSummary,
  LessonBlockItem,
  LessonBlockType,
  LessonItem,
  LessonReminderPayload,
  MaterialsPersonalViewDTO,
  NextBookingPayload,
  Paged,
  PrepareCallPayload,
  StudentAssignmentItem,
  StudentLink,
  TeacherDetail,
  TeacherDirectoryEntry,
  TeacherReview,
  TeacherSlotItem,
  TeacherSummaryPayload,
  UserSummary,
} from './types';

/**
 * Auth-bridge — wired up from `shared/stores/authStore` via
 * `configureLegacyApiAuth` so axios stays decoupled from React.
 */
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface LegacyApiAuthBridge {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokensRefreshed: (tokens: TokenPair) => void;
  onAuthFailure: () => void;
}

const noopAuthBridge: LegacyApiAuthBridge = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  onTokensRefreshed: () => {},
  onAuthFailure: () => {},
};

let authBridge: LegacyApiAuthBridge = noopAuthBridge;

export function configureLegacyApiAuth(bridge: LegacyApiAuthBridge) {
  authBridge = bridge;
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/* ------------------------------- Interceptors ---------------------------- */

// Attach the JWT (if any) to every outgoing request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authBridge.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Only one refresh request runs at a time. Other failed calls wait for it.
let refreshPromise: Promise<string> | null = null;

/** Use the refresh token to get a fresh access token. Throws on failure. */
async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = authBridge.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  refreshPromise = axios
    .post(`${BASE_URL}/auth/refresh`, { refreshToken })
    .then((res) => {
      const { accessToken, refreshToken: newRefresh } = res.data;
      authBridge.onTokensRefreshed({
        accessToken,
        refreshToken: newRefresh || refreshToken,
      });
      return accessToken as string;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// On 401/403: refresh the token once, then retry the original request.
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = err.response?.status;

    const isAuthError = status === 401 || status === 403;
    const isRefreshCall = original?.url?.includes('/auth/refresh');

    if (isAuthError && original && !original._retry && !isRefreshCall) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        if (original.headers)
          original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        authBridge.onAuthFailure();
      }
    }

    return Promise.reject(err);
  },
);

/* --------------------------------- Auth ---------------------------------- */

/** Sign-up / sign-in / current-user calls. */
export const authApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
    /** LEARNER or TEACHER — matches backend sign-up. */
    accountType?: 'LEARNER' | 'TEACHER';
    /** Required for learners — ISO 639-1 code. Optional for teachers. */
    learningLanguage?: string;
  }) => api.post('/auth/register', data),
  login: (data: { usernameOrEmail: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get<UserSummary>('/auth/me'),
  patchProfile: (data: Record<string, unknown>) =>
    api.patch<User>('/auth/profile', data),
  upgradeToTeacher: () => api.post<User>('/auth/upgrade-to-teacher'),
};

/* -------------------------------- Progress ------------------------------- */

export const progressApi = {
  /** Streak, totals, daily heatmap and achievement badges. */
  get: () => api.get('/study/progress'),
};

/* ----------------------------- Availability ------------------------------ */

export const availabilityApi = {
  /** Teacher's own slots (BLOCKED/OPEN/BOOKED). */
  myAvailability: (fromIso: string, toIso: string) =>
    api.get('/me/availability', { params: { from: fromIso, to: toIso } }),
  createSlot: (data: {
    startTime: string;
    endTime: string;
    status?: 'OPEN' | 'BLOCKED';
    title?: string;
    description?: string;
  }) => api.post('/me/availability', data),
  patchSlot: (
    slotId: number,
    data: {
      status?: 'OPEN' | 'BLOCKED';
      startTime?: string;
      endTime?: string;
      title?: string | null;
      description?: string | null;
      /** Chain-shift overlapping slots by the same start delta (teacher calendar). */
      shiftOverlappingSlots?: boolean;
    },
  ) => api.patch(`/me/availability/${slotId}`, data),
  /** Teacher sets Zoom/Meet link on a BOOKED slot (empty string clears). */
  patchMeetingUrl: (slotId: number, data: { meetingUrl: string }) =>
    api.patch<TeacherSlotItem>(`/me/availability/${slotId}/meeting-url`, data),
  deleteSlot: (slotId: number) => api.delete(`/me/availability/${slotId}`),
  /** Teacher releases a booking, or learner cancels own booking (>24h before slot start). */
  cancelBooking: (slotId: number) =>
    api.delete(`/me/availability/${slotId}/booking`),
  /** Public: open slots for a teacher. */
  forTeacher: (teacherId: number, fromIso: string, toIso: string) =>
    api.get(`/teachers/${teacherId}/availability`, {
      params: { from: fromIso, to: toIso },
    }),
  /** Student books a slot. */
  bookSlot: (teacherId: number, slotId: number) =>
    api.post(`/teachers/${teacherId}/availability/${slotId}/book`),
};

/** Booked slots + lesson reminder polling. */
export const bookingsApi = {
  myBookedSlots: () => api.get<TeacherSlotItem[]>('/me/booked-slots'),
  lessonReminder: () => api.get<LessonReminderPayload>('/me/lesson-reminder'),
  nextBooking: () => api.get<NextBookingPayload>('/me/next-booking'),
};

/** Shared class per teacher ↔ student link (video, recording consent, homework). */
export const classroomsApi = {
  workspace: (linkId: number) =>
    api.get<ClassroomWorkspacePayload>(`/me/classrooms/${linkId}`),
  eligibleLessons: (linkId: number) =>
    api.get<ClassroomLessonOption[]>(
      `/me/classrooms/${linkId}/eligible-lessons`,
    ),
  prepareCall: (linkId: number) =>
    api.post<PrepareCallPayload>(`/me/classrooms/${linkId}/prepare-call`),
  patchRecordingConsent: (linkId: number, data: { consent: boolean }) =>
    api.patch<ClassroomWorkspacePayload>(
      `/me/classrooms/${linkId}/recording-consent`,
      data,
    ),
  patchActiveLesson: (linkId: number, data: { lessonId: number | null }) =>
    api.patch<ClassroomWorkspacePayload>(
      `/me/classrooms/${linkId}/active-lesson`,
      data,
    ),
  patchLessonFocus: (
    linkId: number,
    data: {
      section: 'LESSON_SECTION' | 'BLOCK' | 'VIDEO' | 'RECORDING';
      lessonSectionId?: number | null;
      blockId?: number | null;
    },
  ) =>
    api.patch<ClassroomWorkspacePayload>(
      `/me/classrooms/${linkId}/lesson-focus`,
      data,
    ),
  lessonFocusSnapshot: (linkId: number) =>
    api.get<ClassroomLessonFocusSnapshot>(
      `/me/classrooms/${linkId}/lesson-focus`,
    ),
  timer: (linkId: number) =>
    api.get<ClassroomTimerPayload>(`/me/classrooms/${linkId}/timer`),
  timerStart: (linkId: number) =>
    api.post<ClassroomTimerPayload>(`/me/classrooms/${linkId}/timer/start`),
  timerStop: (linkId: number) =>
    api.post<ClassroomTimerPayload>(`/me/classrooms/${linkId}/timer/stop`),
  timerReset: (linkId: number) =>
    api.post<ClassroomTimerPayload>(`/me/classrooms/${linkId}/timer/reset`),
};

/* --------------------------- Teacher directory --------------------------- */

export const teachersApi = {
  directory: (params: {
    lang?: string;
    q?: string;
    speaks?: string;
    minRate?: string;
    maxRate?: string;
    hasVideo?: boolean;
    /** Pass true to list teachers who offer a trial lesson. */
    trial?: boolean;
    specialties?: string;
    sort?: 'new' | 'rate' | 'rate_desc';
    page?: number;
    size?: number;
  }) =>
    api.get<Paged<TeacherDirectoryEntry>>('/teachers/directory', { params }),
  getTeacher: (id: number) => api.get<TeacherDetail>(`/teachers/${id}`),
  postReview: (teacherId: number, body: { rating: number; comment?: string }) =>
    api.post<TeacherReview>(`/teachers/${teacherId}/reviews`, body),
};

/* --------------------------------- Decks --------------------------------- */

/** All deck and card endpoints. */
export const deckApi = {
  /** Decks owned by the current user. */
  getMyDecks: () => api.get<DeckItem[]>('/decks/my'),
  /** Decks shared with the current user (by their teacher, etc.). */
  getSharedDecks: () => api.get<DeckItem[]>('/decks/shared'),
  /** Public decks (paged). */
  getPublicDecks: (page = 0) => api.get(`/decks/public?page=${page}`),
  /** A single deck (with cards). */
  getDeck: (id: number) => api.get<DeckItem>(`/decks/${id}`),
  createDeck: (data: Partial<DeckItem>) => api.post<DeckItem>('/decks', data),
  updateDeck: (id: number, data: Partial<DeckItem>) =>
    api.put<DeckItem>(`/decks/${id}`, data),
  deleteDeck: (id: number) => api.delete(`/decks/${id}`),
  search: (q: string, page = 0) =>
    api.get(`/decks/search?q=${encodeURIComponent(q)}&page=${page}`),
  /** Share deck with the student on a teacher–student link (own deck or public catalog material). */
  shareWithLink: (deckId: number, body: { linkId: number }) =>
    api.post<DeckShare>(`/decks/${deckId}/share-with-link`, body),

  addCard: (deckId: number, data: Partial<CardItem>) =>
    api.post<CardItem>(`/decks/${deckId}/cards`, data),
  updateCard: (deckId: number, cardId: number, data: Partial<CardItem>) =>
    api.put<CardItem>(`/decks/${deckId}/cards/${cardId}`, data),
  deleteCard: (deckId: number, cardId: number) =>
    api.delete(`/decks/${deckId}/cards/${cardId}`),
};

/** Endpoints to share a private deck with a specific user (by email). */
export const shareApi = {
  /** Who can see this deck right now? Owner only. */
  listDeckShares: (deckId: number) =>
    api.get<DeckShare[]>(`/decks/${deckId}/shares`),
  /** Share with the user that has this email. */
  shareDeckByEmail: (deckId: number, email: string) =>
    api.post<DeckShare>(`/decks/${deckId}/share`, { email }),
  /** Stop sharing with a specific user (by `shareId` from `listDeckShares`). */
  removeDeckShare: (deckId: number, shareId: number) =>
    api.delete(`/decks/${deckId}/share/${shareId}`),
};

/* --------------------------------- Study --------------------------------- */

/** Endpoints used by the StudyPage (sessions, answers, stats). */
export const studyApi = {
  startSession: (deckId: number, mode: string) =>
    api.post('/study/start', { deckId, mode }),
  recordAnswer: (
    sessionId: number,
    data: { cardId: number; correct: boolean; rating: number },
  ) => api.post(`/study/sessions/${sessionId}/answer`, data),
  completeSession: (sessionId: number) =>
    api.post(`/study/sessions/${sessionId}/complete`),
  getHistory: () => api.get('/study/history'),
  getStats: () => api.get('/study/stats'),
  getDueCards: () => api.get<number[]>('/study/due-cards'),
  getDueSummary: () => api.get<DueSummary>('/study/due-summary'),
  getDueReview: () => api.get<DueReviewPayload>('/study/due-review'),
};

/* ------------------------------- Students -------------------------------- */

/** Endpoints for the teacher-student feature. */
export const studentsApi = {
  /** People I added as my students (I am a teacher here). */
  getMyStudents: () => api.get<StudentLink[]>('/students/my-students'),
  /** People who added me as their student (I am a student here). */
  getMyTeachers: () => api.get<StudentLink[]>('/students/my-teachers'),
  /** Add a student by their email. The user must already exist. */
  addStudent: (email: string) => api.post<StudentLink>('/students', { email }),
  /** Learner adds a teacher so they can share messages (and appear under “My teachers”). */
  connectTeacher: (teacherId: number) =>
    api.post<StudentLink>('/students/connect-teacher', { teacherId }),
  /** Remove a student from my list. */
  removeStudent: (linkId: number) => api.delete(`/students/${linkId}`),
  /** Private notes visible only to you (teacher). */
  patchMyStudentNotes: (linkId: number, data: { privateNotes: string }) =>
    api.patch<StudentLink>(`/students/my-students/${linkId}/notes`, data),
};

/* ---------------------------------- Chat ---------------------------------- */

/** Text chat between two users who already share a teacher–student link. */
export const chatApi = {
  conversations: () => api.get<ChatConversation[]>('/chat/conversations'),
  unreadTotal: () => api.get<ChatUnreadTotal>('/chat/unread-total'),
  markRead: (peerUserId: number) => api.post(`/chat/${peerUserId}/read`),
  loadThread: (peerUserId: number) =>
    api.get<ChatThread>(`/chat/${peerUserId}/thread`),
  sendMessage: (
    peerUserId: number,
    payload: { body?: string; attachmentUrl?: string; attachmentMime?: string },
  ) => api.post<ChatMessage>(`/chat/${peerUserId}/messages`, payload),
  /** JPEG / PNG / GIF / WebP / PDF, max 8 MB on server. */
  uploadAttachment: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<{ url: string; mime: string }>('/chat/upload', fd);
  },
};

/* -------------------------------- Lessons -------------------------------- */

/** Endpoints for the "lesson page" feature. */
export const lessonsApi = {
  /** Lessons I (the teacher) created. */
  getMyTeachingLessons: () => api.get<LessonItem[]>('/lessons/my-teaching'),
  /** Lessons that a teacher prepared for me (the student). */
  getMyLearningLessons: () => api.get<LessonItem[]>('/lessons/my-learning'),
  /** A single lesson with all blocks. */
  getLesson: (id: number, config?: { params?: { classroomLinkId?: number } }) =>
    api.get<LessonItem>(`/lessons/${id}`, config),
  /** Create a new (empty) lesson. */
  createLesson: (data: {
    title: string;
    summary?: string;
    studentId?: number | null;
  }) => api.post<LessonItem>('/lessons', data),
  /** Change title / summary / target student. */
  updateLesson: (
    id: number,
    data: { title: string; summary?: string; studentId?: number | null },
  ) => api.put<LessonItem>(`/lessons/${id}`, data),
  /** Delete the whole lesson. */
  deleteLesson: (id: number) => api.delete(`/lessons/${id}`),

  /** Add a new block (paragraph, video, link, ...) to the lesson. */
  addBlock: (lessonId: number, data: BlockPayload) =>
    api.post<LessonBlockItem>(`/lessons/${lessonId}/blocks`, data),
  /** Update one block. */
  updateBlock: (lessonId: number, blockId: number, data: BlockPayload) =>
    api.put<LessonBlockItem>(`/lessons/${lessonId}/blocks/${blockId}`, data),
  /** Remove one block from a lesson. */
  deleteBlock: (lessonId: number, blockId: number) =>
    api.delete(`/lessons/${lessonId}/blocks/${blockId}`),

  addLessonSection: (
    lessonId: number,
    data: { title: string; sortOrder?: number },
  ) => api.post<LessonItem>(`/lessons/${lessonId}/sections`, data),
  updateLessonSection: (
    lessonId: number,
    sectionId: number,
    data: { title: string; sortOrder?: number },
  ) => api.put<LessonItem>(`/lessons/${lessonId}/sections/${sectionId}`, data),
  deleteLessonSection: (lessonId: number, sectionId: number) =>
    api.delete<LessonItem>(`/lessons/${lessonId}/sections/${sectionId}`),

  /** Build a private deck from TEXT / ARTICLE / NOTE blocks (teacher only). */
  deckFromBlocks: (lessonId: number) =>
    api.post<DeckItem>(`/lessons/${lessonId}/deck-from-blocks`),
};

/** Body shape for block create / update. */
export interface BlockPayload {
  type: LessonBlockType;
  title?: string;
  content?: string;
  extra?: string;
  sortOrder?: number;
  sectionId?: number;
}

/** In-app notification inbox (sidebar bell). */
export const notificationsApi = {
  list: () => api.get<AppNotificationItem[]>('/me/notifications'),
  unreadCount: () =>
    api.get<{ count: number }>('/me/notifications/unread-count'),
  markRead: (id: number) =>
    api.patch<AppNotificationItem>(`/me/notifications/${id}/read`),
  markAllRead: () => api.post('/me/notifications/read-all'),
};

/** Community Materials catalog and personal library bookmarks. */
export const materialsApi = {
  catalog: (params: {
    page?: number;
    size?: number;
    q?: string;
    sort?: 'popular' | 'new';
    cefr?: string;
  }) => api.get<Paged<DeckItem>>('/materials/catalog', { params }),
  personal: () => api.get<MaterialsPersonalViewDTO>('/materials/personal'),
  saveCatalogDeck: (deckId: number) =>
    api.post<DeckItem>(`/materials/catalog/${deckId}/save`),
  unsaveCatalogDeck: (deckId: number) =>
    api.delete(`/materials/saved/${deckId}`),
  patchListing: (
    deckId: number,
    body: {
      listedInMaterialsCatalog?: boolean;
      catalogPriceCents?: number | null;
      cefrLevel?: string | null;
    },
  ) => api.patch<DeckItem>(`/materials/my-decks/${deckId}/listing`, body),
};

/** Learner bookmarks a teacher from the profile page. */
export const favoritesApi = {
  add: (teacherId: number) => api.post(`/me/favorite-teachers/${teacherId}`),
  remove: (teacherId: number) =>
    api.delete(`/me/favorite-teachers/${teacherId}`),
};

/** Simple homework rows between linked teacher and student. */
export const assignmentsApi = {
  list: () => api.get<AssignmentsViewPayload>('/me/assignments'),
  create: (body: {
    studentUserId: number;
    title: string;
    instructions?: string;
    deckId?: number | null;
    dueDate?: string | null;
    lessonId?: number | null;
    responseMode?: 'TEXT' | 'AUDIO_LINK' | 'READ_ALOUD';
  }) => api.post<StudentAssignmentItem>('/me/assignments', body),
  markComplete: (id: number) =>
    api.patch<StudentAssignmentItem>(`/me/assignments/${id}/complete`),
  patchStudentResponse: (
    id: number,
    body: { studentResponse?: string | null },
  ) => api.patch<StudentAssignmentItem>(`/me/assignments/${id}/response`, body),
};

/** Lightweight counts for teachers (My students page strip). */
export const teacherSummaryApi = {
  get: () => api.get<TeacherSummaryPayload>('/me/teacher-summary'),
};

/* ----------------------------------- AI ----------------------------------- */

export interface AiChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiStatusPayload {
  configured: boolean;
  provider: string;
  /** Groq key configured — POST /ai/transcribe (Whisper, auto language). */
  whisperTranscription?: boolean;
  /** XAI_API_KEY — нейро-TTS xAI в POST /ai/speech (приоритет над Groq Orpheus). */
  xaiTts?: boolean;
  /** Groq + GROQ_API_KEY — Orpheus TTS тем же ключом, если нет XAI_API_KEY. */
  groqTts?: boolean;
}

/** Voice practice + backend LLM proxy (xAI Grok / Groq / Ollama / mock). */
export const aiApi = {
  status: () => api.get<AiStatusPayload>('/ai/status'),
  chat: (body: {
    messages: AiChatMessagePayload[];
    scenario?: string;
    uiLocale?: string;
    /** Язык обучения (en, ru, …) — для анонимного режима на бэкенде и как запасной источник. */
    learningLanguage?: string;
  }) => api.post<{ reply: string; provider: string }>('/ai/chat', body),
  speech: (body: {
    text: string;
    lang?: string;
    /** Secondary language for bilingual replies (e.g. Russian text with English quotes). */
    secondaryLang?: string;
    /** Explicit flag for bilingual replies (server may use language auto-detection on TTS). */
    mixed?: boolean;
  }) =>
    api.post<ArrayBuffer>('/ai/speech', body, { responseType: 'arraybuffer' }),
  transcribe: (blob: Blob) => {
    const fd = new FormData();
    const ext = blob.type.includes('webm')
      ? 'webm'
      : blob.type.includes('mp4')
        ? 'mp4'
        : 'webm';
    fd.append('file', blob, `speech.${ext}`);
    return api.post<{ text: string }>('/ai/transcribe', fd);
  },
};

export { api };
