package com.lexora.repository;

import com.lexora.entity.Lesson;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Storage for lessons that a teacher prepares for students. */
@Repository
public interface LessonRepository extends JpaRepository<Lesson, Long> {

    /** Lessons created by this teacher. */
    List<Lesson> findByTeacherOrderByUpdatedAtDesc(User teacher);

    /** Lessons that target this exact student. */
    List<Lesson> findByStudentOrderByUpdatedAtDesc(User student);

    long countByTeacher(User teacher);
}
