package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "teacher_certificates", indexes = {
        @Index(name = "idx_cert_teacher", columnList = "teacher_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherCertificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(length = 300)
    private String issuer;

    @Column(length = 32)
    private String year;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Optional URL to a PDF or image hosted elsewhere (TOEFL scan, badge link, etc.). */
    @Column(length = 2048)
    private String documentUrl;

    @Column(nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
