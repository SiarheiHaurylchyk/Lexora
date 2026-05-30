package com.lexora.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.Valid;
import javax.validation.constraints.Email;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class Dto {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RegisterRequest {
        @NotBlank @Size(min=3, max=30) public String username;
        @NotBlank @Email public String email;
        @NotBlank @Size(min=6, max=100) public String password;
        public String displayName;
        /** LEARNER (default) or TEACHER — optional aliases STUDENT / STUDENT_ACCOUNT accepted server-side. */
        public String accountType;
        /** Required for learner accounts — ISO 639-1 code (e.g. en, ru). Optional for teachers. */
        public String learningLanguage;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank public String usernameOrEmail;
        @NotBlank public String password;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AuthResponse {
        public String accessToken;
        public String refreshToken;
        public String tokenType;
        public UserDTO user;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserDTO {
        public Long id;
        public String username;
        public String email;
        public String displayName;
        public String avatarUrl;
        public String role;
        public LocalDateTime createdAt;
        public StatsDTO stats;
        /** Filled for teacher accounts — editable on Profile. */
        public String teacherHeadline;
        public String teacherBio;
        public String teacherIntroVideoUrl;
        public BigDecimal hourlyRate;
        public String teachesLanguages;
        public Boolean showInTeacherDirectory;
        /** ISO 639-1 language code the user is learning. */
        public String learningLanguage;
        /** Teacher-only — resume tab content. */
        public String teacherResume;
        /** Teacher-only — editable certificate rows (same shape as public profile). */
        public List<TeacherCertificateDTO> teacherCertificates;
        public String teacherCancellationPolicy;
        public String teacherPaymentInfo;
        public Boolean offersTrialLesson;
        /** Learner trajectory — CEFR band (e.g. B1). */
        public String cefrLevel;
        /** EXAM | TRAVEL | WORK | GENERAL or a short custom label. */
        public String learningGoalType;
        public Integer learningGoalWeeks;
        public String learningGoalNotes;
    }

    /** PATCH /api/auth/profile — only sent fields are updated. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProfilePatchRequest {
        public String displayName;
        public String avatarUrl;
        public String teacherHeadline;
        public String teacherBio;
        public String teacherIntroVideoUrl;
        public BigDecimal hourlyRate;
        public String teachesLanguages;
        public Boolean showInTeacherDirectory;
        public String learningLanguage;
        /** When set (teacher accounts), replaces resume text. */
        public String teacherResume;
        /**
         * When non-null (teacher accounts), replaces all certificate rows with this list.
         * Omit from JSON to leave certificates unchanged.
         */
        public List<TeacherCertificateInputDTO> teacherCertificates;
        public String teacherCancellationPolicy;
        public String teacherPaymentInfo;
        public Boolean offersTrialLesson;
        public String cefrLevel;
        public String learningGoalType;
        public Integer learningGoalWeeks;
        public String learningGoalNotes;
    }

    /** Card row in GET /api/teachers/directory */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherDirectoryEntryDTO {
        public Long id;
        public String displayName;
        public String username;
        public String avatarUrl;
        public String headline;
        public String bioPreview;
        public String introVideoUrl;
        public BigDecimal hourlyRate;
        public List<String> languages;
        public long publicDeckCount;
        public long studentCount;
        public long lessonCount;
        public boolean offersTrialLesson;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherCertificateDTO {
        public Long id;
        public String title;
        public String issuer;
        public String year;
        public String description;
        public String documentUrl;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherCertificateInputDTO {
        /** Required per row; blank rows are skipped server-side. */
        public String title;
        public String issuer;
        public String year;
        public String description;
        public String documentUrl;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherReviewDTO {
        public Long id;
        public String authorDisplayName;
        public String authorAvatarUrl;
        public int rating;
        public String comment;
        public LocalDateTime createdAt;
        /** True when this row is the signed-in viewer’s own review. */
        public Boolean mine;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherReviewRequest {
        @NotNull @Min(1) @Max(5) public Integer rating;
        @Size(max = 4000) public String comment;
    }

    /** Small deck preview on teacher public profile. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherPublicDeckDTO {
        public Long id;
        public String title;
        public String emoji;
        public String coverColor;
        public String sourceLanguage;
        public String targetLanguage;
        public int cardCount;
    }

    /** One day in the activity heatmap. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class HeatmapDayDTO {
        public String date;
        public int count;
    }

    /** Achievement badge — same shape regardless of whether it's earned. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BadgeDTO {
        public String key;
        public boolean earned;
        public int progress;
        public int target;
    }

    /** GET /api/study/progress */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProgressDTO {
        public int currentStreak;
        public int longestStreak;
        public long totalSessions;
        public long totalCorrectAnswers;
        public long studiedDays;
        public String lastActivityDate;
        public List<HeatmapDayDTO> heatmap;
        public List<BadgeDTO> badges;
    }

    /** GET /api/study/due-summary — due counts grouped by deck. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DueSummaryResponse {
        public int totalDue;
        public List<DueDeckBucket> decks;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DueDeckBucket {
        public Long deckId;
        public String deckTitle;
        public String emoji;
        public int dueCount;
    }

    /** GET /api/study/due-review — full card rows ready for a review session. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DueReviewResponse {
        public int totalDue;
        public List<DueReviewCardDTO> cards;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DueReviewCardDTO {
        public Long cardId;
        public Long deckId;
        public String deckTitle;
        public String sourceLanguage;
        public String targetLanguage;
        public String term;
        public String definition;
        public String example;
        public String transcription;
        public String termImageUrl;
        public String definitionImageUrl;
    }

    /** GET /api/decks/{id}/srs — per-card SRS state for one deck. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DeckSrsResponse {
        public int dueCount;
        public int newCount;
        public int masteredCount;
        public List<CardSrsItem> cards;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CardSrsItem {
        public Long cardId;
        /** NOT_STARTED when the user has never studied this card. */
        public String status;
        public String nextReview;
        public boolean due;
    }

    /** Teacher availability slot used by both teacher (own calendar) and students (book). */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherSlotDTO {
        public Long id;
        public Long teacherId;
        /** Present on learner-facing booking lists — who teaches this slot. */
        public UserDTO teacher;
        public LocalDateTime startTime;
        public LocalDateTime endTime;
        public String status;
        public UserDTO bookedBy;
        /** Public teacher calendar: true when the signed-in learner booked this slot. */
        public Boolean bookedByMe;
        /** Zoom/Meet link; learner sees it only for slots they booked. */
        public String meetingUrl;
        /** Teacher-only; personal / blocked slot label. */
        public String title;
        /** Teacher-only; longer notes for blocked time. */
        public String description;
        /** BOOKED: shared classroom (video + homework) for this teacher ↔ student pair. */
        public Long classroomLinkId;
    }

    /** PATCH /api/me/availability/{id}/meeting-url — teacher sets video link on a BOOKED slot. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MeetingUrlRequest {
        /** Pass empty string to clear. */
        public String meetingUrl;
    }

    /** PATCH /api/me/classrooms/{linkId}/recording-consent — teacher or student toggles own consent. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RecordingConsentPatchRequest {
        /** When true, records consent; when false, withdraws. Null leaves unchanged. */
        public Boolean consent;
    }

    /** PATCH /api/me/classrooms/{linkId}/active-lesson — teacher pins a lesson for this class. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClassroomActiveLessonPatchRequest {
        /** Null clears the pinned lesson. */
        public Long lessonId;
    }

    /** PATCH /api/me/classrooms/{linkId}/lesson-focus — teacher moves everyone's view to a section. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClassroomLessonFocusPatchRequest {
        /** LESSON_SECTION (lessonSectionId), BLOCK (blockId, legacy), VIDEO, or RECORDING. */
        @NotBlank public String section;
        /** Required when section is BLOCK (legacy). */
        public Long blockId;
        /** Required when section is LESSON_SECTION. */
        public Long lessonSectionId;
    }

    /** GET /api/me/next-booking — soonest upcoming lesson for dashboard. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class NextBookingDTO {
        public boolean hasBooking;
        public Long slotId;
        public Long teacherId;
        public LocalDateTime startTime;
        public LocalDateTime endTime;
        public String counterpartName;
        public String meetingUrl;
        public Long classroomLinkId;
        public boolean asTeacher;
    }

    /** GET /api/me/lesson-reminder — next booked lesson starting soon (in-app hint). */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LessonReminderDTO {
        public boolean active;
        public Long slotId;
        public LocalDateTime startTime;
        public LocalDateTime endTime;
        /** Display name of the other party (teacher sees student; student sees teacher). */
        public String counterpartName;
        /** True when the current user owns the slot as teacher. */
        public boolean asTeacher;
        public String meetingUrl;
        public Long classroomLinkId;
    }

    /** GET /api/me/classrooms/{linkId} — shared workspace for one teacher↔student link. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClassroomWorkspaceDTO {
        public Long linkId;
        public boolean asTeacher;
        public UserDTO peer;
        /** Room id exists (call may be joined). */
        public boolean callRoomPrepared;
        public String builtInCallUrl;
        public Boolean teacherRecordingConsent;
        public Boolean studentRecordingConsent;
        public Boolean recordingAllowed;
        public List<StudentAssignmentDTO> assignments;
        /** Lesson pinned for live classroom; both teacher and student fetch this id. */
        public Long activeLessonId;
        /** Legacy: block-level focus. Prefer {@link #lessonFocusLessonSectionId}. */
        public Long lessonFocusBlockId;
        /** Teacher-selected lesson section (sidebar page) for the shared classroom. */
        public Long lessonFocusLessonSectionId;
        public String lessonFocusSection;
        /** Increments when the teacher changes focus; student polls and compares. */
        public Long lessonFocusSerial;
    }

    /** GET /api/me/classrooms/{linkId}/lesson-focus — lightweight poll for live lesson navigation (student). */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClassroomLessonFocusSnapshotDTO {
        public Long activeLessonId;
        public Long lessonFocusBlockId;
        public Long lessonFocusLessonSectionId;
        public String lessonFocusSection;
        public Long lessonFocusSerial;
    }

    /** Row in GET /api/me/classrooms/{linkId}/eligible-lessons — lessons switchable in this class. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClassroomLessonOptionDTO {
        public Long id;
        public String title;
        /** Teacher-only: lesson has no assigned student (draft / private until shared). */
        public Boolean draft;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PrepareCallResponse {
        public String builtInCallUrl;
    }

    /** GET /api/me/classrooms/{linkId}/timer — shared stopwatch state. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClassroomTimerDTO {
        /** IDLE, RUNNING, or STOPPED */
        public String phase;
        /** Wall-clock ms when the current run started (null if IDLE). */
        public Long startedAtMs;
        /** Wall-clock ms when stopped (null unless STOPPED). */
        public Long stoppedAtMs;
        /** Final duration when STOPPED (null unless STOPPED). */
        public Long elapsedMs;
        /** Server time at snapshot (for client sync while RUNNING). */
        public Long serverNowMs;
    }

    /** Body of POST /api/me/availability and PUT /api/me/availability/{id}. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherSlotRequest {
        @NotBlank public String startTime;
        @NotBlank public String endTime;
        /** OPEN or BLOCKED. BOOKED is set by the booking endpoint. */
        public String status;
        /** Stored only when status is BLOCKED (personal event). */
        @Size(max = 40) public String title;
        @Size(max = 500) public String description;
    }

    /** PATCH /api/me/availability/{id} — status, time window, or blocked-slot text. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherSlotPatchRequest {
        /** OPEN or BLOCKED — not allowed while the slot is BOOKED. */
        public String status;
        /** With endTime, moves/reschedules the slot (OPEN, BLOCKED, or BOOKED). */
        public String startTime;
        public String endTime;
        /** Only for BLOCKED slots; null leaves unchanged, blank clears. */
        @Size(max = 40) public String title;
        @Size(max = 500) public String description;
        /**
         * When true and the new window overlaps other slots, those slots are shifted by the same
         * start delta as this slot (chain). Otherwise HTTP 409 with {@link AvailabilityConflictResponse}.
         */
        public Boolean shiftOverlappingSlots;
    }

    /** Returned on 409 when the teacher must confirm shifting other slots. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AvailabilityConflictResponse {
        public String message;
        public boolean success;
        public String code;
        public List<ConflictingSlotDTO> conflictingSlots;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ConflictingSlotDTO {
        public Long id;
        public LocalDateTime startTime;
        public LocalDateTime endTime;
        public String status;
        /** Empty when slot is not BOOKED. */
        public String bookedByName;
    }

    /** GET /api/teachers/{id} */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherDetailDTO {
        public Long id;
        public String displayName;
        public String username;
        public String avatarUrl;
        public String headline;
        public String bio;
        /** Resume / experience (second profile tab). */
        public String resume;
        public List<TeacherCertificateDTO> certificates;
        public String introVideoUrl;
        public BigDecimal hourlyRate;
        public List<String> languages;
        public long publicDeckCount;
        public long studentCount;
        public long lessonCount;
        /** Past BOOKED slots whose end time has passed (still marked booked). */
        public long conductedSessionsCount;
        /** Average star rating, or null when there are no reviews. */
        public Double averageRating;
        public long reviewCount;
        public List<TeacherReviewDTO> recentReviews;
        /** Current user’s review when logged in and viewing someone else’s profile. */
        public TeacherReviewDTO viewerReview;
        public List<TeacherPublicDeckDTO> sampleDecks;
        public String cancellationPolicy;
        public String paymentInfo;
        public boolean offersTrialLesson;
        /** Learner saved this teacher to favourites. */
        public Boolean favoritedByMe;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StatsDTO {
        public long totalDecks;
        public long totalCards;
        public long masteredCards;
        public long studyStreak;
        public long totalCorrectAnswers;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DeckRequest {
        @NotBlank public String title;
        public String description;
        public String coverColor;
        public String emoji;
        @NotBlank public String sourceLanguage;
        @NotBlank public String targetLanguage;
        public String visibility;
        public List<String> tags;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DeckResponse {
        public Long id;
        public String title;
        public String description;
        public String coverColor;
        public String emoji;
        public String sourceLanguage;
        public String targetLanguage;
        public String visibility;
        public UserDTO owner;
        public List<CardResponse> cards;
        public int cardCount;
        public List<String> tags;
        public LocalDateTime createdAt;
        public LocalDateTime updatedAt;
        public Integer viewCount;
        public Integer studyCount;
        /** Materials catalog: teacher-listed public deck. */
        public Boolean listedInMaterialsCatalog;
        /** Whole cents; null/0 = free. */
        public Integer catalogPriceCents;
        /** e.g. B1, B2/B2+ */
        public String cefrLevel;
        /** Populated on personal “saved” rows — bookmark id for DELETE. */
        public Long librarySaveId;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DeckCatalogListingPatchRequest {
        public Boolean listedInMaterialsCatalog;
        public Integer catalogPriceCents;
        @Size(max = 32) public String cefrLevel;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MaterialsPersonalViewDTO {
        public List<DeckResponse> owned;
        /** Decks bookmarked from the community catalog. */
        public List<DeckResponse> savedFromCatalog;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ShareDeckWithLinkRequest {
        @NotNull public Long linkId;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CardRequest {
        @NotBlank public String term;
        @NotBlank public String definition;
        public String example;
        public String transcription;
        public String termImageUrl;
        public String definitionImageUrl;
        public Integer sortOrder;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CardResponse {
        public Long id;
        public String term;
        public String definition;
        public String example;
        public String transcription;
        public String termImageUrl;
        public String definitionImageUrl;
        public Integer sortOrder;
        public String status;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StudySessionRequest {
        public Long deckId;
        public String mode;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StudySessionResponse {
        public Long id;
        public Long deckId;
        public String deckTitle;
        public String mode;
        public LocalDateTime startedAt;
        public LocalDateTime completedAt;
        public Integer totalCards;
        public Integer correctAnswers;
        public Integer incorrectAnswers;
        public double accuracy;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CardAnswerRequest {
        public Long cardId;
        public boolean correct;
        public Long timeSpentMs;
        public int rating;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RefreshTokenRequest {
        public String refreshToken;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MessageResponse {
        public String message;
        public boolean success;
    }

    /* ===== Students ===== */

    /** Body of "add my student by email" request. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AddStudentRequest {
        @NotBlank @Email public String email;
    }

    /** One row in "my students" or "my teachers" list. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StudentLinkResponse {
        public Long linkId;
        public UserDTO user;
        public LocalDateTime createdAt;
        /** Only set in GET /api/students/my-students — teacher’s private notes. */
        public String privateNotes;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StudentNotesPatchRequest {
        @Size(max = 8000) public String privateNotes;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AppNotificationDTO {
        public Long id;
        public String title;
        public String body;
        public String href;
        public boolean read;
        public LocalDateTime createdAt;
        /** BOOKING | ASSIGNMENT | SYSTEM */
        public String category;
        /** Machine id for localized title/body on the client. */
        public String kind;
        /** Parsed {@code contextJson}; null if absent or invalid. */
        public java.util.Map<String, Object> context;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StudentAssignmentDTO {
        public Long id;
        public Long teacherId;
        public String teacherName;
        public Long studentId;
        public String studentName;
        public String title;
        public String instructions;
        public Long deckId;
        /** Present when homework was created from a lesson page. */
        public Long lessonId;
        public LocalDate dueDate;
        public boolean completedByStudent;
        public LocalDateTime createdAt;
        /** TEXT | AUDIO_LINK | READ_ALOUD */
        public String responseMode;
        public String studentResponse;
        public Long teacherStudentLinkId;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AssignmentsViewDTO {
        /** Rows where I am the student. */
        public List<StudentAssignmentDTO> received;
        /** Rows I created as a teacher (empty for pure learners). */
        public List<StudentAssignmentDTO> sent;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CreateAssignmentRequest {
        @NotNull public Long studentUserId;
        @NotBlank @Size(max = 300) public String title;
        @Size(max = 8000) public String instructions;
        public Long deckId;
        public LocalDate dueDate;
        /** Must be your lesson with {@code studentUserId} as its target student. */
        public Long lessonId;
        /** TEXT (default), AUDIO_LINK, READ_ALOUD */
        public String responseMode;
    }

    /** PATCH /api/me/assignments/{id}/response — learner submits homework text or audio link. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StudentAssignmentResponsePatchRequest {
        @Size(max = 8000) public String studentResponse;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TeacherSummaryDTO {
        public long linkedStudents;
        public long upcomingBookings;
        public long openAssignments;
        public Double averageRating;
        public long reviewCount;
    }

    /** Body of POST /api/students/connect-teacher — learner adds a teacher to “My teachers”. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ConnectTeacherRequest {
        @NotNull public Long teacherId;
    }

    /* ===== Chat (teacher ↔ student, requires TeacherStudent link) ===== */

    /** POST /api/chat/{peer}/messages — text and/or attachment from POST /api/chat/upload */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChatSendRequest {
        @Size(max = 4000) public String body;
        @Size(max = 2000) public String attachmentUrl;
        @Size(max = 120) public String attachmentMime;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChatMessageDTO {
        public Long id;
        public Long senderId;
        public String body;
        public String attachmentUrl;
        public String attachmentMime;
        public LocalDateTime createdAt;
    }

    /** GET /api/chat/{peerUserId}/thread */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChatThreadDTO {
        public UserDTO peer;
        public List<ChatMessageDTO> messages;
    }

    /** GET /api/chat/conversations — inbox rows */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChatConversationDTO {
        public UserDTO peer;
        public String lastMessagePreview;
        public LocalDateTime lastMessageAt;
        public long unreadCount;
    }

    /** GET /api/chat/unread-total — badge in navigation */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ChatUnreadTotalDTO {
        public long totalUnread;
    }

    /* ===== Deck sharing ===== */

    /** Body of "share my deck with this email" request. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ShareDeckRequest {
        @NotBlank @Email public String email;
    }

    /** One row in "who can see this deck" list. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DeckShareResponse {
        public Long shareId;
        public UserDTO user;
        public LocalDateTime createdAt;
    }

    /* ===== Lessons ===== */

    /** Body of "create or update lesson" request (without blocks). */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LessonRequest {
        @NotBlank public String title;
        public String summary;
        /** Optional: id of the student this lesson is for; null means draft. */
        public Long studentId;
    }

    /** Body of "save block" request (one block at a time). */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LessonBlockRequest {
        @NotBlank public String type;
        public String title;
        public String content;
        public String extra;
        public Integer sortOrder;
        /** Required when creating a block; optional when updating (move to another section). */
        public Long sectionId;
    }

    /** Body for POST/PATCH lesson section. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LessonSectionRequest {
        @NotBlank public String title;
        public Integer sortOrder;
    }

    /** Lesson sent to the frontend: ordered sections, each with blocks. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LessonResponse {
        public Long id;
        public String title;
        public String summary;
        public UserDTO teacher;
        public UserDTO student;
        public List<LessonSectionResponse> sections;
        public LocalDateTime createdAt;
        public LocalDateTime updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LessonSectionResponse {
        public Long id;
        public String title;
        public Integer sortOrder;
        public List<LessonBlockResponse> blocks;
    }

    /** One block sent to the frontend. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LessonBlockResponse {
        public Long id;
        public String type;
        public String title;
        public String content;
        public String extra;
        public Integer sortOrder;
        public Long sectionId;
    }

    /* ===== AI tutor chat (authenticated; backend calls Groq / Ollama / mock) ===== */

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiChatMessage {
        @NotBlank @Size(max = 16) public String role;
        @NotBlank @Size(max = 8000) public String content;
    }

    /** POST /api/ai/chat */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiChatRequest {
        @Valid @NotNull @Size(min = 1, max = 40) public List<AiChatMessage> messages;
        /** FREE, AIRPORT, CAFE, HOTEL, SHOP — drives role-play instructions. */
        @Size(max = 32) public String scenario;
        /** ru | en — language for short hints/corrections alongside the target language. */
        @Size(max = 12) public String uiLocale;
        /**
         * ISO 639-1 язык, который учит пользователь (en, ru, …).
         * При LEXORA_AI_REQUIRE_LOGIN=false используется, если запрос без JWT.
         * При входе в аккаунт профиль пользователя имеет приоритет.
         */
        @Size(max = 12) public String learningLanguage;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiChatResponse {
        public String reply;
        /** xai | groq | deepseek | ollama | mock — which backend path produced the reply. */
        public String provider;
    }

    /** GET /api/ai/status — whether a real model is configured. */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiStatusResponse {
        public boolean configured;
        public String provider;
        /** Groq key present — client may use POST /api/ai/transcribe (Whisper, auto language). */
        public boolean whisperTranscription;
        /** XAI_API_KEY present — нейро-TTS xAI (POST /v1/tts), приоритет над Groq Orpheus. */
        public boolean xaiTts;
        /** LEXORA_AI_PROVIDER=groq и GROQ_API_KEY — Orpheus TTS тем же ключом, если нет XAI_API_KEY. */
        public boolean groqTts;
    }

    /** POST /api/ai/speech — xAI TTS при ключе, иначе Groq Orpheus (WAV). */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiSpeechRequest {
        @NotBlank @Size(max = 8000) public String text;
        /** Optional ISO 639-1 hint (en, ru, …) for pronunciation. */
        @Size(max = 12) public String lang;
        /**
         * Secondary language hint for bilingual replies — e.g. Russian text
         * that quotes English phrases. The server passes hints into language
         * reconciliation; mixed replies may use {@code language=auto} on xAI TTS.
         */
        @Size(max = 12) public String secondaryLang;
        /** Explicit flag set by the client when it has detected a code-switched reply. */
        public Boolean mixed;
    }

    /** POST /api/ai/transcribe */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TranscriptionResponse {
        public String text;
    }
}
