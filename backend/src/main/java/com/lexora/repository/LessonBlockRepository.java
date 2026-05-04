package com.lexora.repository;

import com.lexora.entity.LessonBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Storage for individual lesson blocks. */
@Repository
public interface LessonBlockRepository extends JpaRepository<LessonBlock, Long> {

    List<LessonBlock> findByLesson_IdOrderBySortOrderAsc(Long lessonId);

    List<LessonBlock> findBySection_IdOrderBySortOrderAsc(Long sectionId);
}
