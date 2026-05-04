package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * In-app notification for a single user (booking reminders, new assignments, etc.).
 */
@Entity
@Table(name = "app_notifications", indexes = {
        @Index(name = "idx_app_notif_user_read", columnList = "recipient_id,read_flag")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    /** BOOKING | ASSIGNMENT | SYSTEM — for inbox filters (nullable on legacy rows). */
    @Column(length = 32)
    private String category;

    /** Stable code for client-side i18n, e.g. booking_new_teacher. */
    @Column(length = 80)
    private String kind;

    /** JSON payload for {@link #kind} interpolation (peer names, ISO times, etc.). */
    @Column(columnDefinition = "TEXT")
    private String contextJson;

    /** Optional in-app route hint, e.g. "/bookings". */
    @Column(length = 400)
    private String href;

    @Column(name = "read_flag", nullable = false)
    @Builder.Default
    private Boolean read = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
