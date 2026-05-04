package com.lexora.repository;

import com.lexora.entity.Deck;
import com.lexora.entity.TeacherMaterialSave;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherMaterialSaveRepository extends JpaRepository<TeacherMaterialSave, Long> {

    List<TeacherMaterialSave> findByUserOrderByCreatedAtDesc(User user);

    Optional<TeacherMaterialSave> findByUserAndDeck(User user, Deck deck);

    boolean existsByUserAndDeck(User user, Deck deck);

    void deleteByUserAndDeck(User user, Deck deck);
}
