package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * One time slot in the teacher availability calendar.
 *
 * - OPEN  : students can see it on the teacher profile and book it.
 * - BOOKED: a student already booked this time. {@link #bookedBy} is filled.
 * - BLOCKED: the teacher hides this slot from students (sick day, off-time, personal events).
 *   Optional {@link #title} / {@link #description} are shown only on the teacher calendar.
 */
@Entity
@Table(name = "teacher_slots", indexes = {
        @Index(name = "idx_slot_teacher_start", columnList = "teacher_id,startTime")
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TeacherSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booked_by_id")
    private User bookedBy;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.OPEN;

    /** One-time email reminder (one hour before start) sent to teacher and student. */
    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean reminderEmailSent = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * Zoom / Meet / Discord link for this lesson. Only meaningful while BOOKED;
     * teacher sets it; the booked student sees it on “My bookings”.
     */
    @Column(length = 2048)
    private String meetingUrl;

    /** Teacher-only label for BLOCKED personal time (e.g. “Webinar”). Not shown to learners. */
    @Column(length = 40)
    private String title;

    /** Longer notes for personal / blocked slots; teacher-only. */
    @Column(length = 500)
    private String description;

    public enum Status { OPEN, BOOKED, BLOCKED }
}
