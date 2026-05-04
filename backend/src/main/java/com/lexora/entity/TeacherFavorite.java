package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

/** Learner bookmarked a teacher from the directory. */
@Entity
@Table(
        name = "teacher_favorites",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "teacher_id"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
