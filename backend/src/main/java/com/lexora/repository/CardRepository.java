package com.lexora.repository;

import com.lexora.entity.Card;
import com.lexora.entity.Deck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {
    List<Card> findByDeckOrderBySortOrder(Deck deck);
    long countByDeck(Deck deck);
    void deleteByDeck(Deck deck);
}
