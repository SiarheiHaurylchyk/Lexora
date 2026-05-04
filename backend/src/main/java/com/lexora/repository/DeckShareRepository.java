package com.lexora.repository;

import com.lexora.entity.Deck;
import com.lexora.entity.DeckShare;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/** Storage for "this deck is shared with this user" rows. */
@Repository
public interface DeckShareRepository extends JpaRepository<DeckShare, Long> {

    List<DeckShare> findByUserOrderByCreatedAtDesc(User user);

    List<DeckShare> findByDeck(Deck deck);

    Optional<DeckShare> findByDeckAndUser(Deck deck, User user);

    boolean existsByDeckAndUser(Deck deck, User user);

    void deleteByDeckAndUser(Deck deck, User user);
}
