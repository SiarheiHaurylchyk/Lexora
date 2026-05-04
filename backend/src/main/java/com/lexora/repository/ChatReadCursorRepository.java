package com.lexora.repository;

import com.lexora.entity.ChatReadCursor;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChatReadCursorRepository extends JpaRepository<ChatReadCursor, Long> {

    Optional<ChatReadCursor> findByUserAndPeer(User user, User peer);
}
