package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * One row says: "this user can see this deck" (read only).
 * Used by a teacher to share a private deck with a student.
 */
@Entity
@Table(
    name = "deck_shares",
    uniqueConstraints = @UniqueConstraint(columnNames = {"deck_id", "user_id"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeckShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deck_id", nullable = false)
    private Deck deck;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Teacher who created this share; may revoke if not the deck owner (e.g. community catalog deck). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_by_id")
    private User sharedBy;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
