package com.lexora.repository;

import com.lexora.entity.StudySession;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {
    List<StudySession> findByUserOrderByStartedAtDesc(User user);

    @Query("SELECT COUNT(DISTINCT DATE(s.startedAt)) FROM StudySession s WHERE s.user = :user AND s.startedAt >= :since")
    long countStudyDays(@Param("user") User user, @Param("since") LocalDateTime since);

    @Query("SELECT SUM(s.correctAnswers) FROM StudySession s WHERE s.user = :user")
    Long totalCorrectAnswers(@Param("user") User user);

    long countByUser(User user);

    /** Sessions newer than the given moment, oldest first — used for streak/heatmap. */
    List<StudySession> findByUserAndStartedAtAfterOrderByStartedAtAsc(User user, LocalDateTime since);
}
