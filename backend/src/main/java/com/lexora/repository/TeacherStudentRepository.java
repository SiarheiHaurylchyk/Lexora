package com.lexora.repository;

import com.lexora.entity.TeacherStudent;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/** Storage for teacher-student links. */
@Repository
public interface TeacherStudentRepository extends JpaRepository<TeacherStudent, Long> {

    /** All students that this teacher added. */
    List<TeacherStudent> findByTeacherOrderByCreatedAtDesc(User teacher);

    /** All teachers that added this student. */
    List<TeacherStudent> findByStudentOrderByCreatedAtDesc(User student);

    /** Single link, if it exists. */
    Optional<TeacherStudent> findByTeacherAndStudent(User teacher, User student);

    boolean existsByTeacherAndStudent(User teacher, User student);

    long countByTeacher(User teacher);

    @Query(value = "SELECT id FROM teacher_students WHERE id = :linkId AND (teacher_id = :userId OR student_id = :userId)",
            nativeQuery = true)
    Optional<Long> findIdIfParticipant(@Param("linkId") long linkId, @Param("userId") long userId);
}
