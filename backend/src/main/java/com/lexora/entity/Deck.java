package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "decks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String description;

    private String coverColor;

    private String emoji;

    @Column(nullable = false)
    private String sourceLanguage;

    @Column(nullable = false)
    private String targetLanguage;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Visibility visibility = Visibility.PRIVATE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @OneToMany(mappedBy = "deck", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Card> cards = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    private Integer viewCount;
    private Integer studyCount;

    @ManyToMany
    @JoinTable(
        name = "deck_tags",
        joinColumns = @JoinColumn(name = "deck_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private List<Tag> tags = new ArrayList<>();

    /**
     * When true and visibility is {@link Visibility#PUBLIC}, deck appears on the Materials catalog.
     */
    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean listedInMaterialsCatalog = false;

    /** Null or 0 = free; price in whole cents (e.g. 900 = 9.00 USD display-side). */
    private Integer catalogPriceCents;

    @Column(length = 32)
    private String cefrLevel;

    public enum Visibility {
        PUBLIC, PRIVATE, UNLISTED
    }
}
