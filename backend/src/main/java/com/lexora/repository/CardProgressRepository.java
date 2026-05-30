package com.lexora.repository;

import com.lexora.entity.CardProgress;
import com.lexora.entity.Deck;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CardProgressRepository extends JpaRepository<CardProgress, Long> {
    Optional<CardProgress> findByUserAndCardId(User user, Long cardId);
    List<CardProgress> findByUserAndCardDeck(User user, Deck deck);

    @Query("SELECT cp FROM CardProgress cp WHERE cp.user = :user AND cp.nextReview <= :today")
    List<CardProgress> findDueCards(@Param("user") User user, @Param("today") LocalDate today);

    @Query("SELECT cp FROM CardProgress cp JOIN FETCH cp.card c JOIN FETCH c.deck d "
            + "WHERE cp.user = :user AND cp.nextReview <= :today ORDER BY cp.nextReview ASC")
    List<CardProgress> findDueWithCards(@Param("user") User user, @Param("today") LocalDate today);

    @Query("SELECT COUNT(cp) FROM CardProgress cp WHERE cp.user = :user AND cp.status = 'MASTERED'")
    long countMasteredByUser(@Param("user") User user);
}
