package com.lexora.repository;

import com.lexora.entity.TeacherSlot;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TeacherSlotRepository extends JpaRepository<TeacherSlot, Long> {

    List<TeacherSlot> findByTeacherAndStartTimeBetweenOrderByStartTimeAsc(
            User teacher, LocalDateTime from, LocalDateTime to);

    List<TeacherSlot> findByTeacherAndStatusAndStartTimeBetweenOrderByStartTimeAsc(
            User teacher, TeacherSlot.Status status, LocalDateTime from, LocalDateTime to);

    boolean existsByTeacherAndStartTimeLessThanAndEndTimeGreaterThan(
            User teacher, LocalDateTime end, LocalDateTime start);

    /** True if another slot of this teacher overlaps [start, end), excluding {@code excludeId}. */
    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM TeacherSlot s "
            + "WHERE s.teacher = :teacher AND s.id <> :excludeId "
            + "AND s.startTime < :end AND s.endTime > :start")
    boolean existsOverlapForTeacherExcluding(
            @Param("teacher") User teacher,
            @Param("excludeId") Long excludeId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    /** Slots of this teacher overlapping [start, end), excluding one id. */
    @Query("SELECT s FROM TeacherSlot s WHERE s.teacher = :teacher AND s.id <> :excludeId "
            + "AND s.startTime < :end AND s.endTime > :start ORDER BY s.startTime ASC")
    List<TeacherSlot> findOverlappingExcluding(
            @Param("teacher") User teacher,
            @Param("excludeId") Long excludeId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    List<TeacherSlot> findByBookedByAndStatusAndEndTimeAfterOrderByStartTimeAsc(
            User bookedBy, TeacherSlot.Status status, LocalDateTime now);

    List<TeacherSlot> findByTeacherAndStatusAndEndTimeAfterOrderByStartTimeAsc(
            User teacher, TeacherSlot.Status status, LocalDateTime now);

    List<TeacherSlot> findByStatusAndReminderEmailSentIsFalseAndStartTimeAfter(
            TeacherSlot.Status status, LocalDateTime now);

    /** Past slots still marked booked — proxy for “conducted” sessions on the platform. */
    long countByTeacherAndStatusAndEndTimeBefore(User teacher, TeacherSlot.Status status, LocalDateTime now);

    long countByTeacherAndStatusAndStartTimeAfter(User teacher, TeacherSlot.Status status, LocalDateTime now);
}
