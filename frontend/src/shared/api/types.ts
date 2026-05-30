/**
 * Shared API types used by frontend pages.
 * Keep this file plain TypeScript so tools and IDE can show good auto-complete.
 */

/** Public info about a user (no password). Returned by many endpoints. */
export interface UserSummary {
  id: number;
  username: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
  createdAt?: string;
  teacherHeadline?: string | null;
  teacherBio?: string | null;
  teacherIntroVideoUrl?: string | null;
  hourlyRate?: number | null;
  teachesLanguages?: string | null;
  showInTeacherDirectory?: boolean | null;
  learningLanguage?: string | null;
  teacherCancellationPolicy?: string | null;
  teacherPaymentInfo?: string | null;
  offersTrialLesson?: boolean | null;
  cefrLevel?: string | null;
  learningGoalType?: string | null;
  learningGoalWeeks?: number | null;
  learningGoalNotes?: string | null;
}

/** A flashcard inside a deck. Image fields can be null when cleared. */
export interface CardItem {
  id: number;
  term: string;
  definition: string;
  example?: string;
  transcription?: string;
  termImageUrl?: string | null;
  definitionImageUrl?: string | null;
  sortOrder?: number;
  status?: string;
}

/**
 * A deck of flashcards.
 * `visibility` is kept loose (plain string) so older code that uses raw "PRIVATE"
 * literals still compiles. Real values are: PRIVATE | PUBLIC | UNLISTED.
 */
export interface DeckItem {
  id: number;
  title: string;
  description?: string;
  coverColor?: string;
  emoji?: string;
  sourceLanguage: string;
  targetLanguage: string;
  visibility: string;
  owner?: UserSummary;
  cards?: CardItem[];
  cardCount: number;
  studyCount?: number;
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  /** Materials catalog: listed for community library. */
  listedInMaterialsCatalog?: boolean;
  /** Whole cents; null or 0 = free in catalog. */
  catalogPriceCents?: number | null;
  cefrLevel?: string | null;
  /** Set when this row is a saved catalog bookmark (personal library). */
  librarySaveId?: number | null;
}

/** GET /api/materials/personal */
export interface MaterialsPersonalViewDTO {
  owned: DeckItem[];
  savedFromCatalog: DeckItem[];
}

/** One row in /study/history — past study session summary. */
export interface StudySession {
  id: number;
  deckId: number;
  deckTitle: string;
  mode: string;
  accuracy: number;
  totalCards: number;
  correctAnswers: number;
  incorrectAnswers: number;
  startedAt?: string;
  completedAt?: string;
}

/** GET /api/study/due-summary */
export interface DueSummary {
  totalDue: number;
  decks: DueDeckBucket[];
}

export interface DueDeckBucket {
  deckId: number;
  deckTitle: string;
  emoji?: string;
  dueCount: number;
}

/** GET /api/study/due-review */
export interface DueReviewPayload {
  totalDue: number;
  cards: DueReviewCard[];
}

export interface DueReviewCard {
  cardId: number;
  deckId: number;
  deckTitle: string;
  sourceLanguage: string;
  targetLanguage: string;
  term: string;
  definition: string;
  example?: string;
  transcription?: string;
  termImageUrl?: string | null;
  definitionImageUrl?: string | null;
}

/** Card SRS status from the server. */
export type CardSrsStatus =
  | 'NOT_STARTED'
  | 'LEARNING'
  | 'FAMILIAR'
  | 'KNOWN'
  | 'MASTERED';

/** GET /api/decks/{id}/srs */
export interface DeckSrsPayload {
  dueCount: number;
  newCount: number;
  masteredCount: number;
  cards: CardSrsItem[];
}

export interface CardSrsItem {
  cardId: number;
  status: CardSrsStatus;
  nextReview: string | null;
  due: boolean;
}

/** One row in "my students" or "my teachers" list. */
export interface StudentLink {
  linkId: number;
  user: UserSummary;
  createdAt?: string;
  /** Only on GET /students/my-students */
  privateNotes?: string | null;
}

