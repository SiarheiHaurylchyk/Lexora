package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "teacher_reviews",
        uniqueConstraints = @UniqueConstraint(name = "uk_review_teacher_student", columnNames = {"teacher_id", "student_id"}),
        indexes = {
                @Index(name = "idx_review_teacher", columnList = "teacher_id"),
                @Index(name = "idx_review_student", columnList = "student_id")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    /** 1–5 stars */
    @Column(nullable = false)
    private int rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
