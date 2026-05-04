package com.lexora.repository;

import com.lexora.entity.LessonSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LessonSectionRepository extends JpaRepository<LessonSection, Long> {

    List<LessonSection> findByLesson_IdOrderBySortOrderAsc(Long lessonId);
}
