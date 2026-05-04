package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * One chat line between a fixed teacher–student pair.
 * The teacher and student ids always match a row in {@link TeacherStudent}.
 */
@Entity
@Table(name = "direct_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DirectMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    /** Plain text (may be empty if the message is attachment-only). */
    @Column(columnDefinition = "TEXT", nullable = false)
    @Builder.Default
    private String body = "";

    /** Public URL path returned by POST /api/chat/upload, e.g. /api/chat/files/uuid.png */
    @Column(length = 2000)
    private String attachmentUrl;

    @Column(length = 120)
    private String attachmentMime;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
