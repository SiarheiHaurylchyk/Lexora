package com.lexora.repository;

import com.lexora.entity.DirectMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {

    List<DirectMessage> findByTeacher_IdAndStudent_IdOrderByCreatedAtAsc(Long teacherId, Long studentId);

    Optional<DirectMessage> findTopByTeacher_IdAndStudent_IdOrderByCreatedAtDesc(Long teacherId, Long studentId);

    @Query("SELECT COUNT(m) FROM DirectMessage m WHERE m.teacher.id = :tid AND m.student.id = :sid "
            + "AND m.sender.id <> :me AND m.createdAt > :since")
    long countIncomingAfter(
            @Param("tid") Long teacherId,
            @Param("sid") Long studentId,
            @Param("me") Long readerUserId,
            @Param("since") LocalDateTime since);
}
