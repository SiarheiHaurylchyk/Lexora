package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cards")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String term;

    @Column(nullable = false)
    private String definition;

    /** Full Pollinations URLs can exceed 255 chars — must not use default VARCHAR(255). */
    @Column(length = 16_384)
    private String termImageUrl;

    @Column(length = 16_384)
    private String definitionImageUrl;
    private String termAudioUrl;
    private String definitionAudioUrl;
    private String example;
    private String transcription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id", nullable = false)
    private Deck deck;

    @Builder.Default
    private Integer sortOrder = 0;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
