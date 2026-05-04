package com.lexora.repository;

import com.lexora.entity.TeacherFavorite;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TeacherFavoriteRepository extends JpaRepository<TeacherFavorite, Long> {

    boolean existsByStudentAndTeacher(User student, User teacher);

    Optional<TeacherFavorite> findByStudentAndTeacher(User student, User teacher);

    void deleteByStudentAndTeacher(User student, User teacher);
}
