package com.lexora.repository;

import com.lexora.entity.TeacherReview;
import com.lexora.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherReviewRepository extends JpaRepository<TeacherReview, Long> {

    Optional<TeacherReview> findByTeacherAndStudent(User teacher, User student);

    long countByTeacher(User teacher);

    @Query("SELECT AVG(r.rating) FROM TeacherReview r WHERE r.teacher.id = :teacherId")
    Double averageRatingForTeacher(@Param("teacherId") Long teacherId);

    List<TeacherReview> findByTeacherOrderByCreatedAtDesc(User teacher, Pageable pageable);
}
