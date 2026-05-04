package com.lexora.repository;

import com.lexora.entity.TeacherCertificate;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeacherCertificateRepository extends JpaRepository<TeacherCertificate, Long> {

    List<TeacherCertificate> findByTeacherOrderBySortOrderAsc(User teacher);

    void deleteByTeacher(User teacher);
}
