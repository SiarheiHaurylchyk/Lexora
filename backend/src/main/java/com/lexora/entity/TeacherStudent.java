package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * Link between a teacher (User) and a student (User).
 * One row = "this teacher has this student". Shared classroom: video room (lazy-created),
 * recording consent, and homework scoped to this pair.
 */
@Entity
@Table(
    name = "teacher_students",
    uniqueConstraints = @UniqueConstraint(columnNames = {"teacher_id", "student_id"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherStudent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Visible only to the teacher — reminders about level, goals, etc. */
    @Column(columnDefinition = "TEXT")
    private String privateNotes;

    /**
     * Stable Jitsi room fragment ({@code lexora.jitsi-base-url}/{callRoomId}).
     * Created when either party starts a call from the classroom, not when a slot is booked.
     */
    @Column(length = 80)
    private String callRoomId;

    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean teacherRecordingConsent = false;

    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean studentRecordingConsent = false;

    /**
     * Lesson content shown in the shared classroom (teacher selects; both parties see the same blocks).
     */
    @Column(name = "active_lesson_id")
    private Long activeLessonId;

    /** When {@link #lessonFocusSection} is {@code BLOCK}, legacy scroll target block id. */
    @Column(name = "lesson_focus_block_id")
    private Long lessonFocusBlockId;

    /** When {@link #lessonFocusSection} is {@code LESSON_SECTION}, student opens this lesson section page. */
    @Column(name = "lesson_focus_lesson_section_id")
    private Long lessonFocusLessonSectionId;

    /** {@code LESSON_SECTION}, {@code BLOCK}, {@code VIDEO}, or {@code RECORDING}. */
    @Column(name = "lesson_focus_section", length = 24)
    private String lessonFocusSection;

    /**
     * Increments on each teacher navigation event so the student client can re-scroll.
     * Nullable in the DB so schema updates on Postgres succeed on non-empty tables (no NOT NULL without default).
     */
    @Column(name = "lesson_focus_serial")
    @Builder.Default
    private Long lessonFocusSerial = 0L;
}
