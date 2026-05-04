package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(unique = true)
    private String username;

    @Email
    @NotBlank
    @Column(unique = true)
    private String email;

    @NotBlank
    private String password;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String avatarUrl;
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Role role = Role.USER;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime lastLoginAt;

    /** Public teacher directory — headline shown on cards (e.g. "Professional teacher"). */
    private String teacherHeadline;
    /** Longer bio on teacher profile page. */
    @Column(columnDefinition = "TEXT")
    private String teacherBio;
    /** Resume / experience tab on public teacher profile (achievements, work history). */
    @Column(columnDefinition = "TEXT")
    private String teacherResume;
    /** Intro video URL (YouTube or direct link). */
    private String teacherIntroVideoUrl;
    /** Optional hourly rate in platform default currency (display only). */
    @Column(precision = 10, scale = 2)
    private BigDecimal hourlyRate;
    /** Comma-separated ISO language codes the teacher focuses on, e.g. "en,ru,de". */
    private String teachesLanguages;
    /** ISO 639-1 code for the language the user is learning (learners; optional for teachers). */
    private String learningLanguage;
    /** When false, teacher is hidden from /teachers directory. */
    @Builder.Default
    private Boolean showInTeacherDirectory = true;

    /** Shown on profile / bookings — cancellation rules in teacher’s own words (platform still enforces 24h for learners). */
    @Column(columnDefinition = "TEXT")
    private String teacherCancellationPolicy;
    /** How to pay (bank, PayPal link, etc.). Lexora does not process card payments yet. */
    @Column(columnDefinition = "TEXT")
    private String teacherPaymentInfo;
    /** Directory badge + filter: teacher offers a short trial lesson. */
    @Builder.Default
    private Boolean offersTrialLesson = false;

    /** Learner self-assessed or target CEFR level (e.g. A2, B1). */
    @Column(length = 8)
    private String cefrLevel;

    /** High-level motivation: EXAM, TRAVEL, WORK, GENERAL, or short custom tag. */
    @Column(length = 32)
    private String learningGoalType;

    /** Planned study horizon in weeks (optional). */
    private Integer learningGoalWeeks;

    /** Free-form goal notes (exam name, trip date, etc.). */
    @Column(columnDefinition = "TEXT")
    private String learningGoalNotes;

    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Deck> decks;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<StudySession> studySessions;

    public enum Role {
        /** Personal learner account (student); creates decks for own study. */
        USER,
        /** Classroom account: students list, share decks, prepare lessons. */
        TEACHER,
        ADMIN,
        PREMIUM
    }

    /** Teacher-facing features (lessons prep, class roster, deck sharing). */
    public boolean canTeach() {
        return role == Role.TEACHER || role == Role.ADMIN;
    }
}
