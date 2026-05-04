package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * Tracks when the user last opened a DM thread with {@code peer}.
 * Used for unread badges — messages from the peer after this time count as unread.
 */
@Entity
@Table(
    name = "chat_read_cursors",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "peer_user_id"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatReadCursor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "peer_user_id", nullable = false)
    private User peer;

    @Builder.Default
    private LocalDateTime lastReadAt = LocalDateTime.now();
}
