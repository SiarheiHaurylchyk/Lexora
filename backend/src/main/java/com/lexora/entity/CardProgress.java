package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;

@Entity
@Table(name = "card_progress")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CardProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private StudySession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id")
    private Card card;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Builder.Default
    private Integer attempts = 0;

    private Long timeSpentMs;

    // Spaced repetition fields
    private Integer easeFactor;  // multiplied by 100 to store as int
    private Integer interval;    // days
    private Integer repetitions;
    private java.time.LocalDate nextReview;

    public enum Status {
        NOT_STARTED, LEARNING, FAMILIAR, KNOWN, MASTERED
    }
}
