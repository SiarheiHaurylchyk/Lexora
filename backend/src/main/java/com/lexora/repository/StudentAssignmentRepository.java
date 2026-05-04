package com.lexora.repository;

import com.lexora.entity.StudentAssignment;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentAssignmentRepository extends JpaRepository<StudentAssignment, Long> {

    List<StudentAssignment> findByStudentOrderByCreatedAtDesc(User student);

    List<StudentAssignment> findByTeacherOrderByCreatedAtDesc(User teacher);

    List<StudentAssignment> findByTeacherStudentLinkIdOrderByCreatedAtDesc(Long teacherStudentLinkId);

    long countByTeacherAndCompletedByStudentIsFalse(User teacher);
}