/** One stored chat line (teacher ↔ student thread). */
export interface ChatMessage {
  id: number;
  senderId: number;
  body: string;
  attachmentUrl?: string | null;
  attachmentMime?: string | null;
  /** ISO date-time from the server. */
  createdAt: string;
}

/** GET /api/chat/:peerId/thread — who you are talking to + history. */
export interface ChatThread {
  peer: UserSummary;
  messages: ChatMessage[];
}

/** GET /api/chat/conversations — inbox row. */
export interface ChatConversation {
  peer: UserSummary;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

/** GET /api/chat/unread-total */
export interface ChatUnreadTotal {
  totalUnread: number;
}

/** One row in "who can see this deck" list. */
export interface DeckShare {
  shareId: number;
  user: UserSummary;
  createdAt?: string;
}

/** Block types supported in a lesson. */
export type LessonBlockType =
  | 'TEXT' // a paragraph of free text
  | 'ARTICLE' // article excerpt (content + optional source URL in `extra`)
  | 'YOUTUBE' // YouTube video URL, played as an embedded iframe
  | 'LINK' // external link
  | 'IMAGE' // image URL
  | 'NOTE' // short highlighted note for the student
  | 'MULTIPLE_CHOICE' // JSON in `content`: question, options[], correctIndex
  | 'TRUE_FALSE' // JSON: statement, correct boolean
  | 'MATCH_PAIRS' // JSON: pairs[{left,right}]
  | 'FILL_BLANK' // JSON: text with ___ blanks, answers[]
  | 'WORD_ORDER' // JSON: words[] in correct order
  | 'OPEN_PROMPT'; // JSON: prompt, optional sampleAnswer (self-check)

/** One block of a lesson page. */
export interface LessonBlockItem {
  id: number;
  type: LessonBlockType;
  title?: string;
  content?: string;
  extra?: string;
  sortOrder?: number;
  sectionId?: number | null;
}

/** Sidebar “page” within a lesson; contains ordered blocks. */
export interface LessonSectionItem {
  id: number;
  title: string;
  sortOrder?: number;
  blocks: LessonBlockItem[];
}

/** A lesson is a page that a teacher prepares for a student. */
export interface LessonItem {
  id: number;
  title: string;
  summary?: string;
  teacher?: UserSummary;
  student?: UserSummary | null;
  sections?: LessonSectionItem[];
  createdAt?: string;
  updatedAt?: string;
}

/** Spring Data page wrapper returned by GET /teachers/directory */
export interface Paged<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** Row in the teacher discovery grid. */
export interface TeacherDirectoryEntry {
  id: number;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  headline?: string | null;
  bioPreview?: string | null;
  introVideoUrl?: string | null;
  hourlyRate?: number | null;
  languages: string[];
  publicDeckCount: number;
  studentCount: number;
  lessonCount: number;
  offersTrialLesson?: boolean;
}

export interface TeacherPublicDeck {
  id: number;
  title: string;
  emoji?: string | null;
  coverColor?: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  cardCount: number;
}

export interface TeacherCertificate {
  id: number;
  title: string;
  issuer?: string | null;
  year?: string | null;
  description?: string | null;
  documentUrl?: string | null;
}

export interface TeacherReview {
  id: number;
  authorDisplayName: string;
  authorAvatarUrl?: string | null;
  rating: number;
  comment?: string | null;
  createdAt: string;
  mine?: boolean;
}

export interface TeacherDetail extends TeacherDirectoryEntry {
  bio?: string | null;
  resume?: string | null;
  certificates: TeacherCertificate[];
  conductedSessionsCount: number;
  averageRating?: number | null;
  reviewCount: number;
  recentReviews: TeacherReview[];
  viewerReview?: TeacherReview | null;
  sampleDecks: TeacherPublicDeck[];
  cancellationPolicy?: string | null;
  paymentInfo?: string | null;
  /** Learner bookmarked this teacher (only when logged in). */
  favoritedByMe?: boolean | null;
}

/** HTTP 409 SLOT_OVERLAP — another calendar window blocks reschedule. */
export interface ConflictingSlotItem {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  bookedByName?: string | null;
}

/** BOOKED slot returned from availability / booking APIs. */
export interface TeacherSlotItem {
  id: number;
  teacherId: number;
  teacher?: UserSummary | null;
  startTime: string;
  endTime: string;
  status: string;
  bookedBy?: UserSummary | null;
  meetingUrl?: string | null;
  /** BOOKED: teacher ↔ student shared classroom id. */
  classroomLinkId?: number | null;
  /** Teacher calendar — personal / blocked slot title. */
  title?: string | null;
  description?: string | null;
}

/** GET /api/me/lesson-reminder */
export interface LessonReminderPayload {
  active: boolean;
  slotId?: number;
  startTime?: string;
  endTime?: string;
  counterpartName?: string;
  asTeacher?: boolean;
  meetingUrl?: string | null;
  classroomLinkId?: number | null;
}

/** GET /api/me/next-booking */
export interface NextBookingPayload {
  hasBooking: boolean;
  slotId?: number;
  teacherId?: number;
  startTime?: string;
  endTime?: string;
  counterpartName?: string;
  meetingUrl?: string | null;
  classroomLinkId?: number | null;
  asTeacher?: boolean;
}

/** One row in GET /api/me/notifications */
export interface AppNotificationItem {
  id: number;
  title: string;
  body: string;
  href?: string | null;
  read: boolean;
  createdAt: string;
  /** BOOKING | ASSIGNMENT | SYSTEM */
  category?: string | null;
  /** Server-driven i18n key under notifications.events.{kind} */
  kind?: string | null;
  context?: Record<string, unknown> | null;
}

export interface StudentAssignmentItem {
  id: number;
  teacherId: number;
  teacherName: string;
  studentId: number;
  studentName: string;
  title: string;
  instructions?: string | null;
  deckId?: number | null;
  lessonId?: number | null;
  /** ISO date string (yyyy-MM-dd) from server. */
  dueDate?: string | null;
  completedByStudent: boolean;
  createdAt: string;
  /** TEXT | AUDIO_LINK | READ_ALOUD */
  responseMode?: string;
  studentResponse?: string | null;
  teacherStudentLinkId?: number | null;
}

/** GET /api/me/classrooms/{linkId} */
export interface ClassroomWorkspacePayload {
  linkId: number;
  asTeacher: boolean;
  peer: UserSummary;
  callRoomPrepared: boolean;
  builtInCallUrl?: string | null;
  teacherRecordingConsent?: boolean | null;
  studentRecordingConsent?: boolean | null;
  recordingAllowed?: boolean | null;
  assignments: StudentAssignmentItem[];
  /** Pinned lesson for this class session (same for teacher and student). */
  activeLessonId?: number | null;
  lessonFocusBlockId?: number | null;
  lessonFocusLessonSectionId?: number | null;
  lessonFocusSection?: string | null;
  lessonFocusSerial?: number | null;
}

/** GET /api/me/classrooms/{linkId}/eligible-lessons */
export interface ClassroomLessonOption {
  id: number;
  title: string;
  /** Teacher list only: lesson has no assigned student (draft). */
  draft?: boolean | null;
}

/** GET /api/me/classrooms/{linkId}/lesson-focus */
export interface ClassroomLessonFocusSnapshot {
  activeLessonId?: number | null;
  lessonFocusBlockId?: number | null;
  lessonFocusLessonSectionId?: number | null;
  lessonFocusSection?: string | null;
  lessonFocusSerial?: number | null;
}

export interface PrepareCallPayload {
  builtInCallUrl?: string | null;
}

/** GET /api/me/classrooms/{linkId}/timer */
export interface ClassroomTimerPayload {
  phase: 'IDLE' | 'RUNNING' | 'STOPPED';
  startedAtMs?: number | null;
  stoppedAtMs?: number | null;
  elapsedMs?: number | null;
  serverNowMs?: number | null;
}

export interface AssignmentsViewPayload {
  received: StudentAssignmentItem[];
  sent: StudentAssignmentItem[];
}

/** GET /api/me/teacher-summary */
export interface TeacherSummaryPayload {
  linkedStudents: number;
  upcomingBookings: number;
  openAssignments: number;
  averageRating: number | null;
  reviewCount: number;
}
