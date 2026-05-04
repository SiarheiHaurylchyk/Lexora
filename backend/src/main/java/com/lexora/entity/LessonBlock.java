package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;

/**
 * One piece of lesson content. The "type" tells the UI how to draw it:
 *  - TEXT     -> a paragraph of free text
 *  - ARTICLE  -> excerpt from an article (content + optional source URL in "extra")
 *  - YOUTUBE  -> YouTube video (content = URL, played as iframe in the app)
 *  - LINK     -> any external link (content = URL, title = link label)
 *  - IMAGE    -> an image URL (content = image URL, extra = caption)
 *  - NOTE     -> short highlighted note for the student
 *  - MULTIPLE_CHOICE, TRUE_FALSE, MATCH_PAIRS, FILL_BLANK, WORD_ORDER, OPEN_PROMPT
 *    -> structured JSON in {@code content} (see frontend lessonBlockPayload)
 */
@Entity
@Table(name = "lesson_blocks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    /** Section this block belongs to (required for all blocks after schema migration). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_section_id")
    private LessonSection section;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlockType type;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String extra;

    @Builder.Default
    private Integer sortOrder = 0;

    public enum BlockType {
        TEXT,
        ARTICLE,
        YOUTUBE,
        LINK,
        IMAGE,
        NOTE,
        MULTIPLE_CHOICE,
        TRUE_FALSE,
        MATCH_PAIRS,
        FILL_BLANK,
        WORD_ORDER,
        OPEN_PROMPT
    }
}
