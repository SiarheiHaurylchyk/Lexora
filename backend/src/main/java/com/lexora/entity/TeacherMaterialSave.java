package com.lexora.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

/** Teacher bookmarked a catalog deck into their personal Materials library. */
@Entity
@Table(
    name = "teacher_material_saves",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "deck_id"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherMaterialSave {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deck_id", nullable = false)
    private Deck deck;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
