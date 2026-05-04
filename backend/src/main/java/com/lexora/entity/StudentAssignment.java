package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Teacher asks a linked student to review a deck or complete homework by a date.
 * Keeping {@link #deckId} as a plain Long avoids tight coupling if the deck is deleted later.
 */
@Entity
@Table(name = "student_assignments", indexes = {
        @Index(name = "idx_assign_student", columnList = "student_id"),
        @Index(name = "idx_assign_teacher", columnList = "teacher_id")
        /* No @Index on teacher_student_link_id here: with ddl-auto=update, Hibernate may emit
           CREATE INDEX before ADD COLUMN on existing tables and Postgres fails (column not found). */
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAssignment {

    /** How the student should respond (plain text, audio link, or read-aloud homework). */
    public enum ResponseMode {
        TEXT,
        AUDIO_LINK,
        READ_ALOUD
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    /** {@link com.lexora.entity.TeacherStudent#getId()} — homework shown in that shared classroom. */
    @Column(name = "teacher_student_link_id")
    private Long teacherStudentLinkId;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ResponseMode responseMode = ResponseMode.TEXT;

    /** Learner submission (text answer, link to voice message, or read-aloud notes). */
    @Column(columnDefinition = "TEXT")
    private String studentResponse;

    private Long deckId;

    /** Optional link to the lesson this homework continues (same teacher / student). */
    private Long lessonId;

    private LocalDate dueDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean completedByStudent = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
